import { z } from 'zod';

export const ManifestAssetSchema = z.object({ id: z.string().min(1), label: z.string().min(1), downloadUrl: z.url() });
export const ReleasePageManifestSchema = z.object({ schemaVersion: z.number().int().nonnegative(), productName: z.string().min(1), releaseTag: z.string().min(1), assets: z.array(ManifestAssetSchema) });
export type ManifestAsset = z.infer<typeof ManifestAssetSchema>;
export type ReleasePageManifest = z.infer<typeof ReleasePageManifestSchema>;
