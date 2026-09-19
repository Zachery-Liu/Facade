import { ReleasePageManifestV1Schema, type ReleasePageManifest } from './release-page-manifest.js';
import { validateManifestSemantics, type ValidationDiagnostic } from './semantic-validation.js';

export const ReleasePageManifestJsonSchema = requireEvidenceMetadata(ReleasePageManifestV1Schema.toJSONSchema({ target: 'draft-7' }));

export type ManifestValidationResult =
  | { readonly success: true; readonly manifest: ReleasePageManifest }
  | { readonly success: false; readonly diagnostics: readonly ValidationDiagnostic[] };

export function validateReleasePageManifest(input: unknown): ManifestValidationResult {
  const parsed = ReleasePageManifestV1Schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      diagnostics: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }
  const diagnostics = validateManifestSemantics(parsed.data, { requireResolvedManifestEvidence: true });
  return diagnostics.length === 0 ? { success: true, manifest: parsed.data } : { success: false, diagnostics };
}

function requireEvidenceMetadata<T extends object>(schema: T): T {
  function visit(value: unknown): void {
    if (typeof value !== 'object' || value === null) return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    const record = value as Record<string, unknown>;
    const properties = record.properties;
    if (typeof properties === 'object' && properties !== null
      && 'path' in properties && 'source' in properties && 'status' in properties && 'detail' in properties
      && Array.isArray(record.required)) {
      record.required = [...new Set([...record.required, 'path', 'status'])];
    }
    Object.values(record).forEach(visit);
  }
  visit(schema);
  return schema;
}
