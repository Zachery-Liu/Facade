import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { selectInstallation } from '../src/core/select-installation.js';
import { FacadeConfigInputSchema } from '../src/config/facade-config.js';
import { ReleasePageManifestSchema } from '../src/manifest/release-page-manifest.js';
import { ReleasePage } from '../src/themes/product/components/release-page.js';
import { AssetCard } from '../src/themes/product/components/asset-card.js';
const asset = { id: 'windows', label: 'Windows download', downloadUrl: 'https://example.test/facade.exe', os: 'windows' as const, kind: 'artifact' as const, evidence: { os: { source: 'filename-rule' as const, detail: 'windows token' } } };
const legacyManifest = { schemaVersion: 0, productName: 'Facade', releaseTag: 'v0.0.0-dev', assets: [asset] };
const manifest = ReleasePageManifestSchema.parse(legacyManifest);
describe('product theme', () => {
  it('renders a semantic static download page from validated manifest data', () => { const html = render(<ReleasePage manifest={manifest} />); expect(html).toContain('<main>'); expect(html).toContain('Windows download'); expect(html).toContain('https://example.test/facade.exe'); });
  it('keeps raw legacy assets non-recommendable while treating normalized objects as strict v1', () => { expect(selectInstallation({ ...legacyManifest, assets: [] }, {}).status).toBe('no-match'); expect(selectInstallation(legacyManifest, { os: 'windows' }).status).toBe('no-match'); expect(selectInstallation(manifest, { os: 'windows' }).status).toBe('needs-input'); });
  it('renders a controlled notes subset without active HTML or unsafe links', () => {
    const page = ReleasePageManifestSchema.parse({ ...manifest, release: { ...manifest.release, notes: '# Changes\n\n<script>alert(1)</script> [unsafe](javascript:alert) [safe](https://example.test/help) [guide](docs/setup.md)' } });
    const html = render(<ReleasePage manifest={page} />);
    expect(html).toContain('&lt;script>alert(1)&lt;/script>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('href="https://example.test/help"');
    expect(html).toContain('/blob/v0.0.0-dev/docs/setup.md');
  });
  it('keeps fenced blank lines and headings adjacent to body text', () => {
    const page = ReleasePageManifestSchema.parse({ ...manifest, release: { ...manifest.release, notes: '# Changes\nFixes\n```txt\nfirst\n\n<script>second</script>\n```\nAfter' } });
    const html = render(<ReleasePage manifest={page} />);
    expect(html).toContain('<h3 id="changes">Changes</h3><p>Fixes</p>');
    expect(html).toContain('<pre><code>first\n\n&lt;script>second&lt;/script></code></pre><p>After</p>');
  });
  it('keeps shorter backtick runs inside a longer fenced code block', () => {
    const page = ReleasePageManifestSchema.parse({ ...manifest, release: { ...manifest.release, notes: '````txt\nbefore\n```\nafter\n````\nTail' } });
    const html = render(<ReleasePage manifest={page} />);
    expect(html).toContain('<pre><code>before\n```\nafter</code></pre><p>Tail</p>');
  });
  it('gives release-note headings unique IDs and preserves Unicode fragment links', () => {
    const page = ReleasePageManifestSchema.parse({ ...manifest, release: { ...manifest.release, notes: '# Release notes\n# Downloads\n# Changes\n# Changes\n# 更新日志\n[跳转](#更新日志)\n# Cafe\u0301\n[Jump](#Cafe\u0301)\n# !!!\n# ???' } });
    const html = render(<ReleasePage manifest={page} />);
    expect(html).toContain('<section id="release-notes"');
    expect(html).toContain('<h3 id="release-notes-2">Release notes</h3>');
    expect(html).toContain('<h3 id="downloads-2">Downloads</h3>');
    expect(html).toContain('<h3 id="changes">Changes</h3><h3 id="changes-2">Changes</h3>');
    expect(html).toContain('<h3 id="更新日志">更新日志</h3>');
    expect(html).toContain('<a href="#更新日志">跳转</a>');
    expect(html).toContain('<h3 id="café">Café</h3>');
    expect(html).toContain('<a href="#café">Jump</a>');
    expect(html).toContain('<h3 id="section">!!!</h3><h3 id="section-2">???</h3>');
    expect(html).not.toContain('id=""');
  });
  it('does not describe a Linux asset without a libc dependency as requiring none', () => {
    const first = manifest.assets[0];
    if (!first) throw new Error('Expected the normalized fixture asset');
    const html = render(<AssetCard asset={{ ...first, os: 'linux', requirements: { libc: { family: 'none' } } }} />);
    expect(html).not.toContain('Requires none');
  });
  it('rejects active and credential-bearing brand links', () => {
    for (const url of ['javascript:alert(1)', 'https://user:secret@example.test/help', 'data:text/html,hello']) {
      expect(FacadeConfigInputSchema.safeParse({ schema: 1, links: [{ label: 'Help', url }] }).success).toBe(false);
    }
  });
  it('rejects external or traversing image paths in a public manifest', () => {
    for (const icon of ['//example.test/logo.png', '/branding/../logo.png', '/branding/logo.svg', '/branding/logo.png?x=1']) {
      expect(ReleasePageManifestSchema.safeParse({ ...manifest, product: { name: 'Facade', icon } }).success).toBe(false);
    }
    expect(ReleasePageManifestSchema.safeParse({ ...manifest, product: { name: 'Facade', icon: '/project/branding/icon.png' } }).success).toBe(true);
  });
});
