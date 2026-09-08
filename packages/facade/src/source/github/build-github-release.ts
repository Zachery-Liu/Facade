import { buildRelease, type OfflineBuildResult } from '../../build/offline-build.js';
import type { GitHubReleaseSource } from './github-release-source.js';

export interface GitHubBuildOptions {
  readonly strategy: 'github-latest' | 'tag';
  readonly tag?: string;
  readonly outDir: string;
  readonly basePath?: string;
}

export async function buildGitHubRelease(source: GitHubReleaseSource, options: GitHubBuildOptions): Promise<OfflineBuildResult> {
  const snapshot = await source.getSnapshot(options.strategy, options.tag);
  return buildRelease(snapshot, { outDir: options.outDir, ...(options.basePath === undefined ? {} : { basePath: options.basePath }) });
}
