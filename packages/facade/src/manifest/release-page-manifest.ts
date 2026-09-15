import { z } from 'zod';

export const EvidenceSchema = z.object({
  source: z.enum(['github-api', 'project-config', 'filename-rule', 'derived']), detail: z.string().min(1),
  status: z.enum(['explicit', 'provided', 'inferred', 'unknown', 'conflict']).optional(),
  ruleId: z.string().min(1).optional(), configPath: z.string().min(1).optional(), derivedFrom: z.array(z.string().min(1)).optional(),
});
export const ArchitectureSchema = z.enum(['arm64', 'x64', 'x86', 'universal', 'unknown']);
const PreferenceArchitectureSchema = ArchitectureSchema.exclude(['universal', 'unknown']);
export const NumericVersionSchema = z.string().regex(/^\d+(?:\.\d+)*$/);
export const RequirementsSchema = z.object({
  minimumOsVersion: NumericVersionSchema.optional(),
  libc: z.object({ family: z.enum(['glibc', 'musl', 'none', 'unknown']), minimumVersion: NumericVersionSchema.optional() }).strict().optional(),
}).strict();
export const InstallMethodSchema = z.object({
  id: z.string().min(1), platform: z.enum(['macos', 'windows', 'linux', 'all', 'unknown']),
  name: z.string().min(1), command: z.string().min(1),
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
  id: z.string().min(1), label: z.string().min(1), downloadUrl: z.httpUrl(),
  os: z.enum(['macos', 'windows', 'linux', 'unknown']),
  kind: z.enum(['artifact', 'installer', 'portable', 'archive', 'checksum', 'signature', 'debug', 'update', 'unknown', 'other']),
  name: z.string().min(1).optional(), size: z.number().int().nonnegative().optional(),
  arch: ArchitectureSchema.optional(), supportedArchitectures: z.array(z.enum(['arm64', 'x64', 'x86'])).min(1).optional(),
  format: z.string().min(1).optional(), priority: z.number().int().optional(),
  requirements: RequirementsSchema.optional(), recommendationEligible: z.boolean().optional(),
  signatureFor: z.string().min(1).optional(),
  evidence: z.record(z.string().min(1), EvidenceSchema),
});
export const ReleasePageManifestSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  productName: z.string().min(1), releaseTag: z.string().min(1), assets: z.array(ManifestAssetSchema),
  installMethods: z.array(InstallMethodSchema).optional(), installationPreferences: z.array(InstallationPreferenceSchema).optional(),
});
export type ManifestAsset = z.infer<typeof ManifestAssetSchema>;
export type ReleasePageManifest = z.infer<typeof ReleasePageManifestSchema>;
