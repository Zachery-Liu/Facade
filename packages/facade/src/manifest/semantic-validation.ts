import type { ManifestAsset, ReleasePageManifest } from './release-page-manifest.js';

const EVIDENCE_FIELDS = new Set<keyof ManifestAsset>(['id', 'label', 'downloadUrl', 'os', 'kind', 'signatureFor']);
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
      if (!EVIDENCE_FIELDS.has(field as keyof ManifestAsset)) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a supported asset field' });
      else if (asset[field as keyof ManifestAsset] === undefined) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a populated asset field' });
    }
  }
  for (const asset of manifest.assets) if (asset.signatureFor !== undefined) {
    const target = assets.get(asset.signatureFor);
    if (target === undefined || target.kind !== 'artifact') diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'signatureFor must reference an existing artifact' });
  }
  return diagnostics;
}
