import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FacadeConfigSchema } from '../src/config/facade-config.js';
import { ReleasePageManifestSchema } from '../src/manifest/release-page-manifest.js';
import { validateManifestSemantics } from '../src/manifest/semantic-validation.js';

function fixture(name: string): unknown { return JSON.parse(readFileSync(fileURLToPath(new URL(`../../../fixtures/repositories/${name}`, import.meta.url)), 'utf8')); }
describe('manifest validation', () => {
  it('accepts an offline fixture with distinct artifacts and linked signature', () => { const manifest = ReleasePageManifestSchema.parse(fixture('basic-release.json')); expect(validateManifestSemantics(manifest)).toEqual([]); });
  it('reports a missing signature artifact reference', () => { const manifest = ReleasePageManifestSchema.parse(fixture('invalid-signature.json')); expect(validateManifestSemantics(manifest)).toEqual([{ path: 'assets.signature.signatureFor', message: 'signatureFor must reference an existing artifact' }]); });
  it('rejects duplicate asset IDs before rendering', () => { expect(() => ReleasePageManifestSchema.parse({ schemaVersion: 0, productName: 'Duplicate', releaseTag: 'v0', assets: [{ id: 'same', label: 'A', downloadUrl: 'https://example.test/a', os: 'windows', kind: 'artifact', evidence: {} }, { id: 'same', label: 'B', downloadUrl: 'https://example.test/b', os: 'windows', kind: 'artifact', evidence: {} }] })).toThrow(/duplicate asset ID/); });
  it('rejects non-HTTP download URLs', () => { expect(() => ReleasePageManifestSchema.parse({ schemaVersion: 0, productName: 'Unsafe', releaseTag: 'v0', assets: [{ id: 'unsafe', label: 'Unsafe', downloadUrl: 'ftp://example.test/a', os: 'unknown', kind: 'other', evidence: {} }] })).toThrow(); });
  it('keeps a conflicting-name fixture explicitly unknown', () => { const manifest = ReleasePageManifestSchema.parse(fixture('conflicting-name.json')); expect(manifest.assets[0]?.os).toBe('unknown'); expect(validateManifestSemantics(manifest)).toEqual([]); });
  it('reports evidence for an unsupported field', () => { const manifest = ReleasePageManifestSchema.parse({ schemaVersion: 0, productName: 'Evidence', releaseTag: 'v0', assets: [{ id: 'asset', label: 'Asset', downloadUrl: 'https://example.test/asset', os: 'unknown', kind: 'other', evidence: { arch: { source: 'filename-rule', detail: 'x64 token' } } }] }); expect(validateManifestSemantics(manifest)).toEqual([{ path: 'assets.asset.evidence.arch', message: 'evidence must reference a supported asset field' }]); });
  it('requires a tag when configuration selects tag strategy', () => { expect(() => FacadeConfigSchema.parse({ schema: 1, repository: 'owner/repo', release: { strategy: 'tag' } })).toThrow(/release.tag/); });
});
