import { describe, expect, it } from 'vitest';
import { FacadeConfigInputSchema } from '../src/config/facade-config.js';
import { matchesGlob, resolveRelease } from '../src/compiler/release-resolver.js';
import type { RepositorySnapshot } from '../src/source/repository-snapshot.js';

const snapshot: RepositorySnapshot = {
  repository: { fullName: 'owner/repo', htmlUrl: 'https://github.com/owner/repo' },
  release: { id: 'release', tagName: 'v1', name: 'Release', draft: false, prerelease: false },
  assets: [
    { id: 'app', name: 'Tool-linux-x64.tar.gz', downloadUrl: 'https://example.test/app', size: 10 },
    { id: 'sum', name: 'Tool-linux-x64-checksums.txt', downloadUrl: 'https://example.test/sum', size: 2 },
    { id: 'conflict', name: 'Tool-linux-windows-x64.zip', downloadUrl: 'https://example.test/conflict', size: 3 },
  ],
};

describe('release resolver', () => {
  it('applies full-name case-sensitive globs and ordered partial overrides', () => {
    const config = FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [
      { match: 'Tool-*.tar.gz', exclude: true, set: { label: 'First label', priority: 10 } },
      { match: 'Tool-linux-x64.tar.gz', exclude: false, set: { label: 'Final label', requirements: { libc: { family: 'glibc' } } } },
      { match: 'tool-*.tar.gz', set: { priority: 99 } },
    ] } });
    const result = resolveRelease(snapshot, { config, provider: 'fixture', selection: 'fixture' });
    const app = result.inspect.assets[0]!;
    expect(app.final).toMatchObject({ label: 'Final label', priority: 10, requirements: { libc: { family: 'glibc' } } });
    expect(app.excluded).toBe(false);
    expect(app.overrides.map((trace) => [trace.ruleId, trace.field, trace.before, trace.after])).toEqual([
      ['downloads.rules[0]', 'exclude', false, true],
      ['downloads.rules[0]', 'label', 'Tool-linux-x64.tar.gz', 'First label'],
      ['downloads.rules[0]', 'priority', 0, 10],
      ['downloads.rules[1]', 'exclude', true, false],
      ['downloads.rules[1]', 'libc', 'unknown', 'glibc'],
      ['downloads.rules[1]', 'label', 'First label', 'Final label'],
    ]);
    expect(result.inspect.rules[2]).toMatchObject({ status: 'unmatched', matchedAssetIds: [] });
    expect(result.inspect.diagnostics).toContainEqual(expect.objectContaining({ code: 'DOWNLOAD_RULE_NO_MATCH', configPath: 'downloads.rules[2]' }));
  });

  it('skips an exact tag mismatch without applying any part of the rule', () => {
    const config = FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*', tag: 'v2', exclude: true }] } });
    const result = resolveRelease(snapshot, { config });
    expect(result.inspect.rules[0]).toMatchObject({ status: 'skipped-tag', matchedAssetIds: [] });
    expect(result.inspect.diagnostics).toContainEqual(expect.objectContaining({ code: 'DOWNLOAD_RULE_TAG_MISMATCH', configPath: 'downloads.rules[0].tag' }));
    expect(result.manifest.assets).toHaveLength(3);
  });

  it('disables inference and includes only assets with applicable matches when auto is false', () => {
    const config = FacadeConfigInputSchema.parse({ schema: 1, downloads: { auto: false, rules: [{ match: 'Tool-linux-x64.tar.gz', set: { os: 'linux', arch: 'x64', kind: 'archive' } }] } });
    const result = resolveRelease(snapshot, { config });
    expect(result.manifest.assets).toHaveLength(1);
    expect(result.manifest.assets[0]).toMatchObject({ id: 'app', os: 'linux', arch: 'x64', format: 'other', kind: 'archive' });
    expect(result.inspect.assets[0]?.overrides[0]).toEqual({ ruleId: 'downloads.rules[0]', configPath: 'downloads.rules[0]', field: 'exclude', before: true, after: false });
    expect(result.inspect.assets[1]).toMatchObject({ excluded: true, exclusionReason: 'downloads.auto is false and no applicable rule matched' });
  });

  it('never lets priority alone make auxiliary or conflicted assets recommendation eligible', () => {
    const config = FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*', set: { priority: 999 } }] } });
    const assets = resolveRelease(snapshot, { config }).inspect.assets;
    expect(assets.find((asset) => asset.source.id === 'sum')?.recommendationEligible).toBe(false);
    expect(assets.find((asset) => asset.source.id === 'conflict')?.recommendationEligible).toBe(false);
    expect(assets.find((asset) => asset.source.id === 'app')?.recommendationEligible).toBe(true);
  });

  it('lets an explicit field override resolve a classifier conflict while preserving its diagnostic', () => {
    const config = FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*windows*', set: { os: 'linux' } }] } });
    const asset = resolveRelease(snapshot, { config }).inspect.assets[2]!;
    expect(asset.final.evidence.os).toMatchObject({ source: 'project-config', status: 'explicit', configPath: 'downloads.rules[0].set.os' });
    expect(asset.recommendationEligible).toBe(true);
    expect(asset.diagnostics).toContainEqual(expect.objectContaining({ code: 'CLASSIFICATION_OS_CONFLICT' }));
  });

  it('rejects malformed rule actions and non-Linux libc declarations strictly', () => {
    expect(() => FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*' }] } })).toThrow();
    expect(() => FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*', set: { os: 'windows', requirements: { libc: { family: 'musl' } } } }] } })).toThrow();
    const crossRule = FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*', set: { os: 'windows' } }, { match: '*', set: { requirements: { libc: { family: 'musl' } } } }] } });
    expect(() => resolveRelease(snapshot, { config: crossRule })).toThrowError(expect.objectContaining({ code: 'CONFIG_INVALID' }));
    const unknownOs = FacadeConfigInputSchema.parse({ schema: 1, downloads: { auto: false, rules: [{ match: '*', set: { requirements: { libc: { family: 'none' } } } }] } });
    expect(() => resolveRelease(snapshot, { config: unknownOs })).toThrowError(expect.objectContaining({ code: 'CONFIG_INVALID' }));
    expect(() => FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '[z-a]', exclude: true }] } })).toThrow();
  });

  it('reconciles inferred libc after an OS override and exposes the conflict globally', () => {
    const linuxGnu = { ...snapshot, assets: [{ id: 'gnu', name: 'Tool-x86_64-linux-gnu.zip', downloadUrl: 'https://example.test/gnu', size: 1 }] };
    const config = FacadeConfigInputSchema.parse({ schema: 1, downloads: { rules: [{ match: '*', set: { os: 'windows' } }] } });
    const result = resolveRelease(linuxGnu, { config });
    expect(result.inspect.assets[0]?.final).toMatchObject({ os: 'windows', requirements: { libc: { family: 'unknown' } }, recommendationEligible: false });
    expect(result.inspect.assets[0]?.final.evidence.libc).toMatchObject({ status: 'conflict' });
    expect(result.inspect.diagnostics).toContainEqual(expect.objectContaining({ code: 'CLASSIFICATION_LIBC_CONFLICT', assetId: 'gnu' }));
  });

  it('matches the complete asset name and preserves case', () => {
    expect(matchesGlob('Tool-x64.zip', 'Tool-*.zip')).toBe(true);
    expect(matchesGlob('Tool-x64.zip.extra', 'Tool-*.zip')).toBe(false);
    expect(matchesGlob('Tool-x64.zip', 'tool-*.zip')).toBe(false);
    expect(matchesGlob('Tool-x64.zip', '[Tt]ool-?64.zip')).toBe(true);
    expect(matchesGlob("Tool\n-x64.zip", 'Tool*.zip')).toBe(true);
    for (const ending of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
      expect(matchesGlob(`Tool-x64.zip${ending}`, 'Tool-*.zip')).toBe(false);
      expect(matchesGlob(`Tool-x64.zip${ending}`, 'Tool-*.zip?')).toBe(ending.length === 1);
    }
  });
});
