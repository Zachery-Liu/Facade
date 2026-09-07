import type { FacadeConfig } from '../../config/facade-config.js';
import { FacadeError } from '../../runtime/facade-error.js';

export interface GitHubSourceOverrides {
  readonly repository?: string;
  readonly strategy?: 'github-latest' | 'tag';
  readonly tag?: string;
  readonly token?: string;
}

export interface GitHubSourceOptions {
  readonly repository: string;
  readonly strategy: 'github-latest' | 'tag';
  readonly tag?: string;
  readonly token?: string;
}

export function resolveGitHubSourceOptions(config: FacadeConfig, environment: Readonly<Record<string, string | undefined>>, cli: GitHubSourceOverrides = {}): GitHubSourceOptions {
  const strategy = cli.strategy ?? parseStrategy(environment.FACADE_RELEASE_STRATEGY) ?? config.release.strategy;
  const tag = cli.tag ?? environment.FACADE_RELEASE_TAG ?? config.release.tag;
  if (strategy === 'tag' && (tag === undefined || tag.length === 0)) {
    throw new FacadeError('SOURCE_TAG_REQUIRED', 'A release tag is required when selecting a tagged release.');
  }
  const token = cli.token ?? environment.GITHUB_TOKEN;
  return {
    repository: cli.repository ?? environment.FACADE_REPOSITORY ?? config.repository,
    strategy,
    ...(tag === undefined ? {} : { tag }),
    ...(token === undefined ? {} : { token }),
  };
}

function parseStrategy(value: string | undefined): 'github-latest' | 'tag' | undefined {
  if (value === undefined) return undefined;
  if (value === 'github-latest' || value === 'tag') return value;
  throw new FacadeError('SOURCE_INVALID_STRATEGY', 'FACADE_RELEASE_STRATEGY must be github-latest or tag.');
}
