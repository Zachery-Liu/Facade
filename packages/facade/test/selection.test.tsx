import { render } from 'preact-render-to-string';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { selectInstallation } from '../src/core/select-installation.js';
import { matchMinimumVersion } from '../src/core/conditions.js';
import { ReleasePageManifestSchema, type ManifestAsset } from '../src/manifest/release-page-manifest.js';
import { useSelectionInput } from '../src/themes/product/hooks/use-selection-input.js';

function asset(id = 'a', extra: Partial<ManifestAsset> = {}): ManifestAsset {
  return { id, label: id, downloadUrl: `https://example.test/${id}`, os: 'macos', arch: 'arm64', kind: 'installer', format: 'dmg', evidence: {}, ...extra };
}
function manifest(assets = [asset()], extra = {}) { return { schemaVersion: 1, productName: 'Example', releaseTag: 'v1', assets, ...extra }; }
const mac = { os: 'macos', arch: 'arm64' };
const method = { id: 'brew', platform: 'macos', name: 'Homebrew', command: 'brew install example', prerequisites: [{ 'command-available': 'brew' }] };
const preference = { id: 'mac', when: { os: 'macos' }, prefer: [{ type: 'method', methodId: 'brew' }] };

describe('shared installation selection', () => {
  it('reports undeclared metadata without blocking a unique candidate', () => {
    const result = selectInstallation(manifest(), mac);
    expect(result.status).toBe('selected');
    expect(result.selected?.id).toBe('a');
    expect(result.missingMetadata).toContain('a.requirements.minimumOsVersion');
    expect(result.selected?.conditions.map((c) => c.field)).not.toContain('requirements.minimumOsVersion');
  });
  it.each([{}, { os: 'macos' }, { arch: 'arm64' }, { os: 'macos', arch: 'unknown' }])('does not guess missing environment %j', (env) => {
    expect(selectInstallation(manifest(), env).status).toBe('needs-input');
  });
  it('excludes incompatible and auxiliary candidates regardless of priority', () => {
    for (const kind of ['checksum', 'signature', 'debug', 'update', 'other', 'unknown'] as const) {
      const auxiliary = asset('aux', { kind, priority: 999, ...(kind === 'signature' ? { signatureFor: 'a' } : {}) });
      expect(selectInstallation(manifest([asset(), auxiliary, asset('wrong', { arch: 'x64', priority: 999 })]), mac).selected?.id).toBe('a');
    }
    expect(selectInstallation(manifest([asset('a', { recommendationEligible: false })]), mac).status).toBe('no-match');
    expect(selectInstallation(manifest([]), mac).status).toBe('no-match');
  });
  it('ranks priority, exact architecture then purpose; filenames never resolve ties', () => {
    const universal = asset('u', { arch: 'universal', supportedArchitectures: ['arm64', 'x64'] });
    expect(selectInstallation(manifest([universal, asset()]), mac).selected?.id).toBe('a');
    expect(selectInstallation(manifest([universal, asset('a', { priority: -1 })]), mac).selected?.id).toBe('u');
    expect(selectInstallation(manifest([asset('z', { kind: 'archive' }), asset()]), mac).selected?.id).toBe('a');
    const tied = selectInstallation(manifest([asset('z'), asset('a')]), mac);
    expect(tied.status).toBe('needs-input');
    expect(tied.candidates.map((c) => c.id)).toEqual(['a', 'z']);
  });
  it('requires an explicit Universal set and never treats it as arbitrary CPU support', () => {
    const universal = asset('u', { arch: 'universal', supportedArchitectures: ['arm64', 'x64'] });
    expect(selectInstallation(manifest([universal]), { os: 'macos', arch: 'x86' }).status).toBe('no-match');
    expect(selectInstallation(manifest([universal]), { os: 'macos' }).selected?.id).toBe('u');
    expect(selectInstallation(manifest([universal]), { os: 'macos', arch: 'unknown' }).selected?.id).toBe('u');
    expect(selectInstallation(manifest([asset('u', { arch: 'universal' })]), mac).status).toBe('needs-input');
    expect(selectInstallation(manifest([universal]), { os: 'windows', arch: 'arm64' }).status).toBe('no-match');
  });
  it('does not let a lower-ranked unknown candidate block a unique compatible winner', () => {
    const winner = asset('winner', { priority: 100 });
    const lower = asset('lower', { arch: 'unknown', kind: 'archive', priority: 0 });
    const result = selectInstallation(manifest([lower, winner]), mac);
    expect(result.status).toBe('selected');
    expect(result.selected?.id).toBe('winner');
  });
  it('compares libc only on Linux and preserves Linux format choice', () => {
    const linux = asset('linux', { os: 'linux', format: 'deb', requirements: { libc: { family: 'glibc', minimumVersion: '2.31' } } });
    const env = { os: 'linux', arch: 'arm64' };
    expect(selectInstallation(manifest([linux]), env).status).toBe('needs-input');
    expect(selectInstallation(manifest([linux]), { ...env, libc: { family: 'musl', version: '9' } }).status).toBe('no-match');
    expect(selectInstallation(manifest([linux]), { ...env, libc: { family: 'glibc', version: '2.30' } }).status).toBe('no-match');
    expect(selectInstallation(manifest([linux]), { ...env, libc: { family: 'glibc', version: '2.31.0' } }).status).toBe('selected');
    const independent = asset('static', { os: 'linux', requirements: { libc: { family: 'none' }, minimumOsVersion: '999' } });
    expect(selectInstallation(manifest([independent]), env).status).toBe('selected');
    const missing = asset('missing', { os: 'linux' });
    expect(selectInstallation(manifest([missing]), env).missingMetadata).toContain('missing.requirements.libc');
    expect(selectInstallation(manifest([missing, { ...independent, kind: 'archive' }]), env).status).toBe('needs-input');
    expect(selectInstallation(manifest([asset('a', { requirements: linux.requirements })]), mac).status).toBe('selected');
  });
  it.each([
    ['10.2', '10.10', 'match'], ['10.2.0', '10.2', 'match'], ['10.2', '10.1.99', 'mismatch'],
    ['1', 'v1', 'unknown'], ['1', 'Sonoma', 'unknown'], ['1', undefined, 'unknown'], ['1', '>=2', 'unknown'],
    ['9007199254740993', '9007199254740992', 'mismatch'], ['invalid', '1', 'unknown'],
  ])('compares numeric versions %s / %s', (minimum, actual, status) => {
    expect(matchMinimumVersion('version', minimum, actual).status).toBe(status);
  });
  it('blocks missing declared OS version but accepts an explicit sufficient version', () => {
    const input = manifest([asset('a', { requirements: { minimumOsVersion: '13.2' } })]);
    expect(selectInstallation(input, mac).status).toBe('needs-input');
    expect(selectInstallation(input, { ...mac, osVersion: '13.10' }).status).toBe('selected');
  });
  it('preserves evidence and enforces strict source policy', () => {
    const inferred = asset('a', { evidence: { arch: { source: 'filename-rule', detail: 'arm64 token' } } });
    expect(selectInstallation(manifest([inferred]), mac).selected?.evidence.arch?.source).toBe('filename-rule');
    expect(selectInstallation(manifest([inferred]), mac, { sources: 'strict' }).status).toBe('needs-input');
    const evidence = Object.fromEntries(['os', 'arch', 'kind', 'downloadUrl'].map((field) => [field, { source: 'project-config' as const, detail: 'Author declaration' }]));
    expect(selectInstallation(manifest([asset('a', { evidence })]), mac, { sources: 'strict' }).status).toBe('selected');
    expect(selectInstallation(manifest([asset('a', { evidence: { ...evidence, arch: { source: 'derived', detail: 'derived' } } })]), mac, { sources: 'strict' }).status).toBe('needs-input');
    expect(selectInstallation(manifest([asset('a', { evidence: { arch: { source: 'filename-rule', status: 'conflict', detail: 'conflict' } } })]), mac).status).toBe('needs-input');
  });
  it('handles preference when unknown, mismatch and first-match fallback', () => {
    const input = manifest([asset()], { installMethods: [method], installationPreferences: [preference] });
    expect(selectInstallation(input, {}).status).toBe('needs-input');
    expect(selectInstallation(input, { os: 'windows', arch: 'x64' }).status).toBe('no-match');
    const emptyFirst = { id: 'first', when: { os: 'macos' }, prefer: [] };
    expect(selectInstallation(manifest([asset()], { installMethods: [method], installationPreferences: [emptyFirst, preference] }), mac).selected?.id).toBe('a');
  });
  it('falls back on unavailable commands, stops on unknown and exposes unverified binding', () => {
    const input = manifest([asset()], { installMethods: [method], installationPreferences: [preference] });
    expect(selectInstallation(input, mac).status).toBe('needs-input');
    expect(selectInstallation(input, { ...mac, commands: { brew: 'unavailable' } }).selected?.id).toBe('a');
    const available = { ...mac, commands: { brew: 'available' } };
    expect(selectInstallation(input, available).selected?.versionBinding).toBe('unverified');
    expect(selectInstallation(input, available, { requireVersionBinding: true }).status).toBe('needs-input');
    expect(selectInstallation(input, available, { sources: 'strict' }).status).toBe('needs-input');
  });
  it('handles empty and multiple artifact preference groups, without skipping unknown candidates', () => {
    const input = manifest([asset(), asset('b')], { installationPreferences: [{ id: 'p', when: { os: 'macos' }, prefer: [{ type: 'artifacts', assetIds: [] }, { type: 'artifacts', assetIds: ['a', 'b'] }] }] });
    const result = selectInstallation(input, mac);
    expect(result.status).toBe('needs-input'); expect(result.diagnostics).toHaveLength(1);
    expect(selectInstallation(manifest([asset()], { installationPreferences: [{ id: 'p', when: { os: 'macos', arch: 'x64' }, prefer: [] }] }), mac).selected?.id).toBe('a');
  });
  it('fails closed for malformed input, unsupported protocols and dangling references', () => {
    for (const input of [null, manifest([], { schemaVersion: 42 }), manifest([], { installationPreferences: [preference] }), manifest([asset(), asset()])]) {
      const result = selectInstallation(input, mac);
      expect(result.status).toBe('needs-input'); expect(result.selected).toBeUndefined(); expect(result.diagnostics.length).toBeGreaterThan(0);
    }
    expect(selectInstallation(manifest(), { arch: 'universal' }).status).toBe('needs-input');
    expect(selectInstallation(manifest(), mac, { sources: 'anything' }).status).toBe('needs-input');
  });
  it('shares identical output with the browser hook and does not mutate inputs', () => {
    const input = ReleasePageManifestSchema.parse(manifest());
    const before = JSON.stringify(input);
    function Probe() { const { state } = useSelectionInput(input, { os: 'macos', arch: 'arm64' }); return <pre>{JSON.stringify(state)}</pre>; }
    expect(render(<Probe />)).toBe(render(<pre>{JSON.stringify(selectInstallation(input, mac))}</pre>));
    expect(JSON.stringify(input)).toBe(before);
  });
  it('exports a working packaged read-only selector with the same result', () => {
    const script = `import { selectInstallation } from '@facade/cli/selection'; console.log(JSON.stringify(selectInstallation(${JSON.stringify(manifest())}, ${JSON.stringify(mac)})));`;
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual(selectInstallation(manifest(), mac));
  });
  it('rejects inconsistent metadata and invalid preference references', () => {
    const invalid = [
      manifest([asset('a', { supportedArchitectures: ['arm64'] })]),
      manifest([asset('a', { requirements: { libc: { family: 'none', minimumVersion: '1' } } })]),
      manifest([asset()], { installMethods: [method, method] }),
      manifest([asset()], { installMethods: [{ ...method, evidence: { invented: { source: 'project-config', detail: 'bad' } } }] }),
      manifest([asset()], { installMethods: [method], installationPreferences: [preference, preference] }),
      manifest([asset()], { installationPreferences: [{ id: 'bad', when: { os: 'macos' }, prefer: [{ type: 'artifacts', assetIds: ['missing'] }] }] }),
      manifest([asset()], { installationPreferences: [{ id: 'bad', when: { os: 'macos' }, prefer: [], evidence: { 'when.arch': { source: 'project-config', detail: 'missing' } } }] }),
      manifest([asset()], { installationPreferences: [{ id: 'bad', when: { os: 'macos', arch: 'unknown' }, prefer: [] }] }),
      manifest([asset()], { installationPreferences: [{ id: 'bad', when: { os: 'macos', arch: 'universal' }, prefer: [] }] }),
      manifest([asset()], { installationPreferences: [{ id: 'bad', when: { os: 'macos', libc: 'glibc' }, prefer: [] }] }),
    ];
    for (const input of invalid) {
      const result = selectInstallation(input, mac);
      expect(result.status).toBe('needs-input'); expect(result.diagnostics.length).toBeGreaterThan(0);
    }
  });
  it('does not use unaccepted source evidence to conclude a mismatch or skip a preference', () => {
    const inferred = { source: 'filename-rule', detail: 'inferred platform' };
    const input = manifest([asset()], { installationPreferences: [
      { id: 'first', when: { os: 'windows' }, evidence: { 'when.os': inferred }, prefer: [] },
    ] });
    const result = selectInstallation(input, mac, { sources: 'strict' });
    expect(result.status).toBe('needs-input');
    expect(result.conditions.find((c) => c.field === 'installationPreferences.first.os')?.status).toBe('unknown');
    const candidate = selectInstallation(manifest([asset('win', { os: 'windows', evidence: { os: { source: 'filename-rule', detail: 'conflicting', status: 'conflict' } } })]), mac);
    expect(candidate.status).toBe('needs-input');
    expect(candidate.candidates[0]?.conditions.find((c) => c.field === 'os')?.status).toBe('unknown');
  });
  it('does not bypass an uncertain command prerequisite through fallback', () => {
    const declared = { source: 'project-config', detail: 'declared' };
    const input = manifest([asset()], {
      installMethods: [{ ...method, evidence: { platform: declared, command: declared, versionBinding: declared, prerequisites: { source: 'derived', detail: 'not accepted' } } }],
      installationPreferences: [{ ...preference, evidence: { 'when.os': declared } }],
    });
    const result = selectInstallation(input, { ...mac, commands: { brew: 'unavailable' } }, { sources: 'strict' });
    expect(result.status).toBe('needs-input');
    expect(result.candidates.map((c) => c.id)).toEqual(['brew']);
    expect(result.candidates[0]?.conditions.find((c) => c.field === 'commands.brew')?.status).toBe('unknown');
  });
  it('retains format conflicts and rejects inapplicable libc preferences', () => {
    const conflict = asset('a', { evidence: { format: { source: 'filename-rule', status: 'conflict', detail: 'format conflict' } } });
    expect(selectInstallation(manifest([conflict]), mac).status).toBe('needs-input');
    const input = manifest([asset()], {
      installationPreferences: [{ id: 'mac', when: { os: 'macos', libc: 'glibc' }, prefer: [] }],
    });
    const result = selectInstallation(input, mac);
    expect(result.status).toBe('needs-input');
    expect(result.diagnostics).toContain('installationPreferences.mac.when.libc: libc preference conditions require Linux');
  });
});
