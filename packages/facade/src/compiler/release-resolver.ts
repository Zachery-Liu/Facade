import { classifyAsset, type Architecture, type AssetFormat, type AssetKind, type ClassificationField, type FieldEvidence, type LibcFamily, type OperatingSystem } from '../classifier/asset-classifier.js';
import { FacadeConfigInputSchema, type DownloadRule, type FacadeConfigInput, type InstallMethodConfig, type InstallationPreferenceConfig, type VerificationConfig } from '../config/facade-config.js';
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
  readonly field: 'exclude' | 'label' | 'priority' | 'supportedArchitectures' | 'requirements.minimumOsVersion' | 'requirements.libc.minimumVersion' | ClassificationField;
  readonly before: string | number | boolean | readonly string[] | undefined;
  readonly after: string | number | boolean | readonly string[] | null | undefined;
}

export interface InspectAsset {
  readonly source: { readonly id: string; readonly name: string; readonly size: number; readonly downloadUrl: string; readonly digest?: { readonly algorithm: 'sha256'; readonly value: string } | undefined };
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
  libcMinimumVersion?: string;
  minimumOsVersion?: string;
  supportedArchitectures?: Array<'arm64' | 'x64' | 'x86'>;
  label: string;
  priority: number;
  evidence: Record<ClassificationField, FieldEvidence>;
  additionalEvidence: Record<string, ManifestAsset['evidence'][string]>;
  diagnostics: BuildDiagnostic[];
  overrides: OverrideTrace[];
  excluded: boolean;
  exclusionReason?: string;
  matchedApplicableRule: boolean;
  verification?: VerificationConfig;
}

const RECOMMENDABLE_KINDS = new Set<AssetKind>(['installer', 'portable', 'archive']);

