import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildRelease } from '../src/build/offline-build.js';
import { resolveRelease } from '../src/compiler/release-resolver.js';
import { ReleasePageManifestV1Schema } from '../src/manifest/release-page-manifest.js';
import { ReleasePageManifestJsonSchema, validateReleasePageManifest } from '../src/manifest/public-contract.js';
import { selectInstallation } from '../src/core/select-installation.js';

const snapshot = {
  repository: { fullName: 'example/project', htmlUrl: 'https://github.com/example/project' },
  release: { id: '1', tagName: 'v1', name: 'Example', draft: false, prerelease: false },
  assets: [
    { id: 'archive', name: 'example-macos-arm64.zip', downloadUrl: 'https://example.test/archive', size: 10, digest: { algorithm: 'sha256' as const, value: 'a'.repeat(64) } },
    { id: 'signature', name: 'example-macos-arm64.zip.sig', downloadUrl: 'https://example.test/signature', size: 2 },
  ],
};

describe('Agent Interface', () => {
  it('exports a draft-07 JSON Schema and validates checked-in structural examples', async () => {
    const valid = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    const unknown = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/invalid-unknown-version.json', import.meta.url)), 'utf8'));
    expect(ReleasePageManifestJsonSchema).toMatchObject({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' });
    expect(ReleasePageManifestV1Schema.safeParse(valid).success).toBe(true);
    expect(ReleasePageManifestV1Schema.safeParse(unknown).success).toBe(false);
  });

  it('rejects a semantically invalid checked-in example before selection', async () => {
    const invalid = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/invalid-dangling-signature.json', import.meta.url)), 'utf8'));
    const validation = validateReleasePageManifest(invalid);
    expect(validation).toMatchObject({ success: false, diagnostics: [expect.objectContaining({ message: 'signature material must reference an existing signature asset' })] });
    const selection = selectInstallation(invalid, { os: 'macos', arch: 'arm64' });
    expect(selection.status).toBe('needs-input');
    expect(selection.selected).toBeUndefined();
  });

  it('derives safe channels and rejects stable prerelease claims', () => {
    expect(resolveRelease(snapshot).manifest.release.channel).toBe('stable');
    expect(resolveRelease({ ...snapshot, release: { ...snapshot.release, prerelease: true } }).manifest.release.channel).toBe('prerelease');
    expect(resolveRelease(snapshot, { config: { schema: 1, release: { strategy: 'tag', tag: 'v1', channel: 'beta' } } }).manifest.release.channel).toBe('beta');
    expect(() => resolveRelease({ ...snapshot, release: { ...snapshot.release, prerelease: true } }, { config: { schema: 1, release: { strategy: 'tag', tag: 'v1', channel: 'stable' } } })).toThrow(/stable channel/);
  });

  it('resolves verification references without claiming verification', async () => {
    const commit = 'b'.repeat(40);
    const config = { schema: 1 as const, release: { strategy: 'tag' as const, tag: 'v1' }, downloads: { auto: true, rules: [{
      match: 'example-macos-arm64.zip', tag: 'v1', set: { verification: {
        signatures: [{ assetMatch: '*.sig', scheme: 'minisign' as const }],
        attestations: [{ kind: 'github-attestation' as const, repository: 'example/project' }],
        sourceCommit: commit,
      } },
    }] } };
    const manifest = resolveRelease(snapshot, { config }).manifest;
    expect(manifest.assets[0]?.digest?.value).toBe('a'.repeat(64));
    expect(manifest.assets[0]?.verificationMaterials).toEqual({
      signatures: [{ assetId: 'signature', scheme: 'minisign' }],
      attestations: [{ kind: 'github-attestation', repository: 'example/project' }],
      sourceCommit: commit,
    });
    expect(validateReleasePageManifest(manifest).success).toBe(true);
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-agent-interface-')), 'site');
    await buildRelease(snapshot, { outDir, config, basePath: '/project/' });
    const install = await readFile(join(outDir, 'install.md'), 'utf8');
    const llms = await readFile(join(outDir, 'llms.txt'), 'utf8');
    expect(install).toContain('not verified');
    expect(install).not.toMatch(/verified\s*[:=]\s*true/i);
    expect(llms).toContain('[Manifest](/project/manifest.json)');
    expect(llms).not.toContain('example-macos-arm64.zip');
  });

  it('fails closed for ambiguous signatures and unscoped source commits', () => {
    const ambiguous = { ...snapshot, assets: [...snapshot.assets, { id: 'signature-2', name: 'other.sig', downloadUrl: 'https://example.test/signature-2', size: 1 }] };
    const verification = { signatures: [{ assetMatch: '*.sig', scheme: 'other' as const }] };
    expect(() => resolveRelease(ambiguous, { config: { schema: 1, downloads: { auto: true, rules: [{ match: '*.zip', set: { verification } }] } } })).toThrow(/exactly one/);
    expect(() => resolveRelease(snapshot, { config: { schema: 1, downloads: { auto: true, rules: [{ match: '*.zip', set: { verification: { sourceCommit: 'c'.repeat(40) } } }] } } })).toThrow();
  });
});
