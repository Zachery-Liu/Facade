import { z } from 'zod';
import { ARCHITECTURES, ASSET_FORMATS, ASSET_KINDS, LIBC_FAMILIES, OPERATING_SYSTEMS } from '../classifier/asset-classifier.js';
import { isValidFullNameGlob } from './full-name-glob.js';

const ReleaseChannelSchema = z.enum(['stable', 'prerelease', 'beta', 'nightly']);
const SafeBrandUrlSchema = z.httpUrl().refine((value) => { const url = new URL(value); return !url.username && !url.password; }, { message: 'brand link must not contain credentials' });
const ReleaseSelectionSchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('github-latest'), channel: ReleaseChannelSchema.optional() }).strict(),
  z.object({ strategy: z.literal('tag'), tag: z.string().min(1), channel: ReleaseChannelSchema.optional() }).strict(),
]);

const ConfigLibcFamilySchema = z.enum(LIBC_FAMILIES);
const NumericVersionSchema = z.string().regex(/^\d+(?:\.\d+)*$/);
const ConcreteArchitectureSchema = z.enum(['arm64', 'x64', 'x86']);
const ConfigLibcSchema = z.object({
  family: ConfigLibcFamilySchema,
  minimumVersion: NumericVersionSchema.optional(),
}).strict().superRefine((libc, context) => {
  if (libc.minimumVersion !== undefined && (libc.family === 'none' || libc.family === 'unknown')) {
    context.addIssue({ code: 'custom', path: ['minimumVersion'], message: 'minimumVersion requires glibc or musl' });
  }
});
const RuleRequirementsSchema = z.object({
  minimumOsVersion: NumericVersionSchema.optional(),
  libc: ConfigLibcSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'requirements must declare at least one field' });

export const VerificationConfigSchema = z.object({
  signatures: z.array(z.object({
    assetMatch: z.string().min(1).refine(isValidFullNameGlob, { message: 'assetMatch must be a valid full-name glob' }),
    scheme: z.enum(['openpgp', 'minisign', 'other']),
  }).strict()).optional(),
  attestations: z.array(z.object({
    kind: z.literal('github-attestation'),
    repository: z.string().regex(/^[^/]+\/[^/]+$/),
  }).strict()).optional(),
  sourceCommit: z.string().regex(/^[a-fA-F0-9]{40}$/).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'verification must declare at least one field' });
export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;

const DownloadRuleSetSchema = z.object({
  os: z.enum(OPERATING_SYSTEMS).optional(),
  arch: z.enum(ARCHITECTURES).optional(),
  format: z.enum(ASSET_FORMATS).optional(),
  kind: z.enum(ASSET_KINDS).optional(),
  label: z.string().min(1).optional(),
  priority: z.number().int().optional(),
  supportedArchitectures: z.array(ConcreteArchitectureSchema).min(1).refine((values) => new Set(values).size === values.length, { message: 'supportedArchitectures must not contain duplicates' }).optional(),
  requirements: RuleRequirementsSchema.optional(),
  verification: VerificationConfigSchema.optional(),
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
  if (rule.set?.verification?.sourceCommit !== undefined && rule.tag === undefined) {
    context.addIssue({ code: 'custom', path: ['set', 'verification', 'sourceCommit'], message: 'sourceCommit requires an exact tag rule' });
  }
  const family = rule.set?.requirements?.libc?.family;
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

export const InstallMethodConfigSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(['macos', 'windows', 'linux', 'all', 'unknown']),
  name: z.string().min(1),
  command: z.string().min(1),
  prerequisites: z.array(z.object({ 'command-available': z.string().min(1) }).strict()).optional(),
  versionBinding: z.enum(['selected-release', 'unverified']).optional(),
}).strict();

const InstallationPreferenceConfigSchema = z.object({
  id: z.string().min(1),
  when: z.object({
    os: z.enum(['macos', 'windows', 'linux']),
    arch: ConcreteArchitectureSchema.optional(),
    libc: z.enum(['glibc', 'musl', 'none']).optional(),
  }).strict(),
  prefer: z.array(z.union([
    z.object({ method: z.string().min(1) }).strict(),
    z.object({ assetMatch: z.string().min(1).refine(isValidFullNameGlob, { message: 'assetMatch must be a valid full-name glob' }) }).strict(),
  ])),
}).strict().superRefine((preference, context) => {
  if (preference.when.libc !== undefined && preference.when.os !== 'linux') {
    context.addIssue({ code: 'custom', path: ['when', 'libc'], message: 'libc preference conditions require Linux' });
  }
});

export type InstallMethodConfig = z.infer<typeof InstallMethodConfigSchema>;
export type InstallationPreferenceConfig = z.infer<typeof InstallationPreferenceConfigSchema>;

const AuthoringConfigShape = {
  product: z.object({ name: z.string().min(1).optional(), description: z.string().min(1).optional(), icon: z.string().min(1).optional(), screenshot: z.object({ src: z.string().min(1), alt: z.string().min(1) }).strict().optional() }).strict().optional(),
  theme: z.object({ name: z.literal('product').default('product'), appearance: z.enum(['light', 'dark', 'auto']).default('auto'), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#5265d8') }).strict().optional(),
  links: z.array(z.object({ label: z.string().min(1), url: SafeBrandUrlSchema }).strict()).optional(),
  downloads: DownloadsConfigSchema.optional(),
  install: z.array(InstallMethodConfigSchema).optional(),
  installationPreferences: z.array(InstallationPreferenceConfigSchema).optional(),
};

function validateAuthoringReferences(
  config: { install?: readonly InstallMethodConfig[] | undefined; installationPreferences?: readonly InstallationPreferenceConfig[] | undefined },
  context: z.RefinementCtx,
): void {
  const methodIds = new Set<string>();
  for (const [index, method] of (config.install ?? []).entries()) {
    if (methodIds.has(method.id)) context.addIssue({ code: 'custom', path: ['install', index, 'id'], message: 'install method IDs must be unique' });
    methodIds.add(method.id);
  }
  const preferenceIds = new Set<string>();
  for (const [index, preference] of (config.installationPreferences ?? []).entries()) {
    if (preferenceIds.has(preference.id)) context.addIssue({ code: 'custom', path: ['installationPreferences', index, 'id'], message: 'installation preference IDs must be unique' });
    preferenceIds.add(preference.id);
    for (const [preferIndex, item] of preference.prefer.entries()) {
      if ('method' in item && !methodIds.has(item.method)) {
        context.addIssue({ code: 'custom', path: ['installationPreferences', index, 'prefer', preferIndex, 'method'], message: 'method must reference an existing install method' });
      }
    }
  }
}

export const FacadeConfigSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  release: ReleaseSelectionSchema,
  ...AuthoringConfigShape,
}).strict().superRefine(validateAuthoringReferences);
export type FacadeConfig = z.infer<typeof FacadeConfigSchema>;

export const FacadeConfigInputSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/).optional(),
  release: ReleaseSelectionSchema.optional(),
  ...AuthoringConfigShape,
}).strict().superRefine(validateAuthoringReferences);
export type FacadeConfigInput = z.infer<typeof FacadeConfigInputSchema>;