export function resolveRelease(snapshotInput: RepositorySnapshot, options: ResolveReleaseOptions = {}): ReleaseResolution {
  const snapshot = RepositorySnapshotSchema.parse(snapshotInput);
  const provider = options.provider ?? 'fixture';
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
      additionalEvidence: {},
      diagnostics: downloads.auto ? classified.diagnostics.map((diagnostic) => ({ ...diagnostic, severity: 'warning' as const, assetId: asset.id })) : [],
      overrides: [],
      excluded: !downloads.auto,
      ...(!downloads.auto ? { exclusionReason: 'downloads.auto is false and no applicable rule matched' } : {}),
      matchedApplicableRule: false,
    };
  });
  const ruleDiagnostics: BuildDiagnostic[] = [];
  const rules = downloads.rules.map((rule, index) => applyRule(rule, index, snapshot.release.tagName, assets, ruleDiagnostics));
  reconcileFinalRequirements(assets);
  let publicIndex = 0;
  const inspectAssets = assets.map((asset) => finalizeAsset(asset, asset.excluded ? 0 : publicIndex++, provider));
  const includedAssets = inspectAssets.filter((asset) => !asset.excluded).map((asset) => asset.final);
  applyVerificationMaterials(assets.filter((asset) => !asset.excluded), includedAssets);
  const installMethods = compileInstallMethods(config.install ?? []);
  const installationPreferences = compileInstallationPreferences(config.installationPreferences ?? [], includedAssets, ruleDiagnostics);
  const diagnostics: BuildDiagnostic[] = [...assets.flatMap((asset) => asset.diagnostics), ...ruleDiagnostics];
  const channel = config.release?.channel ?? (snapshot.release.prerelease ? 'prerelease' : 'stable');
  if (channel === 'stable' && snapshot.release.prerelease) throw new FacadeError('CONFIG_INVALID', 'A prerelease source cannot be declared as the stable channel.');
  const source = { provider, repository: snapshot.repository.fullName, repositoryUrl: snapshot.repository.htmlUrl };
  const release = { id: snapshot.release.id, tag: snapshot.release.tagName, name: snapshot.release.name, prerelease: snapshot.release.prerelease, channel };
  const providerEvidence = providedSourceEvidence(provider);
  const manifestEvidence = [
    evidenceAt('/source/repository', providerEvidence.source, providerEvidence.status, 'Preserved from the validated repository source'),
    evidenceAt('/source/repositoryUrl', providerEvidence.source, providerEvidence.status, 'Preserved from the validated repository source'),
    evidenceAt('/release/id', providerEvidence.source, providerEvidence.status, 'Preserved from the validated release source'),
    evidenceAt('/release/tag', providerEvidence.source, providerEvidence.status, 'Preserved from the validated release source'),
    evidenceAt('/release/name', providerEvidence.source, providerEvidence.status, 'Preserved from the validated release source'),
    evidenceAt('/release/prerelease', providerEvidence.source, providerEvidence.status, 'Preserved from the validated release source'),
    config.release?.channel === undefined
      ? { ...evidenceAt('/release/channel', 'derived', 'inferred', 'Derived only from the source prerelease flag'), derivedFrom: ['/release/prerelease'] }
      : { ...evidenceAt('/release/channel', 'project-config', 'explicit', 'Declared in repository configuration'), configPath: 'release.channel' },
    ...includedAssets.flatMap((asset) => Object.values(asset.evidence)),
    ...installMethods.flatMap((method) => Object.values(method.evidence ?? {})),
    ...installationPreferences.flatMap((preference) => Object.values(preference.evidence ?? {})),
  ];
  const manifest = ReleasePageManifestSchema.parse({
    schemaVersion: 1,
    productName: snapshot.release.name,
    releaseTag: snapshot.release.tagName,
    assets: includedAssets,
    source,
    release,
    evidence: manifestEvidence,
    ...(config.install === undefined ? {} : { installMethods }),
    ...(config.installationPreferences === undefined ? {} : { installationPreferences }),
  });
  return {
    manifest,
    inspect: {
      source,
      release: {
        id: snapshot.release.id,
        tag: snapshot.release.tagName,
        name: snapshot.release.name,
        selection: options.selection ?? (provider === 'fixture' ? 'fixture' : config.release?.strategy ?? 'github-latest'),
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
  if (set.supportedArchitectures !== undefined) {
    recordChange(asset, ruleId, 'supportedArchitectures', asset.supportedArchitectures, set.supportedArchitectures);
    asset.supportedArchitectures = [...set.supportedArchitectures];
    asset.additionalEvidence.supportedArchitectures = configuredFieldEvidence(ruleId, 'supportedArchitectures');
  }
  if (set.requirements !== undefined) applyRequirements(asset, set.requirements, ruleId);
  if (set.verification !== undefined) asset.verification = set.verification;
  if (set.label !== undefined) { recordChange(asset, ruleId, 'label', asset.label, set.label); asset.label = set.label; }
  if (set.priority !== undefined) { recordChange(asset, ruleId, 'priority', asset.priority, set.priority); asset.priority = set.priority; }
}

function applyRequirements(asset: MutableAsset, requirements: NonNullable<NonNullable<DownloadRule['set']>['requirements']>, ruleId: string): void {
  if (requirements.minimumOsVersion !== undefined) {
    recordChange(asset, ruleId, 'requirements.minimumOsVersion', asset.minimumOsVersion, requirements.minimumOsVersion);
    asset.additionalEvidence['requirements.minimumOsVersion'] = configuredFieldEvidence(ruleId, 'requirements.minimumOsVersion');
  } else {
    if (asset.minimumOsVersion !== undefined) recordChange(asset, ruleId, 'requirements.minimumOsVersion', asset.minimumOsVersion, null);
    delete asset.additionalEvidence['requirements.minimumOsVersion'];
    delete asset.minimumOsVersion;
  }
  if (requirements.minimumOsVersion !== undefined) asset.minimumOsVersion = requirements.minimumOsVersion;

  if (requirements.libc === undefined) {
    recordChange(asset, ruleId, 'libc', asset.libc, 'unknown');
    asset.libc = 'unknown';
    asset.evidence.libc = { source: 'project-config', status: 'unknown', detail: `Normalized omitted libc in ${ruleId}.set.requirements`, ruleId, configPath: `${ruleId}.set.requirements` };
    if (asset.libcMinimumVersion !== undefined) recordChange(asset, ruleId, 'requirements.libc.minimumVersion', asset.libcMinimumVersion, null);
    delete asset.libcMinimumVersion;
    delete asset.additionalEvidence['requirements.libc.minimumVersion'];
    return;
  }

  overrideClassification(asset, ruleId, 'libc', requirements.libc.family);
  if (requirements.libc.minimumVersion !== undefined) {
    recordChange(asset, ruleId, 'requirements.libc.minimumVersion', asset.libcMinimumVersion, requirements.libc.minimumVersion);
    asset.additionalEvidence['requirements.libc.minimumVersion'] = configuredFieldEvidence(ruleId, 'requirements.libc.minimumVersion');
  } else {
    if (asset.libcMinimumVersion !== undefined) recordChange(asset, ruleId, 'requirements.libc.minimumVersion', asset.libcMinimumVersion, null);
    delete asset.additionalEvidence['requirements.libc.minimumVersion'];
    delete asset.libcMinimumVersion;
  }
  if (requirements.libc.minimumVersion !== undefined) asset.libcMinimumVersion = requirements.libc.minimumVersion;
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

function finalizeAsset(asset: MutableAsset, publicIndex: number, provider: NonNullable<ResolveReleaseOptions['provider']>): InspectAsset {
  const hasConflict = Object.values(asset.evidence).some((evidence) => evidence.status === 'conflict');
  const universalSupported = asset.arch !== 'universal' || (asset.os === 'macos' && asset.supportedArchitectures !== undefined);
  const recommendationEligible = !asset.excluded && !hasConflict && asset.os !== 'unknown' && asset.arch !== 'unknown' && universalSupported && RECOMMENDABLE_KINDS.has(asset.kind);
  const assetPath = `/assets/${publicIndex}`;
  const sourceEvidence = { path: '', ...providedSourceEvidence(provider), detail: 'Preserved from the validated release source' };
  const labelTrace = findLastTrace(asset.overrides, 'label');
  const priorityTrace = findLastTrace(asset.overrides, 'priority');
  const labelEvidence = labelTrace === undefined ? sourceEvidence : configuredEvidence(labelTrace);
  const priorityEvidence = priorityTrace === undefined
    ? { source: 'derived' as const, status: 'inferred' as const, detail: 'Default priority 0' }
    : configuredEvidence(priorityTrace);
  const recommendationEvidence = {
    source: 'derived' as const,
    status: 'inferred' as const,
    detail: 'Derived from final compatibility classification, conflicts, exclusion state, and asset kind',
    derivedFrom: [`${assetPath}/os`, `${assetPath}/arch`, `${assetPath}/format`, `${assetPath}/kind`, `${assetPath}/requirements/libc/family`],
  };
  const verificationEvidence = {
    source: 'unknown' as const,
    status: 'unknown' as const,
    detail: 'No verification materials were declared',
  };
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
    ...(asset.supportedArchitectures === undefined ? {} : { supportedArchitectures: asset.supportedArchitectures }),
    requirements: {
      ...(asset.minimumOsVersion === undefined ? {} : { minimumOsVersion: asset.minimumOsVersion }),
      libc: { family: asset.libc, ...(asset.libcMinimumVersion === undefined ? {} : { minimumVersion: asset.libcMinimumVersion }) },
    },
    recommendationEligible,
    ...(asset.source.digest === undefined ? {} : { digest: asset.source.digest }),
    verificationMaterials: { signatures: [], attestations: [] },
    evidence: withEvidencePaths(assetPath, { id: sourceEvidence, name: sourceEvidence, label: labelEvidence, downloadUrl: sourceEvidence, size: sourceEvidence, os: asset.evidence.os, arch: asset.evidence.arch, format: asset.evidence.format, kind: asset.evidence.kind, priority: priorityEvidence, requirements: asset.evidence.libc, libc: asset.evidence.libc, recommendationEligible: recommendationEvidence, verificationMaterials: verificationEvidence, ...(asset.source.digest === undefined ? {} : { digest: sourceEvidence }), ...asset.additionalEvidence }),
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
  return { path: '', source: 'project-config' as const, status: 'explicit' as const, detail: `Set by ${trace.ruleId}`, ruleId: trace.ruleId, configPath: trace.configPath };
}

function configuredFieldEvidence(ruleId: string, field: string) {
  return { path: '', source: 'project-config' as const, status: 'explicit' as const, detail: `Set by ${ruleId}`, ruleId, configPath: `${ruleId}.set.${field}` };
}

function compileInstallMethods(methods: readonly InstallMethodConfig[]) {
  return methods.map((method, index) => ({
    id: method.id,
    platform: method.platform,
    name: method.name,
    command: method.command,
    prerequisites: method.prerequisites ?? [],
    versionBinding: method.versionBinding ?? 'unverified' as const,
    evidence: {
      platform: authorEvidence(`install[${index}].platform`, `/installMethods/${index}/platform`),
      command: authorEvidence(`install[${index}].command`, `/installMethods/${index}/command`),
      prerequisites: method.prerequisites === undefined
        ? derivedEvidence(`Defaulted install[${index}].prerequisites to an empty list`, `/installMethods/${index}/prerequisites`)
        : authorEvidence(`install[${index}].prerequisites`, `/installMethods/${index}/prerequisites`),
      versionBinding: method.versionBinding === undefined
        ? derivedEvidence(`Defaulted install[${index}].versionBinding to unverified`, `/installMethods/${index}/versionBinding`)
        : authorEvidence(`install[${index}].versionBinding`, `/installMethods/${index}/versionBinding`),
    },
  }));
}

function compileInstallationPreferences(
  preferences: readonly InstallationPreferenceConfig[],
  assets: readonly ManifestAsset[],
  diagnostics: BuildDiagnostic[],
) {
  type CompiledPreferenceItem = { type: 'method'; methodId: string } | { type: 'artifacts'; assetIds: string[] };
  return preferences.map((preference, preferenceIndex) => {
    const prefer = preference.prefer.reduce<CompiledPreferenceItem[]>((compiled, item, preferIndex) => {
      if ('method' in item) {
        compiled.push({ type: 'method', methodId: item.method });
        return compiled;
      }
      const assetIds = assets
        .filter((asset) => asset.recommendationEligible && matchesGlob(asset.name, item.assetMatch))
        .map((asset) => asset.id);
      if (assetIds.length === 0) {
        diagnostics.push({
          code: 'INSTALLATION_PREFERENCE_ASSET_NO_MATCH',
          severity: 'warning',
          message: `Installation preference installationPreferences[${preferenceIndex}].prefer[${preferIndex}] matched no eligible assets.`,
          configPath: `installationPreferences[${preferenceIndex}].prefer[${preferIndex}].assetMatch`,
        });
        return compiled;
      }
      compiled.push({ type: 'artifacts', assetIds });
      return compiled;
    }, []);
    return {
      id: preference.id,
      when: preference.when,
      prefer,
      evidence: {
        'when.os': authorEvidence(`installationPreferences[${preferenceIndex}].when.os`, `/installationPreferences/${preferenceIndex}/when/os`),
        ...(preference.when.arch === undefined ? {} : { 'when.arch': authorEvidence(`installationPreferences[${preferenceIndex}].when.arch`, `/installationPreferences/${preferenceIndex}/when/arch`) }),
        ...(preference.when.libc === undefined ? {} : { 'when.libc': authorEvidence(`installationPreferences[${preferenceIndex}].when.libc`, `/installationPreferences/${preferenceIndex}/when/libc`) }),
      },
    };
  });
}

function authorEvidence(configPath: string, path: string) {
  return { path, source: 'project-config' as const, status: 'explicit' as const, detail: 'Declared in repository configuration', configPath };
}

function derivedEvidence(detail: string, path: string) {
  return { path, source: 'derived' as const, status: 'inferred' as const, detail };
}

function evidenceAt(path: string, source: ManifestEvidenceSource, status: 'explicit' | 'provided' | 'inferred' | 'unknown' | 'conflict', detail: string) {
  return { path, source, status, detail };
}

type ManifestEvidenceSource = ManifestAsset['evidence'][string]['source'];

function providedSourceEvidence(provider: NonNullable<ResolveReleaseOptions['provider']>):
  { source: 'github-api' | 'fixture'; status: 'provided' } | { source: 'unknown'; status: 'unknown' } {
  if (provider === 'github') return { source: 'github-api', status: 'provided' };
  if (provider === 'fixture') return { source: 'fixture', status: 'provided' };
  return { source: 'unknown', status: 'unknown' };
}

function withEvidencePaths(base: string, evidence: ManifestAsset['evidence']): ManifestAsset['evidence'] {
  return Object.fromEntries(Object.entries(evidence).map(([field, entry]) => [field, { ...entry, path: `${base}/${evidenceFieldPointer(field)}` }]));
}

function evidenceFieldPointer(field: string): string { return field === 'libc' ? 'requirements/libc/family' : field.replaceAll('.', '/'); }

function applyVerificationMaterials(mutableAssets: readonly MutableAsset[], assets: ManifestAsset[]): void {
  for (let index = 0; index < mutableAssets.length; index += 1) {
    const configured = mutableAssets[index]?.verification;
    if (configured === undefined) continue;
    const signatures = (configured.signatures ?? []).map((signature) => {
      const matches = assets.filter((candidate) => candidate.kind === 'signature' && matchesGlob(candidate.name, signature.assetMatch));
      if (matches.length !== 1) throw new FacadeError('CONFIG_INVALID', `Verification signature pattern ${signature.assetMatch} must match exactly one included signature asset.`);
      return { assetId: matches[0]!.id, scheme: signature.scheme };
    });
    const target = assets[index];
    if (target === undefined) continue;
    target.verificationMaterials = {
      signatures,
      attestations: configured.attestations ?? [],
      ...(configured.sourceCommit === undefined ? {} : { sourceCommit: configured.sourceCommit.toLowerCase() }),
    };
    target.evidence.verificationMaterials = {
      path: `/assets/${index}/verificationMaterials`, source: 'project-config', status: 'explicit', detail: 'Declared in repository configuration', configPath: mutableAssets[index]!.evidence.os.configPath?.replace(/\.set\..*$/, '.set.verification') ?? 'downloads.rules.verification',
    };
  }
}

function reconcileFinalRequirements(assets: readonly MutableAsset[]): void {
  const invalidUniversal = assets.find((asset) => asset.additionalEvidence.supportedArchitectures !== undefined && (asset.os !== 'macos' || asset.arch !== 'universal'));
  if (invalidUniversal !== undefined) throw new FacadeError('CONFIG_INVALID', 'Configured supported architectures require a macOS Universal asset.');
  const unknownMinimumOs = assets.find((asset) => asset.minimumOsVersion !== undefined && asset.additionalEvidence['requirements.minimumOsVersion'] !== undefined && asset.os === 'unknown');
  if (unknownMinimumOs !== undefined) throw new FacadeError('CONFIG_INVALID', 'A configured minimum OS version requires a known asset operating system.');
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
