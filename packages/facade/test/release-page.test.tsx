import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { selectInstallation } from '../src/core/select-installation.js';
import { ReleasePageManifestSchema } from '../src/manifest/release-page-manifest.js';
import { ReleasePage } from '../src/themes/product/components/release-page.js';
const asset = { id: 'windows', label: 'Windows download', downloadUrl: 'https://example.test/facade.exe', os: 'windows' as const, kind: 'artifact' as const, evidence: { os: { source: 'filename-rule' as const, detail: 'windows token' } } };
const manifest = ReleasePageManifestSchema.parse({ schemaVersion: 0, productName: 'Facade', releaseTag: 'v0.0.0-dev', assets: [asset] });
describe('product theme', () => {
  it('renders a semantic static download page from validated manifest data', () => { const html = render(<ReleasePage manifest={manifest} />); expect(html).toContain('<main>'); expect(html).toContain('Windows download'); expect(html).toContain('https://example.test/facade.exe'); });
  it('keeps legacy assets non-recommendable after normalization', () => { expect(selectInstallation({ ...manifest, assets: [] }, {}).status).toBe('no-match'); expect(selectInstallation(manifest, { os: 'windows' }).status).toBe('no-match'); });
});
