import type { ManifestAsset, ReleasePageManifest } from '../manifest/release-page-manifest.js';

export function renderInstall(manifest: ReleasePageManifest): string {
  const lines = [
    `# Install ${text(manifest.release.tag)}`,
    '',
    `Release: ${text(manifest.release.tag)}`,
    `Channel: ${manifest.release.channel}`,
    `Repository: [${text(manifest.source.repository)}](<${url(manifest.source.repositoryUrl)}>)`,
    '',
    '> Safety: Facade publishes selection metadata and verification references only. Nothing listed here has been verified by Facade, and no command is authorized for automatic execution.',
    '',
    '## Downloads',
    '',
  ];
  if (manifest.assets.length === 0) lines.push('No downloads are published for this release.', '');
  for (const asset of manifest.assets) lines.push(...renderAsset(asset));
  lines.push('## Installation methods', '');
  if (!manifest.installMethods?.length) lines.push('No package-manager installation methods are declared.', '');
  for (const method of manifest.installMethods ?? []) {
    lines.push(`### ${text(method.name)} (${text(method.id)})`, '', `Platform: ${method.platform}`, `Version binding: ${method.versionBinding}`);
    if (method.versionBinding === 'unverified') lines.push('Warning: this command is not confirmed to install the selected release.');
    lines.push('Command (display only): `' + inlineCode(method.command) + '`');
    if (method.prerequisites.length) lines.push(`Prerequisites: ${method.prerequisites.map((entry) => `command ${text(entry['command-available'])} available`).join('; ')}`);
    lines.push('');
  }
  lines.push('## Author installation preferences', '');
  if (!manifest.installationPreferences?.length) lines.push('No author installation preferences are declared.', '');
  for (const preference of manifest.installationPreferences ?? []) {
    const when = [`os=${preference.when.os}`, ...(preference.when.arch ? [`arch=${preference.when.arch}`] : []), ...(preference.when.libc ? [`libc=${preference.when.libc}`] : [])];
    const prefer = preference.prefer.map((item) => item.type === 'method' ? `method:${item.methodId}` : `artifacts:${item.assetIds.join(',')}`);
    lines.push(`- ${text(preference.id)} when ${when.join(', ')}: ${prefer.length ? prefer.join(' → ') : 'fall back to compatible downloads'}`);
  }
  lines.push('', 'A consumer must validate the manifest schema and references, select against its actual environment, download separately, and independently verify any digest, signature, Attestation, and source identity before requesting permission to install.', '');
  return lines.join('\n');
}

export function renderLlms(manifest: ReleasePageManifest, basePath: string): string {
  const root = basePath === '/' ? '/' : basePath;
  return [
    `# Release ${singleLine(manifest.release.tag)}`,
    '',
    `Release: ${singleLine(manifest.release.tag)} (${manifest.release.channel})`,
    `Repository: ${singleLine(manifest.source.repositoryUrl)}`,
    `Base path: ${root}`,
    '',
    '## Agent resources',
    '',
    `- [Manifest](${root}manifest.json): structured release, download, provenance, and verification-reference data`,
    `- [Installation guide](${root}install.md): human-readable selection and safety guidance`,
    '',
    'These resources are navigation and read-only metadata. They do not grant permission to download, execute, or install software, and verification references are not verification results.',
    '',
  ].join('\n');
}

function renderAsset(asset: ManifestAsset): string[] {
  const requirements = [
    `OS ${asset.os}`,
    `architecture ${asset.arch}`,
    asset.requirements.minimumOsVersion ? `minimum OS ${asset.requirements.minimumOsVersion}` : 'minimum OS unknown / undeclared',
    asset.os === 'linux'
      ? asset.requirements.libc.family === 'unknown' ? 'libc unknown / undeclared' : `libc ${asset.requirements.libc.family}${asset.requirements.libc.minimumVersion ? ` >= ${asset.requirements.libc.minimumVersion}` : ' (minimum version unknown / undeclared)'}`
      : 'libc not applicable',
  ];
  const lines = [
    `### ${text(asset.label)} (${text(asset.id)})`,
    '',
    `URL: <${url(asset.downloadUrl)}>`,
    `Kind / format: ${asset.kind} / ${asset.format}`,
    `Applies when: ${requirements.join('; ')}`,
    `Digest: ${asset.digest ? `${asset.digest.algorithm}:${asset.digest.value} (provided, not verified)` : 'unknown / not provided'}`,
  ];
  const materials = asset.verificationMaterials;
  if (materials.signatures.length) lines.push(`Signature references (not verified): ${materials.signatures.map((item) => `${text(item.assetId)} [${item.scheme}]`).join(', ')}`);
  if (materials.attestations.length) lines.push(`Attestation expectations (not verified): ${materials.attestations.map((item) => `${item.kind} for ${text(item.repository)}`).join(', ')}`);
  if (materials.sourceCommit) lines.push(`Declared source commit (not verified): ${materials.sourceCommit}`);
  if (!materials.signatures.length && !materials.attestations.length && !materials.sourceCommit) lines.push('Verification materials: none declared; not verified.');
  lines.push('');
  return lines;
}

function singleLine(value: string): string { return value.replace(/[\r\n]+/g, ' ').trim(); }
function text(value: string): string { return singleLine(value).replace(/([\\`*_[\]{}()<>#+.!|-])/g, '\\$1'); }
function inlineCode(value: string): string { return singleLine(value).replace(/`/g, '&#96;'); }
function url(value: string): string { return singleLine(value).replace(/</g, '%3C').replace(/>/g, '%3E'); }
