import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const unpublishedActionReference = '992e3eb68562941eee73c75da32b07b8e08b5851';

describe('Pages workflow templates', () => {
  it.each(['facade-pages-release.yml', 'facade-pages-after-release.yml'])('validates %s and preserves the Pages deployment contract', async (name) => {
    const workflow = await readFile(join(repositoryRoot, 'examples/workflows', name), 'utf8');
    expect(parseDocument(workflow).errors).toEqual([]);
    expect(workflow).toContain('cancel-in-progress: true');
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('actions/upload-pages-artifact@v4');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain(unpublishedActionReference);
    expect(workflow).not.toContain('facade/action@v1');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('name: github-pages');
    expect(workflow).toContain('steps.facade.outputs.output-path');
  });

  it('keeps standalone and chained refresh boundaries explicit', async () => {
    const standalone = await readFile(join(repositoryRoot, 'examples/workflows/facade-pages-release.yml'), 'utf8');
    expect(standalone).toContain('types: [published]');
    expect(standalone).toContain('workflow_dispatch:');
    expect(standalone).toContain('.github/facade/**');
    expect(standalone).toContain('ref: ${{ github.event.repository.default_branch }}');
    const chained = await readFile(join(repositoryRoot, 'examples/workflows/facade-pages-after-release.yml'), 'utf8');
    expect(chained).toContain('needs: release-assets');
    expect(chained).toContain('needs: facade');
  });
});
