import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildOfflineRelease } from '../src/build/offline-build.js';
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
    expect(manifest.assets.map((asset) => [asset.id, asset.os, asset.kind])).toEqual([['macos-arm64', 'unknown', 'other'], ['windows-x64', 'unknown', 'other'], ['linux-x64', 'linux', 'artifact'], ['checksums', 'unknown', 'checksum']]);
    for (const asset of manifest.assets) {
      expect(html).toContain(asset.downloadUrl);
      expect(install).toContain(asset.downloadUrl);
      expect(llms).toContain(asset.downloadUrl);
    }
    expect(llms).toContain('Base path: /project/');
  });

  it('preserves existing output when fixture validation fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-build-failure-'));
    const outDir = join(root, 'site');
    await buildOfflineRelease({ fixturePath, outDir });
    await writeFile(join(root, 'broken.json'), '{}', 'utf8');
    await expect(buildOfflineRelease({ fixturePath: join(root, 'broken.json'), outDir })).rejects.toMatchObject({ code: 'BUILD_INVALID_FIXTURE' });
    await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain('v2.100.0');
  });

  it('rejects a relative base path', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-build-base-path-')), 'site');
    await expect(buildOfflineRelease({ fixturePath, outDir, basePath: 'project' })).rejects.toMatchObject({ code: 'BUILD_INVALID_BASE_PATH' });
  });

  it('classifies the initial macOS, Windows, Linux, and checksum token set', () => {
    const manifest = compileReleaseSnapshot({ repository: { fullName: 'owner/repo', htmlUrl: 'https://github.com/owner/repo' }, release: { id: '1', tagName: 'v1', name: 'Release', draft: false, prerelease: false }, assets: [
      { id: 'mac', name: 'tool-macos-arm64.dmg', downloadUrl: 'https://example.test/mac', size: 1 },
      { id: 'win', name: 'tool-windows-x64.exe', downloadUrl: 'https://example.test/win', size: 1 },
      { id: 'linux', name: 'tool-linux-amd64.tar.gz', downloadUrl: 'https://example.test/linux', size: 1 },
      { id: 'checksums', name: 'checksums.txt', downloadUrl: 'https://example.test/checksums', size: 1 },
    ] });
    expect(manifest.assets.map((asset) => [asset.os, asset.kind])).toEqual([['macos', 'artifact'], ['windows', 'artifact'], ['linux', 'artifact'], ['unknown', 'checksum']]);
  });

  it('builds from the compiled CLI', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-cli-build-')), 'site');
    const cliPath = fileURLToPath(new URL('../dist/index.js', import.meta.url));
    const output = execFileSync(process.execPath, [cliPath, 'build', '--fixture', fixturePath, '--out-dir', outDir, '--base-path', '/project'], { encoding: 'utf8' });
    expect(JSON.parse(output)).toMatchObject({ basePath: '/project/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] });
    await expect(readFile(join(outDir, 'index.html'), 'utf8')).resolves.toContain('Release v2.100.0');
  });
});
