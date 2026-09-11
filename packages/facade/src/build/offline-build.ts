import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { FacadeError } from '../runtime/facade-error.js';
import { RepositorySnapshotSchema, type RepositorySnapshot } from '../source/repository-snapshot.js';
import { ReleasePage } from '../themes/product/components/release-page.js';
import { resolveRelease, type BuildDiagnostic } from '../compiler/release-resolver.js';
import { validateManifestSemantics } from '../manifest/semantic-validation.js';
import { loadFacadeConfig } from '../config/load-facade-config.js';
import type { FacadeConfigInput } from '../config/facade-config.js';

export interface OfflineBuildOptions { readonly fixturePath: string; readonly outDir: string; readonly basePath?: string; readonly configPath?: string; }
export interface BuildReleaseOptions { readonly outDir: string; readonly basePath?: string; readonly config?: FacadeConfigInput; readonly provider?: 'fixture' | 'github' | 'unknown'; readonly selection?: 'fixture' | 'github-latest' | 'tag'; }
export interface OfflineBuildResult { readonly basePath: string; readonly files: readonly ['index.html', 'manifest.json', 'install.md', 'llms.txt']; readonly cleanupRequired?: true; readonly diagnostics?: readonly BuildDiagnostic[]; }
const OUTPUT_MARKER = '.facade-output';
const OUTPUT_MARKER_CONTENT = 'facade-output-v1\n';

export async function buildOfflineRelease(options: OfflineBuildOptions): Promise<OfflineBuildResult> {
  const snapshot = await readSnapshot(options.fixturePath);
  const config = options.configPath === undefined ? undefined : (await loadFacadeConfig(options.configPath)).config;
  return buildRelease(snapshot, { outDir: options.outDir, ...(options.basePath === undefined ? {} : { basePath: options.basePath }), ...(config === undefined ? {} : { config }), provider: 'fixture', selection: 'fixture' });
}

export async function buildRelease(snapshot: RepositorySnapshot, options: BuildReleaseOptions): Promise<OfflineBuildResult> {
  snapshot = RepositorySnapshotSchema.parse(snapshot);
  const resolution = resolveRelease(snapshot, options);
  const manifest = resolution.manifest;
  const diagnostics = validateManifestSemantics(manifest);
  if (diagnostics.length > 0) throw new FacadeError('BUILD_INVALID_MANIFEST', 'The compiled release manifest failed semantic validation.');
  const basePath = normalizeBasePath(options.basePath ?? '/');
  const outDir = resolve(options.outDir);
  await mkdir(dirname(outDir), { recursive: true });
  const staging = await mkdtemp(join(dirname(outDir), '.facade-build-'));
  try {
    await Promise.all([
      writeFile(join(staging, 'index.html'), '<!doctype html>' + render(h(ReleasePage, { manifest, basePath })), 'utf8'),
      writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8'),
      writeFile(join(staging, 'install.md'), renderInstall(manifest.releaseTag, manifest.assets), 'utf8'),
      writeFile(join(staging, 'llms.txt'), renderLlms(manifest.releaseTag, manifest.assets, basePath), 'utf8'),
      writeFile(join(staging, OUTPUT_MARKER), OUTPUT_MARKER_CONTENT, 'utf8'),
    ]);
    const cleanupRequired = await replaceDirectory(staging, outDir);
    return { basePath, files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'], ...(cleanupRequired ? { cleanupRequired: true } : {}), ...(resolution.inspect.diagnostics.length === 0 ? {} : { diagnostics: resolution.inspect.diagnostics }) };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function readSnapshot(path: string): Promise<RepositorySnapshot> {
  try { return RepositorySnapshotSchema.parse(JSON.parse(await readFile(path, 'utf8'))); }
  catch (cause) { throw new FacadeError('BUILD_INVALID_FIXTURE', 'The fixture is not a valid repository snapshot.', { cause }); }
}

function normalizeBasePath(value: string): string {
  if (!/^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]*$/.test(value) || value.split('/').some((segment) => segment === '.' || segment === '..')) throw new FacadeError('BUILD_INVALID_BASE_PATH', 'basePath must be an absolute site path without dot segments.');
  return value === '/' ? value : value.replace(/\/+$/, '') + '/';
}

async function replaceDirectory(staging: string, outDir: string): Promise<boolean> {
  const lock = outDir + '.facade-lock';
  try {
    await mkdir(lock);
  } catch (cause) {
    if (isAlreadyExists(cause)) throw new FacadeError('BUILD_OUTPUT_LOCKED', 'Another or interrupted build blocks output replacement.', { cause });
    throw cause;
  }

  let cleanupRequired: boolean;
  try {
    cleanupRequired = await replaceDirectoryWhileLocked(staging, outDir);
  } catch (error) {
    await removeLockAfterFailure(lock);
    throw error;
  }

  try {
    await rm(lock, { recursive: true });
  } catch {
    cleanupRequired = true;
  }
  return cleanupRequired;
}

async function replaceDirectoryWhileLocked(staging: string, outDir: string): Promise<boolean> {
  const backup = outDir + '.facade-backup';
  if (await exists(backup)) throw new FacadeError('BUILD_BACKUP_COLLISION', 'A previous or user-owned build backup blocks replacement.');
  if (await exists(outDir) && !(await isFacadeOutput(outDir))) throw new FacadeError('BUILD_UNOWNED_OUTPUT', 'Refusing to replace a directory not owned by Facade.');
  let hadOutput = false;
  try {
    await rename(outDir, backup);
    hadOutput = true;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  try {
    await rename(staging, outDir);
  } catch (error) {
    if (hadOutput) await rename(backup, outDir);
    throw error;
  }
  if (!hadOutput) return false;
  try { await rm(backup, { recursive: true, force: true }); return false; }
  catch { return true; }
}

function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }
function isAlreadyExists(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'; }
async function exists(path: string): Promise<boolean> { try { await access(path); return true; } catch { return false; } }
async function isFacadeOutput(path: string): Promise<boolean> { try { return (await readFile(join(path, OUTPUT_MARKER), 'utf8')) === OUTPUT_MARKER_CONTENT; } catch { return false; } }
async function removeLockAfterFailure(lock: string): Promise<void> { try { await rm(lock, { recursive: true }); } catch { /* Preserve the replacement error and leave the lock for manual recovery. */ } }
function renderInstall(tag: string, assets: readonly { id: string; label: string; downloadUrl: string }[]): string { return '# Install ' + escapeMarkdownText(tag) + '\n\n' + assets.map((asset) => '- [' + escapeMarkdownText(asset.label + ' (' + asset.id + ')') + '](<' + escapeMarkdownUrl(asset.downloadUrl) + '>)').join('\n') + '\n'; }
function renderLlms(tag: string, assets: readonly { id: string; downloadUrl: string }[], basePath: string): string { return '# Release ' + singleLine(tag) + '\n\nBase path: ' + basePath + '\n\n' + assets.map((asset) => '- ' + singleLine(asset.id) + ': ' + singleLine(asset.downloadUrl)).join('\n') + '\n'; }
function singleLine(value: string): string { return value.replace(/[\r\n]+/g, ' '); }
function escapeMarkdownText(value: string): string { return singleLine(value).replace(/([-\\`*_[\]{}()<>#+.!|])/g, '\\$1'); }
function escapeMarkdownUrl(value: string): string { return singleLine(value).replace(/</g, '%3C').replace(/>/g, '%3E'); }
