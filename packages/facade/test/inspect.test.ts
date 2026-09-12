import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildOfflineRelease } from '../src/build/offline-build.js';
import { inspectGitHubRelease, inspectOfflineRelease, renderInspectText } from '../src/inspect/inspect-release.js';

const fixturePath = fileURLToPath(new URL('../../../fixtures/repositories/basic-release.source.json', import.meta.url));

describe('inspect', () => {
  it.each(['tool-x64-musl.zip', 'tool-linux-windows-x64-musl.zip'])('builds unknown-OS libc evidence consistently with inspect for %s', async (name) => {
    const root = await mkdtemp(join(tmpdir(), 'facade-inspect-libc-'));
    const inputPath = join(root, 'source.json');
    const outDir = join(root, 'site');
    await writeFile(inputPath, JSON.stringify({
      repository: { fullName: 'owner/repo', htmlUrl: 'https://github.com/owner/repo' },
      release: { id: 'release', tagName: 'v1', name: 'Release', draft: false, prerelease: false },
      assets: [{ id: 'asset', name, downloadUrl: 'https://example.test/asset', size: 1 }],
    }));
    const resolution = await inspectOfflineRelease({ fixturePath: inputPath });
    await buildOfflineRelease({ fixturePath: inputPath, outDir });
    expect(JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8'))).toEqual(resolution.manifest);
    expect(resolution.manifest.assets[0]).toMatchObject({ os: 'unknown', requirements: { libc: { family: 'unknown' } }, recommendationEligible: false });
    expect(resolution.inspect.diagnostics).toContainEqual(expect.objectContaining({ code: 'CLASSIFICATION_LIBC_CONFLICT', assetId: 'asset' }));
  });

  it('uses the same resolved asset data as fixture build while retaining exclusions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-inspect-'));
    const configPath = join(root, 'facade.yml');
    const outDir = join(root, 'site');
    await writeFile(configPath, "schema: 1\ndownloads:\n  rules:\n    - match: '*checksums*'\n      exclude: true\n    - match: '*windows*'\n      set:\n        label: Windows configured\n        priority: 50\n", 'utf8');
    const resolution = await inspectOfflineRelease({ fixturePath, configPath });
    await buildOfflineRelease({ fixturePath, configPath, outDir });
    const manifest = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8'));
    expect(manifest).toEqual(resolution.manifest);
    expect(resolution.inspect.assets.find((asset) => asset.source.id === 'checksums')).toMatchObject({ excluded: true, exclusionReason: 'downloads.rules[0]' });
    const text = renderInspectText(resolution);
    expect(text).toContain('Override downloads.rules[1]: priority 0 -> 50');
    expect(text).toMatch(/Excluded: downloads\.rules\[0\][\s\S]*Recommendation eligible: no/);
  });

  it('emits deterministic JSON from the packaged inspect command', () => {
    const cliPath = fileURLToPath(new URL('../dist/index.js', import.meta.url));
    const first = execFileSync(process.execPath, [cliPath, 'inspect', '--fixture', fixturePath, '--json'], { encoding: 'utf8' });
    const second = execFileSync(process.execPath, [cliPath, 'inspect', '--fixture', fixturePath, '--json'], { encoding: 'utf8' });
    expect(second).toBe(first);
    const report = JSON.parse(first);
    expect(report.inspect).toMatchObject({ source: { provider: 'fixture', repository: 'cli/cli' }, release: { tag: 'v2.100.0', selection: 'fixture' } });
    expect(report.manifest.assets[0]).toEqual(report.inspect.assets[0].final);
  });

  it('applies the loaded downloads config to the selected GitHub snapshot', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-inspect-github-'));
    const configPath = join(root, 'facade.yml');
    await writeFile(configPath, "schema: 1\nrepository: config/repository\ndownloads:\n  rules:\n    - match: '*.zip'\n      set:\n        label: GitHub configured\n", 'utf8');
    const receivedRepositories: string[] = [];
    const resolution = await inspectGitHubRelease({
      configPath,
      environment: {},
      overrides: { repository: 'override/repository', strategy: 'tag', tag: 'v3' },
      sourceFactory: (options) => {
        receivedRepositories.push(options.repository);
        return { getSnapshot: async () => ({
          repository: { fullName: 'override/repository', htmlUrl: 'https://github.com/override/repository' },
          release: { id: 'release', tagName: 'v3', name: 'Release v3', draft: false, prerelease: false },
          assets: [{ id: 'asset', name: 'tool-linux-x64.zip', downloadUrl: 'https://example.test/asset', size: 5 }],
        }) };
      },
    });
    expect(receivedRepositories).toEqual(['override/repository']);
    expect(resolution.inspect).toMatchObject({ source: { provider: 'github' }, release: { selection: 'tag', tag: 'v3' } });
    expect(resolution.manifest.assets[0]).toMatchObject({ label: 'GitHub configured' });
  });
});
