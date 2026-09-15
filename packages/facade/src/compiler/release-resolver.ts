import { classifyAsset, type Architecture, type AssetFormat, type AssetKind, type ClassificationField, type FieldEvidence, type LibcFamily, type OperatingSystem } from '../classifier/asset-classifier.js';
import { FacadeConfigInputSchema, type DownloadRule, type FacadeConfigInput } from '../config/facade-config.js';
import { compileFullNameGlob } from '../config/full-name-glob.js';
import { ManifestAssetSchema, ReleasePageManifestSchema, type ManifestAsset, type ReleasePageManifest } from '../manifest/release-page-manifest.js';
import { RepositorySnapshotSchema, type RepositorySnapshot } from '../source/repository-snapshot.js';
import { FacadeError } from '../runtime/facade-error.js';

export interface BuildDiagnostic {
  readonly code: string;
  readonly severity: 'warning' | 'error';
  readonly message: string;
  readonly assetId?: string;
  readonly configPath?: string;
}

export interface OverrideTrace {
  readonly ruleId: string;
  readonly configPath: string;
  readonly field: 'exclude' | 'label' | 'priority' | ClassificationField;
  readonly before: string | number | boolean;
  readonly after: string | number | boolean;
}

export interface InspectAsset {
  readonly source: { readonly id: string; readonly name: string; readonly size: number; readonly downloadUrl: string };
  readonly final: ManifestAsset;
  readonly excluded: boolean;
  readonly exclusionReason?: string;
  readonly recommendationEligible: boolean;
  readonly diagnostics: readonly BuildDiagnostic[];
  readonly overrides: readonly OverrideTrace[];
}

export interface InspectRuleResult {
  readonly ruleId: string;
  readonly configPath: string;
  readonly match: string;
  readonly tag?: string;
  readonly status: 'matched' | 'unmatched' | 'skipped-tag';
  readonly matchedAssetIds: readonly string[];
  readonly detail: string;
}

export interface ReleaseResolution {
  readonly manifest: ReleasePageManifest;
  readonly inspect: {
    readonly source: { readonly provider: 'fixture' | 'github' | 'unknown'; readonly repository: string; readonly repositoryUrl: string };
    readonly release: { readonly id: string; readonly tag: string; readonly name: string; readonly selection: 'fixture' | 'github-latest' | 'tag' };
    readonly assets: readonly InspectAsset[];
    readonly rules: readonly InspectRuleResult[];
    readonly diagnostics: readonly BuildDiagnostic[];
  };
}

export interface ResolveReleaseOptions {
  readonly config?: FacadeConfigInput;
  readonly provider?: 'fixture' | 'github' | 'unknown';
  readonly selection?: 'fixture' | 'github-latest' | 'tag';
}

interface MutableAsset {
  source: InspectAsset['source'];
  os: OperatingSystem;
  arch: Architecture;
  format: AssetFormat;
  kind: AssetKind;
  libc: LibcFamily;
  label: string;
  priority: number;
  evidence: Record<ClassificationField, FieldEvidence>;
  diagnostics: BuildDiagnostic[];
  overrides: OverrideTrace[];
  excluded: boolean;
  exclusionReason?: string;
  matchedApplicableRule: boolean;
}

const RECOMMENDABLE_KINDS = new Set<AssetKind>(['installer', 'portable', 'archive']);

