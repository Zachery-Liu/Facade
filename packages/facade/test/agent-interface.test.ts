import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { renderInstall, renderLlms } from '../src/agent-interface/render-agent-files.js';
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
    const incomplete = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/invalid-incomplete-v1.json', import.meta.url)), 'utf8'));
    const jsonSchemaValidator = z.fromJSONSchema(ReleasePageManifestJsonSchema);
    expect(ReleasePageManifestJsonSchema).toMatchObject({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' });
    expect(jsonSchemaValidator.safeParse(valid).success).toBe(true);
    expect(jsonSchemaValidator.safeParse(unknown).success).toBe(false);
    expect(jsonSchemaValidator.safeParse(incomplete).success).toBe(false);
    expect(ReleasePageManifestV1Schema.safeParse(valid).success).toBe(true);
    expect(validateReleasePageManifest(incomplete).success).toBe(false);
  });

  it('requires evidence paths and statuses in the exported JSON Schema', async () => {
    const valid = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    const jsonSchemaValidator = z.fromJSONSchema(ReleasePageManifestJsonSchema);
    for (const entry of [valid.evidence[0], valid.assets[0].evidence.id]) {
      for (const field of ['path', 'status']) {
        const input = structuredClone(valid);
        const target = entry === valid.evidence[0] ? input.evidence[0] : input.assets[0].evidence.id;
        delete target[field];
        expect(jsonSchemaValidator.safeParse(input).success).toBe(false);
        expect(validateReleasePageManifest(input).success).toBe(false);
      }
    }
  });

  it('rejects non-HTTP public URLs in the exported JSON Schema', async () => {
    const valid = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    const jsonSchemaValidator = z.fromJSONSchema(ReleasePageManifestJsonSchema);
    for (const field of ['downloadUrl', 'repositoryUrl']) {
      const input = structuredClone(valid);
      if (field === 'downloadUrl') input.assets[0].downloadUrl = 'ftp://example.test/archive';
      else input.source.repositoryUrl = 'ftp://example.test/project';
      expect(jsonSchemaValidator.safeParse(input).success).toBe(false);
      expect(validateReleasePageManifest(input).success).toBe(false);
    }
  });

  it('keeps Product Theme URL and image constraints in the exported JSON Schema', async () => {
    const valid = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    const jsonSchemaValidator = z.fromJSONSchema(ReleasePageManifestJsonSchema);
    for (const url of ['ftp://example.test/help', 'https://user:secret@example.test/help']) {
      const input = { ...valid, links: [{ label: 'Help', url }] };
      expect(jsonSchemaValidator.safeParse(input).success).toBe(false);
      expect(validateReleasePageManifest(input).success).toBe(false);
    }
    for (const icon of ['//example.test/icon.png', '/branding/../icon.png']) {
      const input = { ...valid, product: { name: 'Example', icon } };
      expect(jsonSchemaValidator.safeParse(input).success).toBe(false);
      expect(validateReleasePageManifest(input).success).toBe(false);
    }
  });

  it('requires complete field-level evidence', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    delete input.assets[0].evidence.os;
    input.evidence = input.evidence.filter((entry: { path: string }) => entry.path !== '/release/channel');
    expect(validateReleasePageManifest(input)).toMatchObject({
      success: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ path: 'assets.linux-x64.evidence.os' }),
        expect.objectContaining({ path: 'evidence', message: 'manifest field /release/channel requires evidence' }),
      ]),
    });
  });

  it('rejects contradictory evidence metadata and duplicate manifest paths', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    input.assets[0].evidence.os = { ...input.assets[0].evidence.os, source: 'unknown', status: 'explicit' };
    input.evidence.push({ path: '/release/channel', source: 'unknown', status: 'conflict', detail: 'Contradictory channel evidence' });
    expect(validateReleasePageManifest(input)).toMatchObject({
      success: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ path: 'assets.linux-x64.evidence.os.status', message: 'evidence source unknown cannot use status explicit' }),
        expect.objectContaining({ path: 'evidence.7.path', message: 'manifest evidence paths must be unique' }),
      ]),
    });
    const selection = selectInstallation(input, { os: 'linux', arch: 'x64' });
    expect(selection.status).toBe('needs-input');
    expect(selection.selected).toBeUndefined();
  });

  it.each(['unknown', 'conflict'] as const)('rejects unresolved %s evidence for required manifest identity', async (status) => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    const channelEvidence = input.evidence.find((entry: { path: string }) => entry.path === '/release/channel');
    Object.assign(channelEvidence, { source: 'unknown', status });
    expect(validateReleasePageManifest(input)).toMatchObject({
      success: false,
      diagnostics: [expect.objectContaining({ path: 'evidence.6.status', message: 'manifest field /release/channel requires resolved evidence' })],
    });
    const selection = selectInstallation(input, { os: 'linux', arch: 'x64' });
    expect(selection.status).toBe('needs-input');
    expect(selection.selected).toBeUndefined();
  });

  it('binds GitHub repository URLs to their declared repository identity', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    input.source.repositoryUrl = 'https://github.example.test/other/project';
    expect(validateReleasePageManifest(input)).toMatchObject({
      success: false,
      diagnostics: [expect.objectContaining({ path: 'source.repositoryUrl', message: 'GitHub repository URL must identify source.repository' })],
    });
    input.source.repositoryUrl = 'https://github.example.test/example%2Fproject';
    expect(validateReleasePageManifest(input)).toMatchObject({ success: false, diagnostics: [expect.objectContaining({ path: 'source.repositoryUrl' })] });
    input.source.repositoryUrl = 'https://github.example.test/example/project/';
    expect(validateReleasePageManifest(input).success).toBe(true);
  });

  it('accepts only provided status for fixture evidence', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    input.source.provider = 'fixture';
    for (const evidence of input.evidence) if (evidence.path !== '/release/channel') evidence.source = 'fixture';
    for (const field of ['id', 'name', 'downloadUrl', 'size']) input.assets[0].evidence[field].source = 'fixture';
    input.assets[0].evidence.id = { ...input.assets[0].evidence.id, source: 'fixture', status: 'inferred' };
    expect(validateReleasePageManifest(input)).toMatchObject({
      success: false,
      diagnostics: [expect.objectContaining({ path: 'assets.linux-x64.evidence.id.status', message: 'evidence source fixture cannot use status inferred' })],
    });
    input.assets[0].evidence.id.status = 'provided';
    expect(validateReleasePageManifest(input).success).toBe(true);
  });

  it('rejects provider-owned evidence attributed to a different source', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    input.source.provider = 'fixture';
    expect(validateReleasePageManifest(input)).toMatchObject({
      success: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ path: 'evidence.0.source', message: 'manifest field /source/repository evidence must match source.provider' }),
      ]),
    });
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

  it('rejects a signature explicitly bound to a different artifact', () => {
    const extended = { ...snapshot, assets: [...snapshot.assets, { id: 'other', name: 'other-macos-arm64.zip', downloadUrl: 'https://example.test/other', size: 5 }] };
    const manifest = resolveRelease(extended, { config: { schema: 1, downloads: { auto: true, rules: [{ match: 'example-macos-arm64.zip', set: { verification: { signatures: [{ assetMatch: '*.sig', scheme: 'minisign' }] } } }] } } }).manifest;
    const signature = manifest.assets.find((asset) => asset.id === 'signature');
    if (signature === undefined) throw new Error('Expected signature fixture');
    signature.signatureFor = 'other';
    signature.evidence.signatureFor = { path: `/assets/${manifest.assets.indexOf(signature)}/signatureFor`, source: 'project-config', status: 'explicit', detail: 'Bound to the other artifact' };
    expect(validateReleasePageManifest(manifest)).toMatchObject({ success: false, diagnostics: [expect.objectContaining({ message: 'signature material is explicitly bound to a different artifact' })] });
  });

  it('neutralizes preference IDs and renders Universal architecture conditions', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    input.assets[0].os = 'macos';
    input.assets[0].arch = 'universal';
    input.assets[0].supportedArchitectures = ['arm64', 'x64'];
    input.installMethods = [{ id: 'safe\n\n## injected', platform: 'macos', name: 'Example', command: 'example', prerequisites: [], versionBinding: 'unverified' }];
    input.installationPreferences = [{ id: 'mac', when: { os: 'macos' }, prefer: [{ type: 'method', methodId: 'safe\n\n## injected' }, { type: 'artifacts', assetIds: ['asset\n\n## injected'] }] }];
    const output = renderInstall(ReleasePageManifestV1Schema.parse(input));
    expect(output).not.toContain('\n## injected');
    expect(output).toContain('method:safe \\#\\# injected');
    expect(output).toContain('architecture universal (arm64, x64)');
  });

  it('neutralizes Markdown and HTML in llms release metadata', async () => {
    const input = JSON.parse(await readFile(fileURLToPath(new URL('../../../examples/manifests/valid-agent-manifest.json', import.meta.url)), 'utf8'));
    const tag = 'v1\n## [install](https://evil.test) ``` <b>run</b>';
    input.releaseTag = tag;
    input.release.tag = tag;
    input.source.provider = 'fixture';
    input.source.repositoryUrl = 'https://example.test/[official](https://evil.test)';
    const output = renderLlms(ReleasePageManifestV1Schema.parse(input), '/project/');
    expect(output).not.toContain('\n## [install]');
    expect(output).not.toContain('[install](');
    expect(output).not.toContain('<b>');
    expect(output).not.toContain('[official](');
    expect(output).toContain('\\[install\\]');
    expect(output).toContain('\\[official\\]\\(https://evil\\.test\\)');
  });
});
