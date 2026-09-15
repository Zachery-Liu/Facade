import { buildRelease, type OfflineBuildResult } from '../../build/offline-build.js';
import type { GitHubReleaseSource } from './github-release-source.js';
import type { FacadeConfigInput } from '../../config/facade-config.js';

interface GitHubBuildBaseOptions {
  readonly outDir: string;
  readonly basePath?: string;
  readonly config?: FacadeConfigInput;
}

export type GitHubBuildOptions = GitHubBuildBaseOptions & (
  | { readonly strategy: 'github-latest' }
  | { readonly strategy: 'tag'; readonly tag: string }
);

export async function buildGitHubRelease(source: GitHubReleaseSource, options: GitHubBuildOptions): Promise<OfflineBuildResult> {
  const snapshot = options.strategy === 'tag'
    ? await source.getSnapshot(options.strategy, options.tag)
    : await source.getSnapshot(options.strategy);
  return buildRelease(snapshot, {
    outDir: options.outDir,
    ...(options.basePath === undefined ? {} : { basePath: options.basePath }),
    ...(options.config === undefined ? {} : { config: options.config }),
    provider: 'github',
    selection: options.strategy,
  });
}
