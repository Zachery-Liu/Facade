import { ReleasePageManifestV1Schema, type ReleasePageManifest } from './release-page-manifest.js';
import { validateManifestSemantics, type ValidationDiagnostic } from './semantic-validation.js';

export const ReleasePageManifestJsonSchema = alignPublicSchema(ReleasePageManifestV1Schema.toJSONSchema({ target: 'draft-7' }));

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

function alignPublicSchema<T extends object>(schema: T): T {
  function visit(value: unknown, field?: string): void {
    if (typeof value !== 'object' || value === null) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item)); return; }
    const record = value as Record<string, unknown>;
    const properties = record.properties;
    if (typeof properties === 'object' && properties !== null
      && 'path' in properties && 'source' in properties && 'status' in properties && 'detail' in properties
      && Array.isArray(record.required)) {
      record.required = [...new Set([...record.required, 'path', 'status'])];
    }
    if ((field === 'downloadUrl' || field === 'repositoryUrl') && record.format === 'uri' && record.type === 'string') {
      record.pattern = '^[Hh][Tt][Tt][Pp][Ss]?://';
    }
    if (field === 'url' && record.format === 'uri' && record.type === 'string') {
      record.pattern = '^[Hh][Tt][Tt][Pp][Ss]?://[^/@?#]+(?:[/?#]|$)';
    }
    Object.entries(record).forEach(([key, child]) => visit(child, key));
  }
  visit(schema);
  return schema;
}
