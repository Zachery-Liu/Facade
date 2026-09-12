import { buildFreshGitHubRelease, type FreshGitHubBuildOptions } from '../build/fresh-github-build.js';
import { FacadeError } from '../runtime/facade-error.js';

interface ActionInputOptions { readonly required?: boolean; }
interface AnnotationProperties { readonly title?: string; }

export interface ActionCore {
  getInput(name: string, options?: ActionInputOptions): string;
  setFailed(message: string): void;
  setOutput(name: string, value: string): void;
  setSecret(secret: string): void;
  warning(message: string, properties?: AnnotationProperties): void;
}

export interface ActionDependencies {
  readonly build?: (options: FreshGitHubBuildOptions) => ReturnType<typeof buildFreshGitHubRelease>;
  readonly environment?: Readonly<Record<string, string | undefined>>;
}

export async function runAction(core: ActionCore, dependencies: ActionDependencies = {}): Promise<void> {
  try {
    const configPath = core.getInput('config', { required: true });
    const repository = optionalInput(core, 'repository');
    const tag = optionalInput(core, 'tag');
    const basePath = core.getInput('base-path');
    const outDir = core.getInput('out-dir', { required: true });
    const token = optionalInput(core, 'token');
    if (token !== undefined) core.setSecret(token);

    const build = dependencies.build ?? buildFreshGitHubRelease;
    const result = await build({
      configPath,
      outDir,
      environment: dependencies.environment ?? process.env,
      ...(basePath === '' ? {} : { basePath }),
      ...(repository === undefined && tag === undefined && token === undefined ? {} : {
        overrides: {
          ...(repository === undefined ? {} : { repository }),
          ...(tag === undefined ? {} : { strategy: 'tag' as const, tag }),
          ...(token === undefined ? {} : { token }),
        },
      }),
      onInputChanged: () => core.warning(
        'Facade configuration or release assets changed during the build; rebuilding once with fresh inputs.',
        { title: 'FACADE_INPUT_CHANGED' },
      ),
    });
    if (result.cleanupRequired) {
      core.warning(
        'The site was built successfully, but Facade recovery directories require manual cleanup before the next build.',
        { title: 'FACADE_OUTPUT_CLEANUP_REQUIRED' },
      );
    }
    for (const diagnostic of result.diagnostics ?? []) {
      if (diagnostic.severity !== 'warning') continue;
      core.warning(
        diagnostic.message + (diagnostic.configPath === undefined ? '' : ` (${diagnostic.configPath})`),
        { title: diagnostic.code },
      );
    }
    core.setOutput('output-path', outDir);
    core.setOutput('release-tag', result.releaseTag);
  } catch (error) {
    const failure = error instanceof FacadeError
      ? '[' + error.code + '] ' + error.message
      : '[ACTION_UNEXPECTED_FAILURE] Facade Action failed unexpectedly.';
    core.setFailed(failure);
  }
}

function optionalInput(core: ActionCore, name: string): string | undefined {
  const value = core.getInput(name);
  return value === '' ? undefined : value;
}
