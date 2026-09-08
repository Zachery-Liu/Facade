import { ReleasePageManifestSchema, type ManifestAsset, type ReleasePageManifest } from '../manifest/release-page-manifest.js';
import type { RawAsset, RepositorySnapshot } from '../source/repository-snapshot.js';

export function compileReleaseSnapshot(snapshot: RepositorySnapshot): ReleasePageManifest {
  return ReleasePageManifestSchema.parse({
    schemaVersion: 0,
    productName: snapshot.release.name,
    releaseTag: snapshot.release.tagName,
    assets: snapshot.assets.map(compileAsset),
  });
}

function compileAsset(asset: RawAsset): ManifestAsset {
  const name = asset.name.toLowerCase();
  const evidence = { kind: { source: 'filename-rule' as const, detail: 'T03 filename token' } };
  if (name.includes('checksum')) return { id: asset.id, label: 'Checksums', downloadUrl: asset.downloadUrl, os: 'unknown', kind: 'checksum', evidence };
  if (name.includes('macos') && name.includes('arm64') && name.endsWith('.dmg')) return { id: asset.id, label: 'macOS Apple Silicon', downloadUrl: asset.downloadUrl, os: 'macos', kind: 'artifact', evidence: { ...evidence, os: { source: 'filename-rule', detail: 'macOS ARM64 DMG tokens' } } };
  if ((name.includes('windows') || name.includes('win')) && (name.includes('x64') || name.includes('amd64')) && name.endsWith('.exe')) return { id: asset.id, label: 'Windows x64', downloadUrl: asset.downloadUrl, os: 'windows', kind: 'artifact', evidence: { ...evidence, os: { source: 'filename-rule', detail: 'Windows x64 EXE tokens' } } };
  if (name.includes('linux') && (name.includes('x64') || name.includes('amd64')) && (name.endsWith('.tar.gz') || name.endsWith('.zip'))) return { id: asset.id, label: 'Linux x64', downloadUrl: asset.downloadUrl, os: 'linux', kind: 'artifact', evidence: { ...evidence, os: { source: 'filename-rule', detail: 'Linux x64 archive tokens' } } };
  return { id: asset.id, label: asset.name, downloadUrl: asset.downloadUrl, os: 'unknown', kind: 'other', evidence: {} };
}
