import { ReleasePageManifestSchema, type ManifestAsset, type ReleasePageManifest } from '../manifest/release-page-manifest.js';
import { validateManifestSemantics } from '../manifest/semantic-validation.js';
import { conditionStatus, matchMinimumVersion, matchValue } from './conditions.js';
import { EnvironmentSchema, SelectionPolicySchema, type CandidateResult, type ConditionResult, type SelectionEnvironment, type SelectionPolicy, type SelectionResult } from './selection-contract.js';

const kinds = new Map([['installer', 3], ['portable', 2], ['archive', 1], ['artifact', 1]]);
const unknown = (field: string, reason: string): ConditionResult => ({ field, status: 'unknown', reason });

function sourceConditions(evidence: CandidateResult['evidence'], fields: string[], policy: SelectionPolicy, conditions: ConditionResult[]): ConditionResult[] {
  return fields.flatMap((field) => {
    const entry = evidence[field];
    const reason = entry?.status === 'conflict' || entry?.status === 'unknown'
      ? 'Field evidence is unresolved'
      : policy.sources === 'strict' && (!entry || !['github-api', 'project-config'].includes(entry.source))
        ? 'Policy requires GitHub API or project declaration evidence' : undefined;
    if (reason) {
      const target = field === 'supportedArchitectures' ? 'arch' : field.replace(/^when\./, '');
      for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        if (condition && (condition.field === target || (field === 'prerequisites' && condition.field.startsWith('commands.')))) {
          conditions[i] = unknown(condition.field, reason);
        }
      }
      return [unknown(`evidence.${field}`, reason)];
    }
    return [];
  });
}

function assessAsset(asset: ManifestAsset, environment: SelectionEnvironment, policy: SelectionPolicy): CandidateResult {
  const conditions: ConditionResult[] = [matchValue('os', asset.os, environment.os)];
  const missingMetadata: string[] = [];
  const fields = ['os', 'arch', 'kind', 'downloadUrl'];
  if (asset.arch === 'universal') {
    fields.push('supportedArchitectures');
    if (asset.os !== 'macos' || !asset.supportedArchitectures?.length || !environment.arch || environment.arch === 'unknown') {
      conditions.push(unknown('arch', 'Universal requires macOS, explicit supported architectures and a known environment architecture'));
    } else {
      conditions.push({ field: 'arch', status: asset.supportedArchitectures.includes(environment.arch) ? 'match' : 'mismatch', reason: 'Compare the explicitly supported Universal architecture set' });
    }
  } else conditions.push(matchValue('arch', asset.arch ?? 'unknown', environment.arch));
  if (!asset.arch || asset.arch === 'unknown') missingMetadata.push('arch');
  if (asset.os === 'unknown') missingMetadata.push('os');
  if (!asset.format) missingMetadata.push('format');
  if (!kinds.has(asset.kind) || asset.recommendationEligible === false) {
    conditions.push({ field: 'recommendationEligible', status: 'mismatch', reason: 'Auxiliary, unclassified or excluded asset' });
  }
  const requirements = asset.requirements;
  if (asset.os === 'windows' || asset.os === 'macos') {
    if (requirements?.minimumOsVersion) {
      conditions.push(matchMinimumVersion('requirements.minimumOsVersion', requirements.minimumOsVersion, environment.osVersion));
      fields.push('requirements.minimumOsVersion');
    } else missingMetadata.push('requirements.minimumOsVersion');
  } else if (asset.os === 'linux') {
    // Linux version strings lack a distribution model and are never compared.
    missingMetadata.push('linuxDistribution');
    const libc = requirements?.libc;
    if (!libc || libc.family === 'unknown') missingMetadata.push('requirements.libc');
    else {
      fields.push('requirements.libc.family');
      if (libc.family !== 'none') {
        conditions.push(matchValue('requirements.libc.family', libc.family, environment.libc?.family));
        if (libc.minimumVersion) {
          fields.push('requirements.libc.minimumVersion');
          conditions.push(matchMinimumVersion('requirements.libc.minimumVersion', libc.minimumVersion, environment.libc?.version));
        } else missingMetadata.push('requirements.libc.minimumVersion');
      }
    }
  }
  if (asset.priority !== undefined) fields.push('priority');
  // Unresolved classification evidence must not silently retain recommendation eligibility.
  for (const field of ['format', 'recommendationEligible']) {
    if (asset.evidence[field]?.status === 'conflict' || asset.evidence[field]?.status === 'unknown') fields.push(field);
  }
  conditions.push(...sourceConditions(asset.evidence, fields, policy, conditions));
  const exact = asset.arch === environment.arch && environment.arch !== 'unknown' ? 1 : 0;
  // Linux packaging formats have no universal preference without a distribution model.
  const kind = asset.os === 'linux' ? 0 : kinds.get(asset.kind) ?? 0;
  return {
    type: 'artifact', id: asset.id, asset, conditions, missingMetadata, evidence: asset.evidence,
    rank: [asset.priority ?? 0, exact, kind],
    rankingReasons: [`Author priority: ${asset.priority ?? 0}`, exact ? 'Exact architecture' : 'No exact architecture advantage', asset.os === 'linux' ? 'Linux formats require author preference or manual choice' : `Purpose: ${asset.kind}`],
  };
}

