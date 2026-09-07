import { z } from 'zod';

export const RepositoryMetadataSchema = z.object({
  fullName: z.string().regex(/^[^/]+\/[^/]+$/),
  htmlUrl: z.httpUrl(),
}).strict();

export const RawAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  downloadUrl: z.httpUrl(),
  size: z.number().int().nonnegative(),
}).strict();

export const RawReleaseSchema = z.object({
  id: z.string().min(1),
  tagName: z.string().min(1),
  name: z.string().min(1),
  draft: z.boolean(),
  prerelease: z.boolean(),
}).strict();

export const RepositorySnapshotSchema = z.object({
  repository: RepositoryMetadataSchema,
  release: RawReleaseSchema,
  assets: z.array(RawAssetSchema),
}).strict();

export type RepositoryMetadata = z.infer<typeof RepositoryMetadataSchema>;
export type RawAsset = z.infer<typeof RawAssetSchema>;
export type RawRelease = z.infer<typeof RawReleaseSchema>;
export type RepositorySnapshot = z.infer<typeof RepositorySnapshotSchema>;

export interface ReleaseSource {
  getRepository(): Promise<RepositoryMetadata>;
  getLatestRelease(): Promise<RawRelease>;
  getReleaseByTag(tag: string): Promise<RawRelease>;
  getReleaseAssets(releaseId: string): Promise<RawAsset[]>;
}
