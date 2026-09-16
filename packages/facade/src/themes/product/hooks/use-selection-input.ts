import { useMemo, useState } from 'preact/hooks';
import type { ReleasePageManifest } from '../../../manifest/release-page-manifest.js';
import { selectInstallation } from '../../../core/select-installation.js';
import type { SelectionEnvironment, SelectionPolicy } from '../../../core/selection-contract.js';

/** Caller supplies detection hints; manual environment remains authoritative. */
export function useSelectionInput(manifest: ReleasePageManifest, detected: SelectionEnvironment = {}, policy: SelectionPolicy = {}) {
  const [manualEnvironment, setManualEnvironment] = useState<SelectionEnvironment | undefined>();
  const environment = manualEnvironment ?? detected;
  const state = useMemo(() => selectInstallation(manifest, environment, policy), [manifest, environment, policy]);
  return { environment, setManualEnvironment, state };
}
