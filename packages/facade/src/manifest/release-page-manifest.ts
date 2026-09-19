import { z } from 'zod';
import { ARCHITECTURES, ASSET_FORMATS, ASSET_KINDS, LIBC_FAMILIES, OPERATING_SYSTEMS } from '../classifier/asset-classifier.js';

export const EvidenceSchema = z.object({
  path: z.string().regex(/^\/(?:[^~/]|~[01])*(?:\/(?:[^~/]|~[01])*)*$/).optional(),
  source: z.enum(['github-api', 'fixture', 'project-config', 'filename-rule', 'derived', 'unknown']),
  status: z.enum(['explicit', 'provided', 'inferred', 'unknown', 'conflict']).optional(),
  detail: z.string().min(1),
  ruleId: z.string().min(1).optional(),
  configPath: z.string().min(1).optional(),
  derivedFrom: z.array(z.string().min(1)).optional(),
}).strict();
export const ArchitectureSchema = z.enum(ARCHITECTURES);
const PreferenceArchitectureSchema = ArchitectureSchema.exclude(['universal', 'unknown']);
export const NumericVersionSchema = z.string().regex(/^\d+(?:\.\d+)*$/);
export const RequirementsSchema = z.object({
  minimumOsVersion: NumericVersionSchema.optional(),
  libc: z.object({ family: z.enum(LIBC_FAMILIES), minimumVersion: NumericVersionSchema.optional() }).strict(),
}).strict();
export const DigestSchema = z.object({
  algorithm: z.literal('sha256'),
  value: z.string().regex(/^[a-fA-F0-9]{64}$/),
}).strict();
export const VerificationMaterialsSchema = z.object({
  signatures: z.array(z.object({
    assetId: z.string().min(1),
    scheme: z.enum(['openpgp', 'minisign', 'other']),
  }).strict()),
  attestations: z.array(z.object({
    kind: z.literal('github-attestation'),
    repository: z.string().regex(/^[^/]+\/[^/]+$/),
  }).strict()),
  sourceCommit: z.string().regex(/^[a-fA-F0-9]{40}$/).optional(),
}).strict();
export const InstallMethodSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(['macos', 'windows', 'linux', 'all', 'unknown']),
  name: z.string().min(1),
  command: z.string().min(1),
  prerequisites: z.array(z.object({ 'command-available': z.string().min(1) }).strict()),
  versionBinding: z.enum(['selected-release', 'unverified']).default('unverified'),
  evidence: z.record(z.string(), EvidenceSchema).optional(),
}).strict();
export const InstallationPreferenceSchema = z.object({
  id: z.string().min(1),
  when: z.object({ os: z.enum(['macos', 'windows', 'linux']), arch: PreferenceArchitectureSchema.optional(), libc: z.enum(['glibc', 'musl', 'none']).optional() }).strict(),
  prefer: z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('method'), methodId: z.string().min(1) }).strict(),
    z.object({ type: z.literal('artifacts'), assetIds: z.array(z.string().min(1)) }).strict(),
  ])),
  evidence: z.record(z.string(), EvidenceSchema).optional(),
}).strict();
export const ManifestAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  downloadUrl: z.httpUrl(),
  size: z.number().int().nonnegative(),
  os: z.enum(OPERATING_SYSTEMS),
  arch: z.enum(ARCHITECTURES),
  format: z.enum(ASSET_FORMATS),
  kind: z.enum(ASSET_KINDS),
  priority: z.number().int(),
  supportedArchitectures: z.array(z.enum(['arm64', 'x64', 'x86'])).min(1).optional(),
  requirements: RequirementsSchema,
  recommendationEligible: z.boolean(),
  digest: DigestSchema.optional(),
  verificationMaterials: VerificationMaterialsSchema,
  signatureFor: z.string().min(1).optional(),
  evidence: z.record(z.string().min(1), EvidenceSchema),
}).strict();
export const ReleasePageManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  productName: z.string().min(1), releaseTag: z.string().min(1), assets: z.array(ManifestAssetSchema),
  source: z.object({
    provider: z.enum(['github', 'fixture', 'unknown']),
    repository: z.string().regex(/^[^/]+\/[^/]+$/),
    repositoryUrl: z.httpUrl(),
  }).strict(),
  release: z.object({
    id: z.string().min(1),
    tag: z.string().min(1),
    name: z.string().min(1),
    prerelease: z.boolean(),
    channel: z.enum(['stable', 'prerelease', 'beta', 'nightly']),
  }).strict(),
  evidence: z.array(EvidenceSchema),
  installMethods: z.array(InstallMethodSchema).optional(),
  installationPreferences: z.array(InstallationPreferenceSchema).optional(),
}).strict();
export const ReleasePageManifestSchema = z.preprocess(normalizeLegacyManifest, ReleasePageManifestV1Schema);
export type ManifestAsset = z.infer<typeof ManifestAssetSchema>;
export type ReleasePageManifest = z.infer<typeof ReleasePageManifestSchema>;
export type ManifestEvidence = z.infer<typeof EvidenceSchema>;
export type VerificationMaterials = z.infer<typeof VerificationMaterialsSchema>;

