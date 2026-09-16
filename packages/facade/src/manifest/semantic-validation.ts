import type { ManifestAsset, ReleasePageManifest } from './release-page-manifest.js';

const EVIDENCE_FIELDS = new Set<string>(['id', 'label', 'name', 'size', 'downloadUrl', 'os', 'arch', 'format', 'kind', 'priority', 'requirements', 'libc', 'supportedArchitectures', 'recommendationEligible', 'signatureFor', 'digest', 'verificationMaterials', 'requirements.minimumOsVersion', 'requirements.libc.family', 'requirements.libc.minimumVersion']);
const RECOMMENDABLE_KINDS = new Set(['installer', 'portable', 'archive']);
const CLASSIFICATION_EVIDENCE_FIELDS = ['os', 'arch', 'format', 'kind', 'requirements', 'libc', 'requirements.libc.family'] as const;
function fieldValue(value: unknown, path: string): unknown {
  if (path === 'libc' && typeof value === 'object' && value !== null) path = 'requirements.libc';
  for (const part of path.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = Object.getOwnPropertyDescriptor(value, part)?.value;
  }
  return value;
}
export type ValidationDiagnostic = { path: string; message: string };
export function validateManifestSemantics(manifest: ReleasePageManifest): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  if (manifest.releaseTag !== manifest.release.tag) diagnostics.push({ path: 'releaseTag', message: 'releaseTag must match release.tag' });
  if (manifest.release.channel === 'stable' && manifest.release.prerelease) diagnostics.push({ path: 'release.channel', message: 'a prerelease cannot use the stable channel' });
  const ids = new Set<string>(); const urls = new Set<string>(); const assets = new Map<string, ManifestAsset>();
  for (const [assetIndex, asset] of manifest.assets.entries()) {
    if (ids.has(asset.id)) diagnostics.push({ path: `assets.${asset.id}`, message: 'asset IDs must be unique' });
    ids.add(asset.id); assets.set(asset.id, asset);
    if (urls.has(asset.downloadUrl)) diagnostics.push({ path: `assets.${asset.id}.downloadUrl`, message: 'asset download URLs must be unique' });
    urls.add(asset.downloadUrl);
    if (asset.kind !== 'signature' && asset.signatureFor !== undefined) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'only signature assets may declare signatureFor' });
    if (asset.os !== 'linux' && asset.requirements.libc.family !== 'unknown') diagnostics.push({ path: `assets.${asset.id}.requirements.libc.family`, message: 'non-Linux assets must keep libc unknown' });
    const hasClassificationConflict = CLASSIFICATION_EVIDENCE_FIELDS.some((field) => asset.evidence[field]?.status === 'conflict');
    const invalidUniversal = asset.arch === 'universal' && (asset.os !== 'macos' || !asset.supportedArchitectures?.length);
    if (asset.recommendationEligible && (asset.os === 'unknown' || asset.arch === 'unknown' || invalidUniversal || !RECOMMENDABLE_KINDS.has(asset.kind) || hasClassificationConflict)) {
      diagnostics.push({ path: `assets.${asset.id}.recommendationEligible`, message: 'recommendation-eligible assets require known OS and architecture, an installable kind, and no unresolved classification conflict' });
    }
    for (const field of Object.keys(asset.evidence)) {
      if (!EVIDENCE_FIELDS.has(field)) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a supported asset field' });
      else if (fieldValue(asset, field) === undefined) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a populated asset field' });
      else if (asset.evidence[field]?.path !== `/assets/${assetIndex}/${field === 'libc' ? 'requirements/libc/family' : field.replaceAll('.', '/')}`) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}.path`, message: 'asset evidence path must reference its final manifest field' });
    }
    for (const signature of asset.verificationMaterials.signatures) {
      const referenced = assets.get(signature.assetId) ?? manifest.assets.find((candidate) => candidate.id === signature.assetId);
      if (referenced === undefined || referenced.kind !== 'signature') diagnostics.push({ path: `assets.${asset.id}.verificationMaterials.signatures`, message: 'signature material must reference an existing signature asset' });
    }
  }
  for (const asset of manifest.assets) if (asset.signatureFor !== undefined) {
    const target = assets.get(asset.signatureFor);
    if (target === undefined || !['installer', 'portable', 'archive'].includes(target.kind)) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'signatureFor must reference an existing artifact' });
  }
  for (const asset of manifest.assets) {
    if (asset.supportedArchitectures && (asset.arch !== 'universal' || asset.os !== 'macos')) diagnostics.push({ path: `assets.${asset.id}.supportedArchitectures`, message: 'supportedArchitectures requires a macOS Universal asset' });
    const libc = asset.requirements?.libc;
    if (libc?.minimumVersion && (libc.family === 'none' || libc.family === 'unknown')) diagnostics.push({ path: `assets.${asset.id}.requirements.libc.minimumVersion`, message: 'minimum libc version requires glibc or musl' });
  }
  for (const [index, evidence] of manifest.evidence.entries()) {
    if (evidence.path === undefined || resolveJsonPointer(manifest, evidence.path) === undefined) diagnostics.push({ path: `evidence.${index}.path`, message: 'evidence path must resolve in the final manifest' });
    for (const derivedPath of evidence.derivedFrom ?? []) if (resolveJsonPointer(manifest, derivedPath) === undefined) diagnostics.push({ path: `evidence.${index}.derivedFrom`, message: 'derived evidence must reference populated manifest fields' });
  }
  const methodIds = new Set<string>();
  for (const method of manifest.installMethods ?? []) {
    if (methodIds.has(method.id)) diagnostics.push({ path: `installMethods.${method.id}`, message: 'method IDs must be unique' });
    methodIds.add(method.id);
    for (const field of Object.keys(method.evidence ?? {})) if (!['platform', 'command', 'prerequisites', 'versionBinding'].includes(field)) diagnostics.push({ path: `installMethods.${method.id}.evidence.${field}`, message: 'unsupported method evidence field' });
  }
  const preferenceIds = new Set<string>();
  for (const preference of manifest.installationPreferences ?? []) {
    if (preferenceIds.has(preference.id)) diagnostics.push({ path: `installationPreferences.${preference.id}`, message: 'preference IDs must be unique' });
    preferenceIds.add(preference.id);
    if (preference.when.libc !== undefined && preference.when.os !== 'linux') diagnostics.push({ path: `installationPreferences.${preference.id}.when.libc`, message: 'libc preference conditions require Linux' });
    for (const field of Object.keys(preference.evidence ?? {})) if (!['when.os', 'when.arch', 'when.libc'].includes(field) || fieldValue(preference, field) === undefined) diagnostics.push({ path: `installationPreferences.${preference.id}.evidence.${field}`, message: 'evidence must reference a populated preference condition' });
    for (const item of preference.prefer) {
      if (item.type === 'method' && !methodIds.has(item.methodId)) diagnostics.push({ path: `installationPreferences.${preference.id}`, message: 'preference must reference an existing method' });
      if (item.type === 'artifacts' && item.assetIds.some((id) => !assets.has(id))) diagnostics.push({ path: `installationPreferences.${preference.id}`, message: 'preference must reference existing assets' });
    }
  }
  return diagnostics;
}

function resolveJsonPointer(root: unknown, pointer: string): unknown {
  let value = root;
  for (const encoded of pointer.slice(1).split('/')) {
    const part = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (Array.isArray(value)) {
      if (!/^\d+$/.test(part)) return undefined;
      value = value[Number(part)];
    } else if (typeof value === 'object' && value !== null) value = Object.getOwnPropertyDescriptor(value, part)?.value;
    else return undefined;
    if (value === undefined) return undefined;
  }
  return value;
}
