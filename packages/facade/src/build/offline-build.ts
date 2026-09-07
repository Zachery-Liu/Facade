import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { FacadeError } from '../runtime/facade-error.js';
import { RepositorySnapshotSchema, type RepositorySnapshot } from '../source/repository-snapshot.js';
import { ReleasePage } from '../themes/product/components/release-page.js';
import { compileReleaseSnapshot } from '../compiler/release-compiler.js';

export interface OfflineBuildOptions { readonly fixturePath: string; readonly outDir: string; readonly basePath?: string; }
export interface OfflineBuildResult { readonly basePath: string; readonly files: readonly ['index.html', 'manifest.json', 'install.md', 'llms.txt']; }

export async function buildOfflineRelease(options: OfflineBuildOptions): Promise<OfflineBuildResult> {
  const snapshot = await readSnapshot(options.fixturePath);
  const manifest = compileReleaseSnapshot(snapshot);
  const basePath = normalizeBasePath(options.basePath ?? '/');
  const outDir = resolve(options.outDir);
  await mkdir(dirname(outDir), { recursive: true });
  const staging = await mkdtemp(join(dirname(outDir), '.facade-build-'));
  try {
    await Promise.all([
      writeFile(join(staging, 'index.html'), '<!doctype html>' + render(h(ReleasePage, { manifest })), 'utf8'),
      writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8'),
      writeFile(join(staging, 'install.md'), renderInstall(manifest.releaseTag, manifest.assets), 'utf8'),
      writeFile(join(staging, 'llms.txt'), renderLlms(manifest.releaseTag, manifest.assets, basePath), 'utf8'),
    ]);
    await replaceDirectory(staging, outDir);
    return { basePath, files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] };
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
  if (!value.startsWith('/')) throw new FacadeError('BUILD_INVALID_BASE_PATH', 'basePath must start with /.');
  return value === '/' ? value : value.replace(/\/+$/, '') + '/';
}

async function replaceDirectory(staging: string, outDir: string): Promise<void> {
  const backup = outDir + '.facade-backup';
  await rm(backup, { recursive: true, force: true });
  let hadOutput = false;
  try {
    await rename(outDir, backup);
    hadOutput = true;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
  try {
    await rename(staging, outDir);
    if (hadOutput) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (hadOutput) await rename(backup, outDir);
    throw error;
  }
}

function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }
function renderInstall(tag: string, assets: readonly { id: string; label: string; downloadUrl: string }[]): string { return '# Install ' + tag + '\n\n' + assets.map((asset) => '- [' + asset.label + ' (' + asset.id + ')](' + asset.downloadUrl + ')').join('\n') + '\n'; }
function renderLlms(tag: string, assets: readonly { id: string; downloadUrl: string }[], basePath: string): string { return '# Release ' + tag + '\n\nBase path: ' + basePath + '\n\n' + assets.map((asset) => '- ' + asset.id + ': ' + asset.downloadUrl).join('\n') + '\n'; }
