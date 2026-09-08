import { z } from 'zod';

export const EvidenceSchema = z.object({ source: z.enum(['github-api', 'project-config', 'filename-rule']), detail: z.string().min(1) });
export const ManifestAssetSchema = z.object({
  id: z.string().min(1), label: z.string().min(1), downloadUrl: z.httpUrl(),
  os: z.enum(['macos', 'windows', 'linux', 'unknown']),
  kind: z.enum(['artifact', 'checksum', 'signature', 'other']),
  signatureFor: z.string().min(1).optional(),
  evidence: z.record(z.string().min(1), EvidenceSchema),
});
export const ReleasePageManifestSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  productName: z.string().min(1), releaseTag: z.string().min(1), assets: z.array(ManifestAssetSchema),
});
export type ManifestAsset = z.infer<typeof ManifestAssetSchema>;
export type ReleasePageManifest = z.infer<typeof ReleasePageManifestSchema>;
