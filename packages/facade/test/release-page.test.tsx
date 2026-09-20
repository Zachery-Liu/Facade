import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { selectInstallation } from '../src/core/select-installation.js';
import { FacadeConfigInputSchema } from '../src/config/facade-config.js';
import { ReleasePageManifestSchema } from '../src/manifest/release-page-manifest.js';
import { ReleasePage } from '../src/themes/product/components/release-page.js';
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