function compareRank(left: CandidateResult, right: CandidateResult): number {
  for (let i = 0; i < Math.max(left.rank.length, right.rank.length); i++) {
    const difference = (right.rank[i] ?? 0) - (left.rank[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}
function stableCompare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

function result(candidates: CandidateResult[], conditions: ConditionResult[], diagnostics: string[], blocked = false): SelectionResult {
  const ordered = [...candidates].sort((a, b) => compareRank(a, b) || stableCompare(a.asset?.name ?? a.asset?.label ?? a.id, b.asset?.name ?? b.asset?.label ?? b.id) || stableCompare(a.id, b.id));
  const viable = ordered.filter((candidate) => conditionStatus(candidate.conditions) !== 'mismatch');
  const first = viable[0];
  const tied = first && viable.some((candidate, i) => i > 0 && compareRank(first, candidate) === 0);
  // Unknown candidates may outrank the apparent winner once their inputs are known.
  const unresolved = viable.some((candidate) => conditionStatus(candidate.conditions) === 'unknown');
  const selected = !blocked && !unresolved && !tied ? first : undefined;
  return {
    status: selected ? 'selected' : blocked || viable.length ? 'needs-input' : 'no-match',
    ...(selected ? { selected } : {}), candidates: ordered, conditions,
    missingMetadata: [...new Set(ordered.flatMap((candidate) => candidate.missingMetadata.map((field) => `${candidate.id}.${field}`)))],
    diagnostics,
  };
}

/** Read-only and deterministic: never probes a machine, fetches, downloads or executes. */
export function selectInstallation(manifestInput: unknown, environmentInput: unknown, policyInput: unknown = {}): SelectionResult {
  const parsed = ReleasePageManifestSchema.safeParse(manifestInput);
  const environment = EnvironmentSchema.safeParse(environmentInput);
  const policy = SelectionPolicySchema.safeParse(policyInput);
  if (!parsed.success || !environment.success || !policy.success) return result([], [], ['Invalid manifest, environment or policy'], true);
  const manifest = parsed.data;
  if (manifest.schemaVersion !== 0 && manifest.schemaVersion !== 1) return result([], [], ['Unsupported schemaVersion'], true);
  const errors = validateManifestSemantics(manifest);
  if (errors.length) return result([], [], errors.map((error) => `${error.path}: ${error.message}`), true);
  return selectValidated(manifest, environment.data, policy.data);
}

function selectValidated(manifest: ReleasePageManifest, environment: SelectionEnvironment, policy: SelectionPolicy): SelectionResult {
  const assets = manifest.assets.map((asset) => assessAsset(asset, environment, policy));
  const diagnostics: string[] = [];
  const evaluated: CandidateResult[] = [];
  const conditions: ConditionResult[] = [];
  for (const preference of manifest.installationPreferences ?? []) {
    const when = [matchValue('os', preference.when.os, environment.os)];
    if (preference.when.arch) when.push(matchValue('arch', preference.when.arch, environment.arch));
    if (preference.when.libc && preference.when.os === 'linux') when.push(matchValue('libc', preference.when.libc, environment.libc?.family));
    const whenFields = when.map((condition) => `when.${condition.field}`);
    when.push(...sourceConditions(preference.evidence ?? {}, whenFields, policy, when));
    conditions.push(...when.map((condition) => ({ ...condition, field: `installationPreferences.${preference.id}.${condition.field}` })));
    const status = conditionStatus(when);
    if (status === 'mismatch') continue;
    if (status === 'unknown') return result(assets, conditions, diagnostics, true);
    for (const item of preference.prefer) {
      let candidates: CandidateResult[];
      if (item.type === 'artifacts') {
        candidates = assets.filter((asset) => item.assetIds.includes(asset.id));
        if (!candidates.length) diagnostics.push(`Preference ${preference.id}: empty artifact group removed`);
      } else {
        const method = manifest.installMethods?.find((entry) => entry.id === item.methodId);
        // Semantic validation guarantees references; keep this guard for future contract changes.
        if (!method) return result(assets, conditions, ['Missing install method'], true);
        const checks = method.platform === 'all' ? [] : [matchValue('platform', method.platform, environment.os)];
        checks.push(...method.prerequisites.map((requirement) => matchValue(`commands.${requirement['command-available']}`, 'available', environment.commands?.[requirement['command-available']])));
        if (policy.requireVersionBinding && method.versionBinding !== 'selected-release') checks.push(unknown('versionBinding', 'Command is not bound to this release'));
        checks.push(...sourceConditions(method.evidence ?? {}, ['platform', 'command', 'prerequisites', 'versionBinding'], policy, checks));
        candidates = [{ type: 'method', id: method.id, conditions: checks, evidence: method.evidence ?? {}, missingMetadata: method.versionBinding === 'unverified' ? ['versionBinding'] : [], versionBinding: method.versionBinding, rank: [], rankingReasons: [`Author preference: ${preference.id}`] }];
      }
      evaluated.push(...candidates);
      const viable = candidates.filter((candidate) => conditionStatus(candidate.conditions) !== 'mismatch');
      if (viable.length) {
        const choice = result(candidates, conditions, diagnostics);
        const previous = evaluated.slice(0, evaluated.length - candidates.length);
        return { ...choice, candidates: [...previous, ...choice.candidates], missingMetadata: [...new Set([...previous.flatMap((candidate) => candidate.missingMetadata.map((field) => `${candidate.id}.${field}`)), ...choice.missingMetadata])] };
      }
    }
    break; // First matching rule owns the fallback; later rules are not evaluated.
  }
  return result([...evaluated.filter((candidate) => candidate.type === 'method'), ...assets], conditions, diagnostics);
}
