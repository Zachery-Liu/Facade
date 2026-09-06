import type { ManifestAsset } from '../manifest/release-page-manifest.js';
export type SelectionState = { status: 'selected'; asset: ManifestAsset } | { status: 'needs-input'; candidates: readonly ManifestAsset[] } | { status: 'no-match'; candidates: readonly [] };
export function deriveSelectionState(candidates: readonly ManifestAsset[]): SelectionState {
  if (candidates.length === 0) return { status: 'no-match', candidates: [] };
  if (candidates.length === 1) return { status: 'selected', asset: candidates[0]! };
  return { status: 'needs-input', candidates };
}
