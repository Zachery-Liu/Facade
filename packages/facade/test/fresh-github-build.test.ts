import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildFreshGitHubRelease, buildFreshRelease } from '../src/build/fresh-github-build.js';
import { loadFacadeConfig } from '../src/config/load-facade-config.js';
import type { GitHubReleaseSourceOptions } from '../src/source/github/github-release-source.js';
import type { RepositorySnapshot } from '../src/source/repository-snapshot.js';

const snapshot = (tagName: string): RepositorySnapshot => ({
  repository: { fullName: 'owner/repository', htmlUrl: 'https://github.com/owner/repository' },
  release: { id: tagName, tagName, name: tagName, draft: false, prerelease: false },
  assets: [],
});

describe('Facade YAML configuration', () => {
  it('loads and validates the documented YAML shape', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'facade-config-'));
    const path = join(directory, 'facade.yml');
    await writeFile(path, 'schema: 1\nrepository: owner/repository\nrelease:\n  strategy: github-latest\n');
    await expect(loadFacadeConfig(path)).resolves.toMatchObject({ config: { repository: 'owner/repository' } });
  });

  it('classifies unreadable and invalid files without putting paths in messages', async () => {
    const missing = join(await mkdtemp(join(tmpdir(), 'facade-config-')), 'secret-path.yml');
    await expect(loadFacadeConfig(missing)).rejects.toMatchObject({ code: 'CONFIG_READ_FAILED', message: expect.not.stringContaining(missing) });
    await writeFile(missing, 'repository: [invalid');
    await expect(loadFacadeConfig(missing)).rejects.toMatchObject({ code: 'CONFIG_INVALID', message: expect.not.stringContaining(missing) });
  });
});

describe('fresh release builds', () => {
  it('loads config, resolves source overrides, and publishes through the shared build boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-live-build-'));
    const configPath = join(root, 'facade.yml');
    const outDir = join(root, 'site');
    await writeFile(configPath, 'schema: 1\nrepository: config/repository\nrelease:\n  strategy: github-latest\n');
    const sourceOptions: GitHubReleaseSourceOptions[] = [];
    const result = await buildFreshGitHubRelease({
      configPath,
      outDir,
      basePath: '',
      environment: { GITHUB_API_URL: 'https://github.example/api/v3' },
      overrides: { repository: 'input/repository', strategy: 'tag', tag: 'v2', token: 'secret-token' },
      sourceFactory: (options) => {
        sourceOptions.push(options);
        return { getSnapshot: async () => snapshot('v2') };
      },
    });
    expect(result).toMatchObject({ attempts: 1, releaseTag: 'v2', basePath: '/' });
    expect(sourceOptions).toEqual([
      { repository: 'input/repository', token: 'secret-token', apiUrl: 'https://github.example/api/v3' },
      { repository: 'input/repository', token: 'secret-token', apiUrl: 'https://github.example/api/v3' },
    ]);
  });

  it('loads minimal YAML before resolving an ambient repository', async () => {
    const root = await mkdtemp(join(tmpdir(), 'facade-live-build-'));
    const configPath = join(root, 'facade.yml');
    const outDir = join(root, 'site');
    await writeFile(configPath, 'schema: 1\n');
    const sourceOptions: GitHubReleaseSourceOptions[] = [];
    const result = await buildFreshGitHubRelease({
      configPath,
      outDir,
      environment: { GITHUB_REPOSITORY: 'ambient/repository' },
      sourceFactory: (options) => {
        sourceOptions.push(options);
        return { getSnapshot: async () => snapshot('v1') };
      },
    });
    expect(result).toMatchObject({ attempts: 1, releaseTag: 'v1' });
    expect(sourceOptions).toEqual([
      { repository: 'ambient/repository' },
      { repository: 'ambient/repository' },
    ]);
  });

  it('publishes once when verification sees the same inputs', async () => {
    const publish = vi.fn(async () => ({ basePath: '/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] as const }));
    await expect(buildFreshRelease({ capture: async () => ({ fingerprint: 'same', snapshot: snapshot('v1') }), publish }))
      .resolves.toMatchObject({ attempts: 1, releaseTag: 'v1' });
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('rebuilds once when inputs change and then stabilize', async () => {
    const states = ['old', 'new', 'new', 'new'];
    const publish = vi.fn(async () => ({ basePath: '/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] as const }));
    const onInputChanged = vi.fn();
    const result = await buildFreshRelease({
      capture: async () => {
        const fingerprint = states.shift() ?? 'unexpected';
        return { fingerprint, snapshot: snapshot(fingerprint) };
      },
      publish,
      onInputChanged,
    });
    expect(result).toMatchObject({ attempts: 2, releaseTag: 'new' });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(onInputChanged).toHaveBeenCalledOnce();
  });

  it('fails after inputs change during both allowed attempts', async () => {
    const states = ['one', 'two', 'three', 'four'];
    const publish = vi.fn(async () => ({ basePath: '/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] as const }));
    await expect(buildFreshRelease({
      capture: async () => {
        const fingerprint = states.shift() ?? 'unexpected';
        return { fingerprint, snapshot: snapshot(fingerprint) };
      },
      publish,
    })).rejects.toMatchObject({ code: 'BUILD_INPUT_CHANGED_REPEATEDLY' });
    expect(publish).toHaveBeenCalledTimes(2);
  });
});
