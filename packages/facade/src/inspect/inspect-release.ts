import { readFile } from 'node:fs/promises';
import { resolveRelease, type ReleaseResolution } from '../compiler/release-resolver.js';
import { loadFacadeConfig } from '../config/load-facade-config.js';
import { FacadeError } from '../runtime/facade-error.js';
import { GitHubReleaseSource, type GitHubReleaseSourceOptions } from '../source/github/github-release-source.js';
import { resolveGitHubSourceOptions, type GitHubSourceOverrides } from '../source/github/source-options.js';
import { RepositorySnapshotSchema } from '../source/repository-snapshot.js';

export interface InspectOfflineOptions { readonly fixturePath: string; readonly configPath?: string; }
export interface InspectGitHubOptions {
  readonly configPath: string;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly overrides?: GitHubSourceOverrides;
  readonly sourceFactory?: (options: GitHubReleaseSourceOptions) => Pick<GitHubReleaseSource, 'getSnapshot'>;
}

export async function inspectOfflineRelease(options: InspectOfflineOptions): Promise<ReleaseResolution> {
  let snapshot;
  try { snapshot = RepositorySnapshotSchema.parse(JSON.parse(await readFile(options.fixturePath, 'utf8'))); }
  catch (cause) { throw new FacadeError('BUILD_INVALID_FIXTURE', 'The fixture is not a valid repository snapshot.', { cause }); }
  const config = options.configPath === undefined ? undefined : (await loadFacadeConfig(options.configPath)).config;
  return resolveRelease(snapshot, { ...(config === undefined ? {} : { config }), provider: 'fixture', selection: 'fixture' });
}

export async function inspectGitHubRelease(options: InspectGitHubOptions): Promise<ReleaseResolution> {
  const loaded = await loadFacadeConfig(options.configPath);
  const sourceOptions = resolveGitHubSourceOptions(loaded.config, options.environment, options.overrides);
  const sourceFactory = options.sourceFactory ?? ((adapterOptions) => new GitHubReleaseSource(adapterOptions));
  const source = sourceFactory({
    repository: sourceOptions.repository,
    ...(sourceOptions.token === undefined ? {} : { token: sourceOptions.token }),
    ...(options.environment.GITHUB_API_URL === undefined ? {} : { apiUrl: options.environment.GITHUB_API_URL }),
  });
  const snapshot = sourceOptions.strategy === 'tag'
    ? await source.getSnapshot(sourceOptions.strategy, sourceOptions.tag)
    : await source.getSnapshot(sourceOptions.strategy);
  return resolveRelease(snapshot, { config: loaded.config, provider: 'github', selection: sourceOptions.strategy });
}

export function renderInspectText(resolution: ReleaseResolution): string {
  const report = resolution.inspect;
  const lines = [
    `Release: ${singleLine(report.release.tag)} (${report.release.selection})`,
    `Source: ${report.source.provider} ${singleLine(report.source.repository)}`,
    '',
  ];
  for (const asset of report.assets) {
    lines.push(`${singleLine(asset.source.name)} [${singleLine(asset.source.id)}]`);
    lines.push(`  ${asset.final.os} / ${asset.final.arch} / ${asset.final.format} / ${asset.final.kind} / libc:${asset.final.requirements.libc.family}`);
    for (const field of ['os', 'arch', 'format', 'kind', 'libc'] as const) {
      const evidence = asset.final.evidence[field]!;
      lines.push(`  ${field}: ${evidence.status}; ${singleLine(evidence.detail)}${evidence.configPath === undefined ? '' : ` (${evidence.configPath})`}`);
    }
    if (asset.excluded) lines.push(`  Excluded: ${singleLine(asset.exclusionReason ?? 'configuration')}`);
    lines.push(`  Recommendation eligible: ${asset.recommendationEligible ? 'yes' : 'no'}`);
    for (const trace of asset.overrides) lines.push(`  Override ${trace.ruleId}: ${trace.field} ${String(trace.before)} -> ${String(trace.after)}`);
    for (const diagnostic of asset.diagnostics) lines.push(`  Warning ${diagnostic.code}: ${singleLine(diagnostic.message)}`);
    lines.push('');
  }
  lines.push('Rules:');
  if (report.rules.length === 0) lines.push('  (none)');
  for (const rule of report.rules) lines.push(`  ${rule.ruleId}: ${rule.status}; ${singleLine(rule.detail)}; assets=${rule.matchedAssetIds.join(',') || '(none)'}`);
  if (report.diagnostics.length > 0) {
    lines.push('', 'Diagnostics:');
    for (const diagnostic of report.diagnostics) lines.push(`  ${diagnostic.severity} ${diagnostic.code}: ${singleLine(diagnostic.message)}`);
  }
  return lines.join('\n') + '\n';
}

function singleLine(value: string): string { return value.replace(/[\r\n]+/g, ' '); }
