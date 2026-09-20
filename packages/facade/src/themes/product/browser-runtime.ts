import { selectInstallation } from '../../core/select-installation.js';
import type { SelectionEnvironment } from '../../core/selection-contract.js';
import type { ReleasePageManifest } from '../../manifest/release-page-manifest.js';

const payload = document.getElementById('facade-manifest');
if (payload?.textContent) {
  const manifest: ReleasePageManifest = JSON.parse(payload.textContent) as ReleasePageManifest;
  const osInput = document.querySelector<HTMLSelectElement>('#environment-os');
  const archInput = document.querySelector<HTMLSelectElement>('#environment-arch');
  const libcInput = document.querySelector<HTMLSelectElement>('#environment-libc');
  const versionInput = document.querySelector<HTMLInputElement>('#environment-version');
  const commandInputs = [...document.querySelectorAll<HTMLSelectElement>('[data-command]')];
  const status = document.getElementById('recommendation-status');
  const result = document.getElementById('recommendation-result');
  const appearance = document.querySelector<HTMLSelectElement>('#appearance');
  const hints = (navigator as Navigator & { userAgentData?: { platform?: string; getHighEntropyValues?: (keys: string[]) => Promise<{ architecture?: string; bitness?: string }> } }).userAgentData;
  const ua = navigator.userAgent;
  const platform = hints?.platform ?? navigator.platform;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const detectedOs: SelectionEnvironment['os'] = mobile ? undefined : /Mac|macOS/.test(platform) ? 'macos' : /Win/.test(platform) ? 'windows' : /Linux/.test(platform) ? 'linux' : undefined;
  if (osInput && detectedOs) osInput.value = detectedOs;
  void hints?.getHighEntropyValues?.(['architecture', 'bitness']).then(({ architecture, bitness }) => {
    if (!archInput || archInput.value || mobile) return;
    if (architecture === 'arm' && bitness === '64') archInput.value = 'arm64';
    else if (architecture === 'x86' && bitness === '64') archInput.value = 'x64';
    else if (architecture === 'x86' && bitness === '32') archInput.value = 'x86';
    if (archInput.value) renderSelection();
  }).catch(() => { /* Manual choice remains available. */ });

  function renderSelection(): void {
    if (!status || !result) return;
    const environment: SelectionEnvironment = {
      ...(osInput?.value ? { os: osInput.value as SelectionEnvironment['os'] } : {}),
      ...(archInput?.value ? { arch: archInput.value as SelectionEnvironment['arch'] } : {}),
      ...(versionInput?.value.trim() ? { osVersion: versionInput.value.trim() } : {}),
      ...(libcInput?.value ? { libc: { family: libcInput.value as 'glibc' | 'musl' | 'none' } } : {}),
      ...(commandInputs.length ? { commands: Object.fromEntries(commandInputs.map((input) => [input.dataset.command ?? '', input.value as 'available' | 'unavailable' | 'unknown'])) } : {}),
    };
    const selection = selectInstallation(manifest, environment);
    result.replaceChildren();
    if (selection.status === 'selected' && selection.selected) {
      status.textContent = 'Selected: meets the provided conditions. Review missing compatibility details before installing.';
      const candidate = selection.selected;
      if (candidate.type === 'artifact' && candidate.asset) addLink(result, candidate.asset.downloadUrl, `Download ${candidate.asset.label}`);
      else {
        const method = manifest.installMethods?.find((entry) => entry.id === candidate.id);
        if (method) {
          const line = document.createElement('p');
          line.textContent = `${method.name}: ${method.command} (version binding: ${method.versionBinding}; display only)`;
          result.append(line);
        }
      }
    } else if (selection.status === 'needs-input') {
      status.textContent = 'More information or a manual choice is needed. No automatic recommendation is available.';
      const candidates = selection.candidates.filter((candidate) => candidate.type === 'artifact' && candidate.asset && !candidate.conditions.some((condition) => condition.status === 'mismatch'));
      for (const candidate of candidates) if (candidate.asset) addLink(result, candidate.asset.downloadUrl, candidate.asset.label);
    } else status.textContent = 'No download matches the provided conditions. All release files remain available below.';
  }
  for (const control of [osInput, archInput, libcInput, versionInput, ...commandInputs]) control?.addEventListener('input', renderSelection);
  renderSelection();

  if (appearance) {
    appearance.value = manifest.theme?.appearance ?? 'auto';
    const apply = () => { document.documentElement.dataset.appearance = appearance.value; };
    appearance.addEventListener('change', apply);
    apply();
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('.copy-button')) button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    if (!value) return;
    try { await navigator.clipboard.writeText(value); button.textContent = 'Copied'; }
    catch { button.textContent = 'Copy failed'; }
    window.setTimeout(() => { button.textContent = button.dataset.copyLabel ?? 'Copy'; }, 2500);
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>('.copy-button')) button.dataset.copyLabel = button.textContent ?? 'Copy';
}

function addLink(parent: HTMLElement, href: string, label: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  parent.append(link);
}
