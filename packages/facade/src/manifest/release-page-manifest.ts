import { z } from 'zod';
import { ARCHITECTURES, ASSET_FORMATS, ASSET_KINDS, LIBC_FAMILIES, OPERATING_SYSTEMS } from '../classifier/asset-classifier.js';

export const EvidenceSchema = z.object({
  source: z.enum(['github-api', 'project-config', 'filename-rule', 'derived']),
  status: z.enum(['explicit', 'inferred', 'unknown', 'conflict']),
  detail: z.string().min(1),
  ruleId: z.string().min(1).optional(),
  configPath: z.string().min(1).optional(),
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
  requirements: z.object({ libc: z.object({ family: z.enum(LIBC_FAMILIES) }).strict() }).strict(),
  recommendationEligible: z.boolean(),
  signatureFor: z.string().min(1).optional(),
  evidence: z.record(z.string().min(1), EvidenceSchema),
}).strict();
const ReleasePageManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  productName: z.string().min(1), releaseTag: z.string().min(1), assets: z.array(ManifestAssetSchema),
}).strict();
export const ReleasePageManifestSchema = z.preprocess(normalizeLegacyManifest, ReleasePageManifestV1Schema);
export type ManifestAsset = z.infer<typeof ManifestAssetSchema>;
export type ReleasePageManifest = z.infer<typeof ReleasePageManifestSchema>;

function normalizeLegacyManifest(input: unknown): unknown {
  if (!isRecord(input) || input.schemaVersion !== 0 || !Array.isArray(input.assets)) return input;
  return { ...input, schemaVersion: 1, assets: input.assets.map(normalizeLegacyAsset) };
}

function normalizeLegacyAsset(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const label = typeof input.label === 'string' ? input.label : 'Download';
  const kind = input.kind === 'artifact' ? 'archive' : input.kind === 'other' ? 'unknown' : input.kind;
  const evidence = isRecord(input.evidence)
    ? Object.fromEntries(Object.entries(input.evidence).map(([field, value]) => [field, normalizeLegacyEvidence(value)]))
    : input.evidence;
  return {
    ...input,
    name: typeof input.name === 'string' ? input.name : label,
    size: typeof input.size === 'number' ? input.size : 0,
    arch: typeof input.arch === 'string' ? input.arch : 'unknown',
    format: typeof input.format === 'string' ? input.format : 'other',
    kind,
    priority: typeof input.priority === 'number' ? input.priority : 0,
    requirements: isRecord(input.requirements) ? input.requirements : { libc: { family: 'unknown' } },
    recommendationEligible: typeof input.recommendationEligible === 'boolean' ? input.recommendationEligible : false,
    evidence,
  };
}

function normalizeLegacyEvidence(input: unknown): unknown {
  if (!isRecord(input) || typeof input.source !== 'string') return input;
  return { ...input, status: typeof input.status === 'string' ? input.status : input.source === 'project-config' ? 'explicit' : 'inferred' };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