export function resolveRelease(snapshotInput: RepositorySnapshot, options: ResolveReleaseOptions = {}): ReleaseResolution {
  const snapshot = RepositorySnapshotSchema.parse(snapshotInput);
  const config = FacadeConfigInputSchema.parse(options.config ?? { schema: 1 });
  const downloads = config.downloads ?? { auto: true, rules: [] };
  const assets = snapshot.assets.map((asset): MutableAsset => {
    const classified = classifyAsset(asset);
    const disabledEvidence = (field: ClassificationField): FieldEvidence => ({ source: 'filename-rule', status: 'unknown', detail: `Filename ${field} inference disabled by downloads.auto` });
    return {
      source: asset,
      os: downloads.auto ? classified.os : 'unknown',
      arch: downloads.auto ? classified.arch : 'unknown',
      format: downloads.auto ? classified.format : 'other',
      kind: downloads.auto ? classified.kind : 'unknown',
      libc: downloads.auto ? classified.libc : 'unknown',
      label: asset.name,
      priority: 0,
      evidence: downloads.auto ? { ...classified.evidence } : { os: disabledEvidence('os'), arch: disabledEvidence('arch'), format: disabledEvidence('format'), kind: disabledEvidence('kind'), libc: disabledEvidence('libc') },
      diagnostics: downloads.auto ? classified.diagnostics.map((diagnostic) => ({ ...diagnostic, severity: 'warning' as const, assetId: asset.id })) : [],
      overrides: [],
      excluded: !downloads.auto,
      ...(!downloads.auto ? { exclusionReason: 'downloads.auto is false and no applicable rule matched' } : {}),
      matchedApplicableRule: false,
    };
  });
  const ruleDiagnostics: BuildDiagnostic[] = [];
  const rules = downloads.rules.map((rule, index) => applyRule(rule, index, snapshot.release.tagName, assets, ruleDiagnostics));
  reconcileFinalLibc(assets);
  const diagnostics: BuildDiagnostic[] = [...assets.flatMap((asset) => asset.diagnostics), ...ruleDiagnostics];
  const inspectAssets = assets.map(finalizeAsset);
  const manifest = ReleasePageManifestSchema.parse({
    schemaVersion: 1,
    productName: snapshot.release.name,
    releaseTag: snapshot.release.tagName,
    assets: inspectAssets.filter((asset) => !asset.excluded).map((asset) => asset.final),
  });
  return {
    manifest,
    inspect: {
      source: { provider: options.provider ?? 'unknown', repository: snapshot.repository.fullName, repositoryUrl: snapshot.repository.htmlUrl },
      release: {
        id: snapshot.release.id,
        tag: snapshot.release.tagName,
        name: snapshot.release.name,
        selection: options.selection ?? (options.provider === 'fixture' ? 'fixture' : config.release?.strategy ?? 'github-latest'),
      },
      assets: inspectAssets,
      rules,
      diagnostics,
    },
  };
}

function applyRule(rule: DownloadRule, index: number, releaseTag: string, assets: MutableAsset[], diagnostics: BuildDiagnostic[]): InspectRuleResult {
  const ruleId = `downloads.rules[${index}]`;
  if (rule.tag !== undefined && rule.tag !== releaseTag) {
    diagnostics.push({ code: 'DOWNLOAD_RULE_TAG_MISMATCH', severity: 'warning', message: `Download rule ${ruleId} was skipped because its release tag does not match.`, configPath: `${ruleId}.tag` });
    return { ruleId, configPath: ruleId, match: rule.match, tag: rule.tag, status: 'skipped-tag', matchedAssetIds: [], detail: `Skipped because release tag ${releaseTag} does not equal ${rule.tag}` };
  }
  const matched = assets.filter((asset) => matchesGlob(asset.source.name, rule.match));
  if (matched.length === 0) {
    diagnostics.push({ code: 'DOWNLOAD_RULE_NO_MATCH', severity: 'warning', message: `Download rule ${ruleId} matched no assets.`, configPath: ruleId });
    return { ruleId, configPath: ruleId, match: rule.match, ...(rule.tag === undefined ? {} : { tag: rule.tag }), status: 'unmatched', matchedAssetIds: [], detail: 'No source asset name matched the case-sensitive full-name glob' };
  }
  for (const asset of matched) applyRuleToAsset(asset, rule, ruleId);
  return {
    ruleId,
    configPath: ruleId,
    match: rule.match,
    ...(rule.tag === undefined ? {} : { tag: rule.tag }),
    status: 'matched',
    matchedAssetIds: matched.map((asset) => asset.source.id),
    detail: `Matched ${matched.length} asset${matched.length === 1 ? '' : 's'}`,
  };
}

function applyRuleToAsset(asset: MutableAsset, rule: DownloadRule, ruleId: string): void {
  if (!asset.matchedApplicableRule && asset.exclusionReason === 'downloads.auto is false and no applicable rule matched') {
    asset.overrides.push({ ruleId, configPath: ruleId, field: 'exclude', before: true, after: false });
    asset.excluded = false;
    delete asset.exclusionReason;
  }
  asset.matchedApplicableRule = true;
  if (rule.exclude !== undefined) {
    recordChange(asset, ruleId, 'exclude', asset.excluded, rule.exclude);
    asset.excluded = rule.exclude;
    if (rule.exclude) asset.exclusionReason = ruleId;
    else delete asset.exclusionReason;
  }
  const set = rule.set;
  if (set === undefined) return;
  if (set.os !== undefined) overrideClassification(asset, ruleId, 'os', set.os);
  if (set.arch !== undefined) overrideClassification(asset, ruleId, 'arch', set.arch);
  if (set.format !== undefined) overrideClassification(asset, ruleId, 'format', set.format);
  if (set.kind !== undefined) overrideClassification(asset, ruleId, 'kind', set.kind);
  if (set.requirements !== undefined) overrideClassification(asset, ruleId, 'libc', set.requirements.libc.family);
  if (set.label !== undefined) { recordChange(asset, ruleId, 'label', asset.label, set.label); asset.label = set.label; }
  if (set.priority !== undefined) { recordChange(asset, ruleId, 'priority', asset.priority, set.priority); asset.priority = set.priority; }
}

