import { z } from 'zod';
import { ArchitectureSchema, EvidenceSchema, InstallMethodSchema, type ManifestAsset } from '../manifest/release-page-manifest.js';

export const EnvironmentSchema = z.object({
  os: z.enum(['macos', 'windows', 'linux', 'unknown']).optional(),
  arch: ArchitectureSchema.exclude(['universal']).optional(),
  osVersion: z.string().optional(),
  libc: z.object({ family: z.enum(['glibc', 'musl', 'none', 'unknown']), version: z.string().optional() }).strict().optional(),
  commands: z.record(z.string(), z.enum(['available', 'unavailable', 'unknown'])).optional(),
}).strict();
export const SelectionPolicySchema = z.object({
  sources: z.enum(['default', 'strict']).optional(),
  requireVersionBinding: z.boolean().optional(),
}).strict();
export type SelectionEnvironment = z.infer<typeof EnvironmentSchema>;
export type SelectionPolicy = z.infer<typeof SelectionPolicySchema>;
export type ConditionResult = { field: string; status: 'match' | 'mismatch' | 'unknown'; reason: string };
export type CandidateResult = {
  type: 'artifact' | 'method'; id: string;
  conditions: ConditionResult[]; missingMetadata: string[];
  evidence: Record<string, z.infer<typeof EvidenceSchema>>;
  rank: number[]; rankingReasons: string[];
  versionBinding?: z.infer<typeof InstallMethodSchema>['versionBinding'];
  asset?: ManifestAsset;
};
export type SelectionResult = {
  status: 'selected' | 'needs-input' | 'no-match';
  selected?: CandidateResult;
  candidates: CandidateResult[];
  conditions: ConditionResult[];
  missingMetadata: string[];
  diagnostics: string[];
};
