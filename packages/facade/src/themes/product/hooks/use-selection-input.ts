import { useMemo, useState } from 'preact/hooks';
import type { ManifestAsset } from '../../../manifest/release-page-manifest.js';
import { deriveSelectionState } from '../../../core/selection-state.js';
export function useSelectionInput(candidates: readonly ManifestAsset[]) { const [selectedId, setSelectedId] = useState<string | undefined>(); const state = useMemo(() => selectedId ? deriveSelectionState(candidates.filter((asset) => asset.id === selectedId)) : deriveSelectionState(candidates), [candidates, selectedId]); return { selectedId, setSelectedId, state }; }
