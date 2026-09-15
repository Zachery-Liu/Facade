import { describe, expect, it, vi } from 'vitest';
import { runAction, type ActionCore } from '../src/action/run-action.js';
import type { FreshGitHubBuildOptions } from '../src/build/fresh-github-build.js';
import { FacadeError } from '../src/runtime/facade-error.js';

function fakeCore(inputs: Readonly<Record<string, string>>) {
  const outputs = new Map<string, string>();
  const failures: string[] = [];
  const warnings: Array<{ message: string; title: string | undefined }> = [];
  const secrets: string[] = [];
  const core: ActionCore = {
    getInput: (name) => inputs[name] ?? '',
    setFailed: (message) => { failures.push(message); },
    setOutput: (name, value) => { outputs.set(name, value); },
    setSecret: (secret) => { secrets.push(secret); },
    warning: (message, properties) => { warnings.push({ message, title: properties?.title }); },
  };
  return { core, failures, outputs, secrets, warnings };
}

describe('Facade Action adapter', () => {
  it('maps inputs to the shared build and writes declared outputs', async () => {
    const state = fakeCore({
      config: '.github/custom.yml',
      repository: 'owner/repository',
      tag: 'v2',
      'base-path': '/project',
      'out-dir': 'site',
      token: 'secret-token',
    });
    const build = vi.fn(async () => ({ basePath: '/project/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] as const, attempts: 1 as const, releaseTag: 'v2' }));
    await runAction(state.core, { build, environment: {} });
    expect(build).toHaveBeenCalledWith(expect.objectContaining({
      configPath: '.github/custom.yml',
      outDir: 'site',
      basePath: '/project',
      overrides: { repository: 'owner/repository', strategy: 'tag', tag: 'v2', token: 'secret-token' },
    }));
    expect(state.outputs).toEqual(new Map([['output-path', 'site'], ['release-tag', 'v2']]));
    expect(state.secrets).toEqual(['secret-token']);
    expect(state.failures).toEqual([]);
  });

  it('leaves omitted repository and token inputs to environment and config precedence', async () => {
    const state = fakeCore({ config: '.github/facade.yml', 'out-dir': 'dist' });
    const environment = { FACADE_REPOSITORY: 'environment/repository', GITHUB_TOKEN: 'environment-token' };
    let received: FreshGitHubBuildOptions | undefined;
    const build = vi.fn(async (options: FreshGitHubBuildOptions) => {
      received = options;
      return { basePath: '/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'] as const, attempts: 1 as const, releaseTag: 'v1' };
    });
    await runAction(state.core, { build, environment });
    expect(build).toHaveBeenCalledWith(expect.objectContaining({ environment }));
    expect(received).not.toHaveProperty('overrides');
    expect(state.secrets).toEqual([]);
  });

  it('emits a native warning when the shared build retries changed inputs', async () => {
    const state = fakeCore({ config: '.github/facade.yml', 'out-dir': 'dist' });
    await runAction(state.core, { build: async (options) => {
      options.onInputChanged?.();
      return { basePath: '/', files: ['index.html', 'manifest.json', 'install.md', 'llms.txt'], attempts: 2, releaseTag: 'v2', cleanupRequired: true as const };
    } });
    expect(state.warnings).toEqual([
      {
        message: 'Facade configuration or release assets changed during the build; rebuilding once with fresh inputs.',
        title: 'FACADE_INPUT_CHANGED',
      },
      {
        message: 'The site was built successfully, but Facade recovery directories require manual cleanup before the next build.',
        title: 'FACADE_OUTPUT_CLEANUP_REQUIRED',
      },
    ]);
  });

  it('surfaces stable Facade error codes without writing outputs', async () => {
    const state = fakeCore({ config: '.github/facade.yml', 'out-dir': 'dist' });
    await runAction(state.core, { build: async () => { throw new FacadeError('CONFIG_INVALID', 'The Facade configuration file is invalid.'); } });
    expect(state.failures).toEqual(['[CONFIG_INVALID] The Facade configuration file is invalid.']);
    expect(state.outputs.size).toBe(0);
  });

  it('hides unexpected failure details and does not write outputs', async () => {
    const state = fakeCore({ config: '.github/facade.yml', 'out-dir': 'dist' });
    await runAction(state.core, { build: async () => { throw Object.assign(new Error('stale'), { name: 'FacadeError', code: 'NOT_ACTUALLY_TYPED' }); } });
    expect(state.failures).toEqual(['[ACTION_UNEXPECTED_FAILURE] Facade Action failed unexpectedly.']);
    expect(state.outputs.size).toBe(0);
  });
});
