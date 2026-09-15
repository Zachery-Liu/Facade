import type { ManifestAsset, ReleasePageManifest } from './release-page-manifest.js';

const EVIDENCE_FIELDS = new Set(['id', 'name', 'label', 'downloadUrl', 'size', 'os', 'arch', 'format', 'kind', 'priority', 'requirements', 'libc', 'signatureFor']);
const RECOMMENDABLE_KINDS = new Set(['installer', 'portable', 'archive']);
const CLASSIFICATION_EVIDENCE_FIELDS = ['os', 'arch', 'format', 'kind', 'requirements', 'libc'] as const;
export type ValidationDiagnostic = { path: string; message: string };
export function validateManifestSemantics(manifest: ReleasePageManifest): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const ids = new Set<string>(); const urls = new Set<string>(); const assets = new Map<string, ManifestAsset>();
  for (const asset of manifest.assets) {
    if (ids.has(asset.id)) diagnostics.push({ path: `assets.${asset.id}`, message: 'asset IDs must be unique' });
    ids.add(asset.id); assets.set(asset.id, asset);
    if (urls.has(asset.downloadUrl)) diagnostics.push({ path: `assets.${asset.id}.downloadUrl`, message: 'asset download URLs must be unique' });
    urls.add(asset.downloadUrl);
    if (asset.kind !== 'signature' && asset.signatureFor !== undefined) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'only signature assets may declare signatureFor' });
    if (asset.os !== 'linux' && asset.requirements.libc.family !== 'unknown') diagnostics.push({ path: `assets.${asset.id}.requirements.libc.family`, message: 'non-Linux assets must keep libc unknown' });
    const hasClassificationConflict = CLASSIFICATION_EVIDENCE_FIELDS.some((field) => asset.evidence[field]?.status === 'conflict');
    if (asset.recommendationEligible && (asset.os === 'unknown' || asset.arch === 'unknown' || !RECOMMENDABLE_KINDS.has(asset.kind) || hasClassificationConflict)) {
      diagnostics.push({ path: `assets.${asset.id}.recommendationEligible`, message: 'recommendation-eligible assets require known OS and architecture, an installable kind, and no unresolved classification conflict' });
    }
    for (const field of Object.keys(asset.evidence)) {
      if (!EVIDENCE_FIELDS.has(field)) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a supported asset field' });
      else if (field !== 'libc' && asset[field as keyof ManifestAsset] === undefined) diagnostics.push({ path: `assets.${asset.id}.evidence.${field}`, message: 'evidence must reference a populated asset field' });
    }
  }
  for (const asset of manifest.assets) if (asset.signatureFor !== undefined) {
    const target = assets.get(asset.signatureFor);
    if (target === undefined || !['installer', 'portable', 'archive'].includes(target.kind)) diagnostics.push({ path: `assets.${asset.id}.signatureFor`, message: 'signatureFor must reference an existing artifact' });
  }
  return diagnostics;
}
