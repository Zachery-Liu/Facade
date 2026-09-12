import { z } from 'zod';
import { ARCHITECTURES, ASSET_FORMATS, ASSET_KINDS, LIBC_FAMILIES, OPERATING_SYSTEMS } from '../classifier/asset-classifier.js';
import { isValidFullNameGlob } from './full-name-glob.js';

const ReleaseSelectionSchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('github-latest') }).strict(),
  z.object({ strategy: z.literal('tag'), tag: z.string().min(1) }).strict(),
]);

const ConfigLibcFamilySchema = z.enum(LIBC_FAMILIES);
const RuleRequirementsSchema = z.object({
  libc: z.object({ family: ConfigLibcFamilySchema }).strict(),
}).strict();

const DownloadRuleSetSchema = z.object({
  os: z.enum(OPERATING_SYSTEMS).optional(),
  arch: z.enum(ARCHITECTURES).optional(),
  format: z.enum(ASSET_FORMATS).optional(),
  kind: z.enum(ASSET_KINDS).optional(),
  label: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  requirements: RuleRequirementsSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'set must override at least one field' });

export const DownloadRuleSchema = z.object({
  match: z.string().min(1).refine(isValidFullNameGlob, { message: 'match must be a valid full-name glob' }),
  tag: z.string().min(1).optional(),
  exclude: z.boolean().optional(),
  set: DownloadRuleSetSchema.optional(),
}).strict().superRefine((rule, context) => {
  if (rule.exclude === undefined && rule.set === undefined) {
    context.addIssue({ code: 'custom', message: 'a download rule must provide exclude and/or set' });
  }
  const family = rule.set?.requirements?.libc.family;
  if (rule.set?.os !== undefined && rule.set.os !== 'linux' && family !== undefined && family !== 'unknown') {
    context.addIssue({ code: 'custom', path: ['set', 'requirements', 'libc', 'family'], message: 'a non-Linux rule cannot declare a libc requirement' });
  }
});

export const DownloadsConfigSchema = z.object({
  auto: z.boolean().default(true),
  rules: z.array(DownloadRuleSchema).default([]),
}).strict();

export type DownloadRule = z.infer<typeof DownloadRuleSchema>;
export type DownloadsConfig = z.infer<typeof DownloadsConfigSchema>;

export const FacadeConfigSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  release: ReleaseSelectionSchema,
  downloads: DownloadsConfigSchema.optional(),
}).strict();
export type FacadeConfig = z.infer<typeof FacadeConfigSchema>;

export const FacadeConfigInputSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/).optional(),
  release: ReleaseSelectionSchema.optional(),
  downloads: DownloadsConfigSchema.optional(),
}).strict();
export type FacadeConfigInput = z.infer<typeof FacadeConfigInputSchema>;
