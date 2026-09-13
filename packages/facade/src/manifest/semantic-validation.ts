import type { ManifestAsset, ReleasePageManifest } from './release-page-manifest.js';

const EVIDENCE_FIELDS = new Set<string>(['id', 'label', 'name', 'size', 'downloadUrl', 'os', 'arch', 'format', 'kind', 'priority', 'supportedArchitectures', 'recommendationEligible', 'signatureFor', 'requirements.minimumOsVersion', 'requirements.libc.family', 'requirements.libc.minimumVersion']);
function fieldValue(value: unknown, path: string): unknown {
  for (const part of path.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = Object.getOwnPropertyDescriptor(value, part)?.value;
  }
  return value;
}
export type ValidationDiagnostic = { path: string; message: string };
export function validateManifestSemantics(manifest: ReleasePageManifest): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const ids = new Set<string>(); const urls = new Set<string>(); const assets = new Map<string, ManifestAsset>();
  for (const asset of manifest.assets) {
    if (ids.has(asset.id)) diagnostics.push({ path: `assets.${asset.id}`, message: 'asset IDs must be unique' });
    ids.add(asset.id); assets.set(asset.id, asset);
    if (urls.has(asset.downloadUrl)) diagnostics.push({ path: `assets.${asset.id}.downloadUrl`, message: 'asset download URLs must be unique' });
    urls.add(asset.downloadUrl);
    if (asset.kind === 'signature' && asset.signatureFor === undefined) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'signature assets must reference an artifact' });
    if (asset.kind !== 'signature' && asset.signatureFor !== undefined) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'only signature assets may declare signatureFor' });
    for (const field of Object.keys(asset.evidence)) {
      if (!EVIDENCE_FIELDS.has(field)) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a supported asset field' });
      else if (fieldValue(asset, field) === undefined) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a populated asset field' });
    }
  }
  for (const asset of manifest.assets) if (asset.signatureFor !== undefined) {
    const target = assets.get(asset.signatureFor);
    if (target === undefined || !['artifact', 'installer', 'portable', 'archive'].includes(target.kind)) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'signatureFor must reference an existing artifact' });
  }
  for (const asset of manifest.assets) {
    if (asset.supportedArchitectures && (asset.arch !== 'universal' || asset.os !== 'macos')) diagnostics.push({ path: `assets.${asset.id}.supportedArchitectures`, message: 'supportedArchitectures requires a macOS Universal asset' });
    const libc = asset.requirements?.libc;
    if (libc?.minimumVersion && (libc.family === 'none' || libc.family === 'unknown')) diagnostics.push({ path: `assets.${asset.id}.requirements.libc.minimumVersion`, message: 'minimum libc version requires glibc or musl' });
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
    for (const field of Object.keys(preference.evidence ?? {})) if (!['when.os', 'when.arch', 'when.libc'].includes(field) || fieldValue(preference, field) === undefined) diagnostics.push({ path: `installationPreferences.${preference.id}.evidence.${field}`, message: 'evidence must reference a populated preference condition' });
    for (const item of preference.prefer) {
      if (item.type === 'method' && !methodIds.has(item.methodId)) diagnostics.push({ path: `installationPreferences.${preference.id}`, message: 'preference must reference an existing method' });
      if (item.type === 'artifacts' && item.assetIds.some((id) => !assets.has(id))) diagnostics.push({ path: `installationPreferences.${preference.id}`, message: 'preference must reference existing assets' });
    }
  }
  return diagnostics;
}