function overrideClassification(asset: MutableAsset, ruleId: string, field: ClassificationField, value: OperatingSystem | Architecture | AssetFormat | AssetKind | LibcFamily): void {
  const before = asset[field];
  recordChange(asset, ruleId, field, before, value);
  (asset as unknown as Record<ClassificationField, string>)[field] = value;
  asset.evidence[field] = { source: 'project-config', status: 'explicit', detail: `Set by ${ruleId}`, ruleId, configPath: `${ruleId}.set.${field === 'libc' ? 'requirements.libc.family' : field}` };
}

function recordChange(asset: MutableAsset, ruleId: string, field: OverrideTrace['field'], before: OverrideTrace['before'], after: OverrideTrace['after']): void {
  const configPath = field === 'exclude' ? `${ruleId}.exclude` : `${ruleId}.set.${field === 'libc' ? 'requirements.libc.family' : field}`;
  asset.overrides.push({ ruleId, configPath, field, before, after });
}

function finalizeAsset(asset: MutableAsset): InspectAsset {
  const hasConflict = Object.values(asset.evidence).some((evidence) => evidence.status === 'conflict');
  const recommendationEligible = !asset.excluded && !hasConflict && asset.os !== 'unknown' && asset.arch !== 'unknown' && RECOMMENDABLE_KINDS.has(asset.kind);
  const sourceEvidence = { source: 'github-api' as const, status: 'explicit' as const, detail: 'Preserved from the validated release source' };
  const labelTrace = findLastTrace(asset.overrides, 'label');
  const priorityTrace = findLastTrace(asset.overrides, 'priority');
  const labelEvidence = labelTrace === undefined ? sourceEvidence : configuredEvidence(labelTrace);
  const priorityEvidence = priorityTrace === undefined
    ? { source: 'derived' as const, status: 'inferred' as const, detail: 'Default priority 0' }
    : configuredEvidence(priorityTrace);
  const final = ManifestAssetSchema.parse({
    id: asset.source.id,
    name: asset.source.name,
    label: asset.label,
    downloadUrl: asset.source.downloadUrl,
    size: asset.source.size,
    os: asset.os,
    arch: asset.arch,
    format: asset.format,
    kind: asset.kind,
    priority: asset.priority,
    requirements: { libc: { family: asset.libc } },
    recommendationEligible,
    evidence: { id: sourceEvidence, name: sourceEvidence, label: labelEvidence, downloadUrl: sourceEvidence, size: sourceEvidence, os: asset.evidence.os, arch: asset.evidence.arch, format: asset.evidence.format, kind: asset.evidence.kind, priority: priorityEvidence, requirements: asset.evidence.libc, libc: asset.evidence.libc },
  });
  return {
    source: asset.source,
    final,
    excluded: asset.excluded,
    ...(asset.exclusionReason === undefined ? {} : { exclusionReason: asset.exclusionReason }),
    recommendationEligible,
    diagnostics: asset.diagnostics,
    overrides: asset.overrides,
  };
}

function findLastTrace(traces: readonly OverrideTrace[], field: OverrideTrace['field']): OverrideTrace | undefined {
  for (let index = traces.length - 1; index >= 0; index -= 1) if (traces[index]?.field === field) return traces[index];
  return undefined;
}

function configuredEvidence(trace: OverrideTrace) {
  return { source: 'project-config' as const, status: 'explicit' as const, detail: `Set by ${trace.ruleId}`, ruleId: trace.ruleId, configPath: trace.configPath };
}

function reconcileFinalLibc(assets: readonly MutableAsset[]): void {
  const invalid = assets.find((asset) => asset.evidence.libc.source === 'project-config' && asset.libc !== 'unknown' && asset.os !== 'linux');
  if (invalid !== undefined) throw new FacadeError('CONFIG_INVALID', 'A configured libc requirement is incompatible with the asset operating system.');
  for (const asset of assets) {
    if (asset.evidence.libc.source !== 'filename-rule' || asset.libc === 'unknown' || asset.os === 'linux') continue;
    const detail = `${asset.libc} filename evidence conflicts with resolved ${asset.os} OS`;
    asset.libc = 'unknown';
    asset.evidence.libc = { source: 'filename-rule', status: 'conflict', detail };
    if (!asset.diagnostics.some((diagnostic) => diagnostic.code === 'CLASSIFICATION_LIBC_CONFLICT')) {
      asset.diagnostics.push({ code: 'CLASSIFICATION_LIBC_CONFLICT', severity: 'warning', message: `Conflicting libc evidence: ${detail}`, assetId: asset.source.id });
    }
  }
}

export function matchesGlob(value: string, glob: string): boolean {
  return compileFullNameGlob(glob).test(value);
}
