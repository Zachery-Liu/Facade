import type { FacadeConfigInput } from '../../config/facade-config.js';
import { FacadeError } from '../../runtime/facade-error.js';

export interface GitHubSourceOverrides {
  readonly repository?: string;
  readonly strategy?: 'github-latest' | 'tag';
  readonly tag?: string;
  readonly token?: string;
}

export interface GitHubSourceEnvironment {
  readonly FACADE_REPOSITORY?: string;
  readonly FACADE_RELEASE_STRATEGY?: string;
  readonly FACADE_RELEASE_TAG?: string;
  readonly GITHUB_REPOSITORY?: string;
  readonly GITHUB_TOKEN?: string;
}

interface GitHubSourceBaseOptions {
  readonly repository: string;
  readonly token?: string;
}

export type GitHubSourceOptions = GitHubSourceBaseOptions & (
  | { readonly strategy: 'github-latest' }
  | { readonly strategy: 'tag'; readonly tag: string }
);

export function resolveGitHubSourceOptions(config: FacadeConfigInput, environment: GitHubSourceEnvironment, cli: GitHubSourceOverrides = {}): GitHubSourceOptions {
  const repository = cli.repository
    ?? environment.FACADE_REPOSITORY
    ?? config.repository
    ?? environment.GITHUB_REPOSITORY;
  if (repository === undefined || repository.length === 0) {
    throw new FacadeError('SOURCE_REPOSITORY_REQUIRED', 'A GitHub repository is required when it cannot be inferred from the environment.');
  }

  const strategy = cli.strategy
    ?? parseStrategy(environment.FACADE_RELEASE_STRATEGY)
    ?? config.release?.strategy
    ?? 'github-latest';
  const configTag = config.release?.strategy === 'tag' ? config.release.tag : undefined;
  const tag = cli.tag ?? environment.FACADE_RELEASE_TAG ?? configTag;
  const token = resolveToken(cli.token, environment.GITHUB_TOKEN);
  const base = {
    repository,
    ...(token === undefined ? {} : { token }),
  };
  if (strategy === 'tag') {
    if (tag === undefined || tag.length === 0) throw new FacadeError('SOURCE_TAG_REQUIRED', 'A release tag is required when selecting a tagged release.');
    return { ...base, strategy, tag };
  }
  return { ...base, strategy };
}

function resolveToken(cliToken: string | undefined, githubToken: string | undefined): string | undefined {
  return cliToken ?? githubToken;
}

function parseStrategy(value: string | undefined): 'github-latest' | 'tag' | undefined {
  if (value === undefined) return undefined;
  if (value === 'github-latest' || value === 'tag') return value;
  throw new FacadeError('SOURCE_INVALID_STRATEGY', 'FACADE_RELEASE_STRATEGY must be github-latest or tag.');
}
