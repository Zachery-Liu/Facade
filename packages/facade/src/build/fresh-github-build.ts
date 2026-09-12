import { createHash } from 'node:crypto';
import type { OfflineBuildResult, PreparedRelease } from './offline-build.js';
import { prepareRelease } from './offline-build.js';
import { loadFacadeConfig } from '../config/load-facade-config.js';
import { FacadeError } from '../runtime/facade-error.js';
import { GitHubReleaseSource, type GitHubReleaseSourceOptions } from '../source/github/github-release-source.js';
import { resolveGitHubSourceOptions, type GitHubSourceOverrides, type GitHubSourceOptions } from '../source/github/source-options.js';
import type { RepositorySnapshot } from '../source/repository-snapshot.js';
import type { FacadeConfigInput } from '../config/facade-config.js';

export interface CapturedBuildInput {
  readonly fingerprint: string;
  readonly snapshot: RepositorySnapshot;
  readonly config?: FacadeConfigInput;
  readonly selection?: 'github-latest' | 'tag';
}

export interface FreshBuildResult extends OfflineBuildResult {
  readonly attempts: 1 | 2;
  readonly releaseTag: string;
}

interface FreshBuildDependencies {
  readonly capture: () => Promise<CapturedBuildInput>;
  readonly prepare: (snapshot: RepositorySnapshot, config?: FacadeConfigInput, selection?: 'github-latest' | 'tag') => Promise<PreparedRelease>;
  readonly onInputChanged?: () => void;
}

export async function buildFreshRelease(dependencies: FreshBuildDependencies): Promise<FreshBuildResult> {
  for (const attempts of [1, 2] as const) {
    const before = await dependencies.capture();
    const prepared = await dependencies.prepare(before.snapshot, before.config, before.selection);
    try {
      const after = await dependencies.capture();
      if (before.fingerprint === after.fingerprint) {
        const result = await prepared.publish();
        return { ...result, attempts, releaseTag: before.snapshot.release.tagName };
      }
    } finally {
      await prepared.dispose();
    }
    if (attempts === 1) {
      dependencies.onInputChanged?.();
      continue;
    }
  }
  throw new FacadeError('BUILD_INPUT_CHANGED_REPEATEDLY', 'Facade inputs changed during both build attempts. Run the workflow again after release updates finish.');
}

export interface FreshGitHubBuildOptions {
  readonly basePath?: string;
  readonly configPath: string;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly outDir: string;
  readonly overrides?: GitHubSourceOverrides;
  readonly onInputChanged?: () => void;
  readonly sourceFactory?: (options: GitHubReleaseSourceOptions) => Pick<GitHubReleaseSource, 'getSnapshot'>;
}

export async function buildFreshGitHubRelease(options: FreshGitHubBuildOptions): Promise<FreshBuildResult> {
  const sourceFactory = options.sourceFactory ?? ((sourceOptions) => new GitHubReleaseSource(sourceOptions));
  return buildFreshRelease({
    capture: async () => captureGitHubInput(options, sourceFactory),
    prepare: (snapshot, config, selection) => prepareRelease(snapshot, {
      outDir: options.outDir,
      ...(options.basePath === undefined ? {} : { basePath: options.basePath === '' ? '/' : options.basePath }),
      ...(config === undefined ? {} : { config }),
      provider: 'github',
      ...(selection === undefined ? {} : { selection }),
    }),
    ...(options.onInputChanged === undefined ? {} : { onInputChanged: options.onInputChanged }),
  });
}

async function captureGitHubInput(
  options: FreshGitHubBuildOptions,
  sourceFactory: NonNullable<FreshGitHubBuildOptions['sourceFactory']>,
): Promise<CapturedBuildInput> {
  const loaded = await loadFacadeConfig(options.configPath);
  const sourceOptions = resolveGitHubSourceOptions(loaded.config, options.environment, options.overrides);
  const source = sourceFactory(toAdapterOptions(sourceOptions, options.environment.GITHUB_API_URL));
  const snapshot = sourceOptions.strategy === 'tag'
    ? await source.getSnapshot(sourceOptions.strategy, sourceOptions.tag)
    : await source.getSnapshot(sourceOptions.strategy);
  return {
    fingerprint: fingerprint(loaded.sourceText, sourceOptions, snapshot),
    snapshot,
    config: loaded.config,
    selection: sourceOptions.strategy,
  };
}

function toAdapterOptions(options: GitHubSourceOptions, apiUrl: string | undefined): GitHubReleaseSourceOptions {
  return {
    repository: options.repository,
    ...(options.token === undefined ? {} : { token: options.token }),
    ...(apiUrl === undefined ? {} : { apiUrl }),
  };
}

function fingerprint(configSource: string, options: GitHubSourceOptions, snapshot: RepositorySnapshot): string {
  return createHash('sha256').update(JSON.stringify({ configSource, options, snapshot })).digest('hex');
}