function normalizeLegacyManifest(input: unknown): unknown {
  if (!isRecord(input) || input.schemaVersion !== 0 || !Array.isArray(input.assets)) return input;
  const releaseTag = typeof input.releaseTag === 'string' ? input.releaseTag : 'unknown';
  const productName = typeof input.productName === 'string' ? input.productName : releaseTag;
  return {
    ...input,
    schemaVersion: 1,
    source: { provider: 'unknown', repository: 'legacy/unknown', repositoryUrl: 'https://example.invalid/legacy/unknown' },
    release: { id: releaseTag, tag: releaseTag, name: productName, prerelease: false, channel: 'stable' },
    evidence: legacyManifestEvidence(),
    assets: input.assets.map((asset, index) => normalizeLegacyAsset(asset, index)),
  };
}

function normalizeLegacyAsset(input: unknown, index: number): unknown {
  if (!isRecord(input)) return input;
  const label = typeof input.label === 'string' ? input.label : 'Download';
  const kind = input.kind === 'artifact' ? 'archive' : input.kind === 'other' ? 'unknown' : input.kind;
  const suppliedEvidence = isRecord(input.evidence)
    ? Object.fromEntries(Object.entries(input.evidence).map(([field, value]) => [field, normalizeLegacyEvidence(value, `/assets/${index}/${field === 'libc' ? 'requirements/libc/family' : field.replaceAll('.', '/')}`)]))
    : {};
  const basePath = `/assets/${index}`;
  const requiredFields = [
    'id', 'name', 'label', 'downloadUrl', 'size', 'os', 'arch', 'format', 'kind', 'priority', 'requirements', 'libc', 'recommendationEligible', 'verificationMaterials',
    ...(typeof input.signatureFor === 'string' ? ['signatureFor'] : []),
  ];
  const evidence = Object.fromEntries(requiredFields.map((field) => [
    field,
    suppliedEvidence[field] ?? (field === 'recommendationEligible'
      ? { path: `${basePath}/recommendationEligible`, source: 'derived', status: 'inferred', detail: 'Legacy assets are not recommendation eligible by default' }
      : legacyEvidence(`${basePath}/${field === 'libc' ? 'requirements/libc/family' : field}`)),
  ]));
  return {
    ...input,
    name: typeof input.name === 'string' ? input.name : label,
    size: typeof input.size === 'number' ? input.size : 0,
    arch: typeof input.arch === 'string' ? input.arch : 'unknown',
    format: typeof input.format === 'string' ? input.format : 'other',
    kind,
    priority: typeof input.priority === 'number' ? input.priority : 0,
    requirements: normalizeLegacyRequirements(input.requirements),
    recommendationEligible: typeof input.recommendationEligible === 'boolean' ? input.recommendationEligible : false,
    verificationMaterials: { signatures: [], attestations: [] },
    evidence: { ...evidence, ...suppliedEvidence },
  };
}

function normalizeLegacyRequirements(input: unknown): unknown {
  if (!isRecord(input)) return { libc: { family: 'unknown' } };
  return { ...input, libc: isRecord(input.libc) ? input.libc : { family: 'unknown' } };
}

function normalizeLegacyEvidence(input: unknown, path: string): unknown {
  if (!isRecord(input) || typeof input.source !== 'string') return input;
  return { ...input, path, status: typeof input.status === 'string' ? input.status : input.source === 'project-config' ? 'explicit' : 'inferred' };
}

function legacyEvidence(path: string) {
  return { path, source: 'unknown' as const, status: 'unknown' as const, detail: 'Unavailable in the legacy manifest protocol' };
}

function legacyManifestEvidence() {
  return ['/source/repository', '/source/repositoryUrl', '/release/id', '/release/tag', '/release/name', '/release/prerelease', '/release/channel']
    .map((path) => legacyEvidence(path));
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
