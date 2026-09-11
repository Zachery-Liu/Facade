import { createHash } from 'node:crypto';
import type { OfflineBuildResult } from './offline-build.js';
import { buildRelease } from './offline-build.js';
import { loadFacadeConfig } from '../config/load-facade-config.js';
import { FacadeError } from '../runtime/facade-error.js';
import { GitHubReleaseSource, type GitHubReleaseSourceOptions } from '../source/github/github-release-source.js';
import { resolveGitHubSourceOptions, type GitHubSourceOverrides, type GitHubSourceOptions } from '../source/github/source-options.js';
import type { RepositorySnapshot } from '../source/repository-snapshot.js';

export interface CapturedBuildInput {
  readonly fingerprint: string;
  readonly snapshot: RepositorySnapshot;
}

export interface FreshBuildResult extends OfflineBuildResult {
  readonly attempts: 1 | 2;
  readonly releaseTag: string;
}

interface FreshBuildDependencies {
  readonly capture: () => Promise<CapturedBuildInput>;
  readonly publish: (snapshot: RepositorySnapshot) => Promise<OfflineBuildResult>;
  readonly onInputChanged?: () => void;
}

export async function buildFreshRelease(dependencies: FreshBuildDependencies): Promise<FreshBuildResult> {
  for (const attempts of [1, 2] as const) {
    const before = await dependencies.capture();
    const result = await dependencies.publish(before.snapshot);
    const after = await dependencies.capture();
    if (before.fingerprint === after.fingerprint) {
      return { ...result, attempts, releaseTag: before.snapshot.release.tagName };
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
    publish: (snapshot) => buildRelease(snapshot, {
      outDir: options.outDir,
      ...(options.basePath === undefined ? {} : { basePath: options.basePath === '' ? '/' : options.basePath }),
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
