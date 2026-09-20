import { access, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { FacadeError } from '../runtime/facade-error.js';
import { RepositorySnapshotSchema, type RepositorySnapshot } from '../source/repository-snapshot.js';
import { ReleasePage } from '../themes/product/components/release-page.js';
import { resolveRelease, type BuildDiagnostic } from '../compiler/release-resolver.js';
import { validateManifestSemantics } from '../manifest/semantic-validation.js';
import { loadFacadeConfig } from '../config/load-facade-config.js';
import type { FacadeConfigInput } from '../config/facade-config.js';
import { renderInstall, renderLlms } from '../agent-interface/render-agent-files.js';
import { renderThemeStyle } from '../themes/product/theme-style.js';
import { browserBundle } from '../themes/product/browser-bundle.js';

export interface OfflineBuildOptions { readonly fixturePath: string; readonly outDir: string; readonly basePath?: string; readonly configPath?: string; }
export interface BuildReleaseOptions { readonly outDir: string; readonly basePath?: string; readonly config?: FacadeConfigInput; readonly configPath?: string; readonly provider?: 'fixture' | 'github' | 'unknown'; readonly selection?: 'fixture' | 'github-latest' | 'tag'; }
export interface OfflineBuildResult { readonly basePath: string; readonly files: readonly string[]; readonly cleanupRequired?: true; readonly diagnostics?: readonly BuildDiagnostic[]; }
export interface PreparedRelease {
  readonly publish: () => Promise<OfflineBuildResult>;
  readonly dispose: () => Promise<void>;
}
const OUTPUT_MARKER = '.facade-output';
const OUTPUT_MARKER_CONTENT = 'facade-output-v1\n';

export async function buildOfflineRelease(options: OfflineBuildOptions): Promise<OfflineBuildResult> {
  const snapshot = await readSnapshot(options.fixturePath);
  const config = options.configPath === undefined ? undefined : (await loadFacadeConfig(options.configPath)).config;
  return buildRelease(snapshot, { outDir: options.outDir, ...(options.basePath === undefined ? {} : { basePath: options.basePath }), ...(config === undefined ? {} : { config }), ...(options.configPath === undefined ? {} : { configPath: options.configPath }), provider: 'fixture', selection: 'fixture' });
}

export async function buildRelease(snapshot: RepositorySnapshot, options: BuildReleaseOptions): Promise<OfflineBuildResult> {
  const prepared = await prepareRelease(snapshot, options);
  try {
    return await prepared.publish();
  } finally {
    await prepared.dispose();
  }
}

export async function prepareRelease(snapshot: RepositorySnapshot, options: BuildReleaseOptions): Promise<PreparedRelease> {
  snapshot = RepositorySnapshotSchema.parse(snapshot);
  const basePath = normalizeBasePath(options.basePath ?? '/');
  const resolution = resolveRelease(snapshot, options);
  const manifest = resolution.manifest;
  const brandAssets = await loadBrandAssets(options);
  const icon = brandAssets.find((asset) => asset.name === 'icon');
  const screenshot = brandAssets.find((asset) => asset.name === 'screenshot');
  if (brandAssets.length > 0) manifest.product = {
    name: manifest.product?.name ?? manifest.productName,
    ...(manifest.product?.description === undefined ? {} : { description: manifest.product.description }),
    ...(icon === undefined ? {} : { icon: basePath + 'branding/icon' + icon.extension }),
    ...(screenshot === undefined || options.config?.product?.screenshot === undefined ? {} : { screenshot: { src: basePath + 'branding/screenshot' + screenshot.extension, alt: options.config.product.screenshot.alt } }),
  };
  const diagnostics = validateManifestSemantics(manifest, { requireResolvedManifestEvidence: true });
  if (diagnostics.length > 0) throw new FacadeError('BUILD_INVALID_MANIFEST', `The compiled release manifest failed semantic validation: ${diagnostics.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`).join('; ')}`);
  const outDir = resolve(options.outDir);
  await mkdir(dirname(outDir), { recursive: true });
  const staging = await mkdtemp(join(dirname(outDir), '.facade-build-'));
  try {
    if (brandAssets.length) {
      await mkdir(join(staging, 'branding'));
      await Promise.all(brandAssets.map((asset) => writeFile(join(staging, 'branding', asset.name + asset.extension), asset.bytes)));
    }
    const safeJson = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
    const favicon = manifest.product?.icon ?? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#5265d8"/><path d="M19 44V20h26v7H27v4h15v7H27v6z" fill="white"/></svg>');
    const html = '<!doctype html><html lang="en" data-appearance="' + (manifest.theme?.appearance ?? 'auto') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><link rel="icon" href="' + escapeHtml(favicon) + '"><title>' + escapeHtml(manifest.productName) + ' · ' + escapeHtml(manifest.release.tag) + '</title><style>' + renderThemeStyle(manifest.theme?.accent ?? '#5265d8') + '</style></head><body>' + render(h(ReleasePage, { manifest, basePath })) + '<script id="facade-manifest" type="application/json">' + safeJson + '</script><script>' + browserBundle + '</script></body></html>';
    await Promise.all([
      writeFile(join(staging, 'index.html'), html, 'utf8'),
      writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8'),
      writeFile(join(staging, 'install.md'), renderInstall(manifest), 'utf8'),
      writeFile(join(staging, 'llms.txt'), renderLlms(manifest, basePath), 'utf8'),
      writeFile(join(staging, OUTPUT_MARKER), OUTPUT_MARKER_CONTENT, 'utf8'),
    ]);
    let published = false;
    return {
      publish: async () => {
        const cleanupRequired = await replaceDirectory(staging, outDir);
        published = true;
        return { basePath, files: ['index.html', 'manifest.json', 'install.md', 'llms.txt', ...brandAssets.map((asset) => 'branding/' + asset.name + asset.extension)], ...(cleanupRequired ? { cleanupRequired: true } : {}), ...(resolution.inspect.diagnostics.length === 0 ? {} : { diagnostics: resolution.inspect.diagnostics }) };
      },
      dispose: async () => {
        if (!published) await rm(staging, { recursive: true, force: true });
      },
    };
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

type BrandAsset = { name: 'icon' | 'screenshot'; extension: '.png' | '.jpg' | '.webp'; bytes: Buffer };
export async function fingerprintBrandAssets(config: FacadeConfigInput, configPath: string): Promise<string> {
  const assets = await loadBrandAssets({ outDir: '', config, configPath });
  const hash = createHash('sha256');
  for (const asset of assets) {
    hash.update(asset.name).update(asset.extension).update(asset.bytes);
  }
  return hash.digest('hex');
}

async function loadBrandAssets(options: BuildReleaseOptions): Promise<BrandAsset[]> {
  const icon = options.config?.product?.icon;
  const screenshot = options.config?.product?.screenshot?.src;
  if (icon === undefined && screenshot === undefined) return [];
  if (!options.configPath) throw new FacadeError('CONFIG_INVALID', 'Brand images require a config file path.');
  const configDir = dirname(resolve(options.configPath));
  const projectRoot = await findRepositoryRoot(configDir);
  const items: Array<{ name: BrandAsset['name']; path: string }> = [
    ...(icon === undefined ? [] : [{ name: 'icon' as const, path: icon }]),
    ...(screenshot === undefined ? [] : [{ name: 'screenshot' as const, path: screenshot }]),
  ];
  return Promise.all(items.map(async ({ name, path }) => {
    if (isAbsolute(path) || path.startsWith('\\') || /^[a-z][a-z\d+.-]*:/i.test(path) || /[?#]/.test(path)) throw new FacadeError('CONFIG_INVALID', `${name} must be a local repository image path.`);
    const extension = extname(path).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) throw new FacadeError('CONFIG_INVALID', `${name} must be PNG, JPEG, or WebP.`);
    let absolute: string;
    try { absolute = await realpath(resolve(configDir, path)); }
    catch (cause) { throw new FacadeError('CONFIG_INVALID', `${name} image cannot be read.`, { cause }); }
    const inside = relative(projectRoot, absolute);
    if (inside === '..' || inside.startsWith('..\\') || inside.startsWith('../') || isAbsolute(inside)) throw new FacadeError('CONFIG_INVALID', `${name} must remain inside the repository.`);
    const bytes = await readFile(absolute);
    if (bytes.length > (name === 'icon' ? 2 : 10) * 1024 * 1024) throw new FacadeError('CONFIG_INVALID', `${name} is too large.`);
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if ((extension === '.png' && !png) || (['.jpg', '.jpeg'].includes(extension) && !jpeg) || (extension === '.webp' && !webp)) throw new FacadeError('CONFIG_INVALID', `${name} content does not match its image format.`);
    return { name, extension: extension === '.jpeg' ? '.jpg' as const : extension as BrandAsset['extension'], bytes };
  }));
}

async function findRepositoryRoot(configDir: string): Promise<string> {
  let current = await realpath(configDir);
  for (;;) {
    if (await exists(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return await realpath(basename(configDir) === '.github' ? dirname(configDir) : configDir);
    current = parent;
  }
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character); }
