import { z } from 'zod';
import { ReleasePageManifestSchema, ReleasePageManifestV1Schema, type ReleasePageManifest } from './release-page-manifest.js';
import { validateManifestSemantics, type ValidationDiagnostic } from './semantic-validation.js';

export const ReleasePageManifestJsonSchema = requireEvidencePaths(z.toJSONSchema(ReleasePageManifestV1Schema, { target: 'draft-7' }));

export type ManifestValidationResult =
  | { readonly success: true; readonly manifest: ReleasePageManifest }
  | { readonly success: false; readonly diagnostics: readonly ValidationDiagnostic[] };

export function validateReleasePageManifest(input: unknown): ManifestValidationResult {
  const parsed = ReleasePageManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      diagnostics: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }
  const diagnostics = validateManifestSemantics(parsed.data);
  return diagnostics.length === 0 ? { success: true, manifest: parsed.data } : { success: false, diagnostics };
}

function requireEvidencePaths(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(requireEvidencePaths);
  if (typeof value !== 'object' || value === null) return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, requireEvidencePaths(child)]));
  if (typeof result.properties === 'object' && result.properties !== null && 'path' in result.properties && 'source' in result.properties && 'detail' in result.properties && Array.isArray(result.required) && !result.required.includes('path')) {
    result.required = [...result.required, 'path'];
  }
  return result;
}
