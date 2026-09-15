import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildOfflineRelease, buildRelease } from '../src/build/offline-build.js';
import { compileReleaseSnapshot } from '../src/compiler/release-compiler.js';

const fixturePath = fileURLToPath(new URL('../../../fixtures/repositories/basic-release.source.json', import.meta.url));

describe('offline build', () => {
  it('creates four consistent static outputs from a fixture', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-test-')), 'site');
    await expect(buildOfflineRelease({ fixturePath, outDir, basePath: '/project/' })).resolves.toEqual({ basePath: '/project/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] });
    const manifest = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8')) as { releaseTag: string; assets: Array<{ id: string; downloadUrl: string; os: string; kind: string }> };
    const html = await readFile(join(outDir, 'index.html'), 'utf8');
    const install = await readFile(join(outDir, 'install.md'), 'utf8');
    const llms = await readFile(join(outDir, 'llms.txt'), 'utf8');
    expect(manifest.releaseTag).toBe('v2.100.0');
    expect(manifest.assets.map((asset) => [asset.id, asset.os, asset.kind])).toEqual([['macos-arm64', 'macos', 'archive'], ['windows-x64', 'windows', 'installer'], ['linux-x64', 'linux', 'archive'], ['checksums', 'unknown', 'checksum']]);
    for (const asset of manifest.assets) {
      expect(html).toContain('data-asset-id="' + asset.id + '"');
      expect(html).toContain(asset.downloadUrl);
      expect(install).toContain(asset.downloadUrl);
      expect(llms).toContain(asset.downloadUrl);
    }
    expect(llms).toContain('Base path: /project/');
    expect(html).toContain('href="/project/manifest.json"');
  });

  it('normalizes the root base path explicitly', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-root-')), 'site');
    await expect(buildOfflineRelease({ fixturePath, outDir, basePath: '/' })).resolves.toMatchObject({ basePath: '/' });
    await expect(readFile(join(outDir, 'llms.txt'), 'utf8')).resolves.toContain('Base path: /');
    await expect(readFile(join(outDir, 'index.html'), 'utf8')).resolves.toContain('href="/manifest.json"');
  });

  it('preserves existing output when fixture validation fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-build-failure-'));
    const outDir = join(root, 'site');
    await buildOfflineRelease({ fixturePath, outDir });
    await writeFile(join(root, 'broken.json'), '{}', 'utf8');
    await expect(buildOfflineRelease({ fixturePath: join(root, 'broken.json'), outDir })).rejects.toMatchObject({ code: 'BUILD_INVALID_FIXTURE' });
    await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain('v2.100.0');
  });

  it('fails closed without deleting an unknown backup collision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-build-backup-'));
    const outDir = join(root, 'site');
    const backup = outDir + '.facade-backup';
    await mkdir(backup);
    await writeFile(join(backup, 'user-data.txt'), 'preserve me', 'utf8');
    await expect(buildOfflineRelease({ fixturePath, outDir })).rejects.toMatchObject({ code: 'BUILD_BACKUP_COLLISION' });
    await expect(readFile(join(backup, 'user-data.txt'), 'utf8')).resolves.toBe('preserve me');
  });

  it('fails closed without deleting an active or interrupted output lock', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-build-lock-'));
    const outDir = join(root, 'site');
    const lock = outDir + '.facade-lock';
    await mkdir(lock);
    await writeFile(join(lock, 'owner.txt'), 'preserve me', 'utf8');
    await expect(buildOfflineRelease({ fixturePath, outDir })).rejects.toMatchObject({ code: 'BUILD_OUTPUT_LOCKED' });
    await expect(readFile(join(lock, 'owner.txt'), 'utf8')).resolves.toBe('preserve me');
  });

  it('refuses to replace a non-Facade output directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-build-unowned-'));
    const outDir = join(root, 'site');
    await mkdir(outDir);
    await writeFile(join(outDir, 'user-data.txt'), 'preserve me', 'utf8');
    await expect(buildOfflineRelease({ fixturePath, outDir })).rejects.toMatchObject({ code: 'BUILD_UNOWNED_OUTPUT' });
    await expect(readFile(join(outDir, 'user-data.txt'), 'utf8')).resolves.toBe('preserve me');
  });

  it('rejects semantic manifest violations at the shared build boundary', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-semantic-')), 'site');
    const snapshot = { repository: { fullName: 'owner/repo', htmlUrl: 'https://github.com/owner/repo' }, release: { id: '1', tagName: 'v1', name: 'Release', draft: false, prerelease: false }, assets: [
      { id: 'one', name: 'one.bin', downloadUrl: 'https://example.test/shared', size: 1 },
      { id: 'two', name: 'two.bin', downloadUrl: 'https://example.test/shared', size: 1 },
    ] };
    await expect(buildRelease(snapshot, { outDir })).rejects.toMatchObject({ code: 'BUILD_INVALID_MANIFEST' });
  });

  it('rejects a relative base path', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-base-path-')), 'site');
    await expect(buildOfflineRelease({ fixturePath, outDir, basePath: 'project' })).rejects.toMatchObject({ code: 'BUILD_INVALID_BASE_PATH' });
  });

  it.each(['/../foo', '/./project', '/foo/../bar'])('rejects unsafe base path %s', async (basePath) => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-base-path-')), 'site');
    await expect(buildOfflineRelease({ fixturePath, outDir, basePath })).rejects.toMatchObject({ code: 'BUILD_INVALID_BASE_PATH' });
  });

  it('rejects a fake output marker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-build-marker-'));
    const outDir = join(root, 'site');
    await mkdir(outDir);
    await writeFile(join(outDir, '.facade-output'), 'not-facade', 'utf8');
    await expect(buildOfflineRelease({ fixturePath, outDir })).rejects.toMatchObject({ code: 'BUILD_UNOWNED_OUTPUT' });
  });

  it('replaces a prior Facade output and removes its backup', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-replace-')), 'site');
    await buildOfflineRelease({ fixturePath, outDir });
    await buildOfflineRelease({ fixturePath, outDir });
    await expect(access(outDir + '.facade-backup')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(outDir, '.facade-output'), 'utf8')).resolves.toBe('facade-output-v1\n');
  });

  it('classifies the initial macOS, Windows, Linux, and checksum token set', () => {
    const manifest = compileReleaseSnapshot({ repository: { fullName: 'owner/repo', htmlUrl: 'https://github.com/owner/repo' }, release: { id: '1', tagName: 'v1', name: 'Release', draft: false, prerelease: false }, assets: [
      { id: 'mac', name: 'tool-macos-arm64.dmg', downloadUrl: 'https://example.test/mac', size: 1 },
      { id: 'win', name: 'tool-windows-x64.exe', downloadUrl: 'https://example.test/win', size: 1 },
      { id: 'linux', name: 'tool-linux-amd64.tar.gz', downloadUrl: 'https://example.test/linux', size: 1 },
      { id: 'checksums', name: 'checksums.txt', downloadUrl: 'https://example.test/checksums', size: 1 },
    ] });
    expect(manifest.assets.map((asset) => [asset.os, asset.kind])).toEqual([['macos', 'installer'], ['windows', 'installer'], ['linux', 'archive'], ['unknown', 'checksum']]);
  });

  it('keeps generated text outputs structurally intact for special asset metadata', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-text-')), 'site');
    await buildRelease({ repository: { fullName: 'owner/repo', htmlUrl: 'https://github.com/owner/repo' }, release: { id: '1', tagName: 'v1\nInjected heading', name: 'Release', draft: false, prerelease: false }, assets: [
      { id: 'asset\nInjected entry', name: 'tool [preview](unsafe).bin', downloadUrl: 'https://example.test/tool%3Epreview', size: 1 },
    ] }, { outDir });
    const install = await readFile(join(outDir, 'install.md'), 'utf8');
    const llms = await readFile(join(outDir, 'llms.txt'), 'utf8');
    expect(install).toContain('# Install v1 Injected heading');
    expect(install).toContain('tool \\[preview\\]\\(unsafe\\)\\.bin');
    expect(llms).toContain('# Release v1 Injected heading');
    expect(llms).toContain('- asset Injected entry: https://example.test/tool%3Epreview');
  });

  it('builds from the compiled CLI', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-cli-build-')), 'site');
    const cliPath = fileURLToPath(new URL('../dist/index.js', import.meta.url));
    const output = execFileSync(process.execPath, [cliPath, 'build', '--fixture', fixturePath, '--out-dir', outDir, '--base-path', '/project'], { encoding: 'utf8' });
    expect(JSON.parse(output)).toMatchObject({ basePath: '/project/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] });
    await expect(readFile(join(outDir, 'index.html'), 'utf8')).resolves.toContain('Release v2.100.0');
  });
});
