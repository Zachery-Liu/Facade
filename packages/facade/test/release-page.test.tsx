import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { deriveSelectionState } from '../src/core/selection-state.js';
import { ReleasePageManifestSchema } from '../src/manifest/release-page-manifest.js';
import { ReleasePage } from '../src/themes/product/components/release-page.js';
const manifest = ReleasePageManifestSchema.parse({ schemaVersion: 0, productName: 'Facade', releaseTag: 'v0.0.0-dev', assets: [{ id: 'windows', label: 'Windows download', downloadUrl: 'https://example.test/facade.exe' }] });
describe('product theme', () => {
  it('renders a semantic static download page from validated manifest data', () => { const html = render(<ReleasePage manifest={manifest} />); expect(html).toContain('<main>'); expect(html).toContain('Windows download'); expect(html).toContain('https://example.test/facade.exe'); });
  it('keeps candidate uncertainty explicit', () => { expect(deriveSelectionState([]).status).toBe('no-match'); expect(deriveSelectionState(manifest.assets).status).toBe('selected'); expect(deriveSelectionState([...manifest.assets, { ...manifest.assets[0]!, id: 'linux' }]).status).toBe('needs-input'); });
});
