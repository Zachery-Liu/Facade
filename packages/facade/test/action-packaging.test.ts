import { copyFile, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('packaged GitHub Action', () => {
  it('declares a Node 24 bundle and every public input/output', async () => {
    const metadata = await readFile(join(repositoryRoot, 'action.yml'), 'utf8');
    expect(parseDocument(metadata).errors).toEqual([]);
    expect(metadata).toContain('using: node24');
    expect(metadata).toContain('main: action/dist/index.cjs');
    for (const input of ['config:', 'repository:', 'tag:', 'base-path:', 'out-dir:', 'token:']) expect(metadata).toContain(input);
    for (const output of ['output-path:', 'release-tag:']) expect(metadata).toContain(output);
  });

  it('loads from an isolated directory without node_modules', async () => {
    const isolated = await mkdtemp(join(tmpdir(), 'facade-action-bundle-'));
    const bundle = join(isolated, 'index.cjs');
    await copyFile(join(repositoryRoot, 'action/dist/index.cjs'), bundle);
    const result = await spawnNode(bundle, isolated);
    expect(result.code).toBe(1);
    expect(result.output).toContain('ACTION_UNEXPECTED_FAILURE');
  });
});

function spawnNode(bundle: string, cwd: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [bundle], { cwd, env: {} });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => { resolvePromise({ code, output }); });
  });
}
