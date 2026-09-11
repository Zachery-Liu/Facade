import { copyFile, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ActionMetadataSchema = z.object({
  inputs: z.record(z.string(), z.object({ default: z.unknown().optional() }).passthrough()),
  outputs: z.record(z.string(), z.object({ description: z.string() }).passthrough()),
  runs: z.object({ using: z.string(), main: z.string() }),
}).passthrough();

describe('packaged GitHub Action', () => {
  it('declares a Node 24 bundle and every public input/output', async () => {
    const metadata = await readFile(join(repositoryRoot, 'action.yml'), 'utf8');
    const document = parseDocument(metadata);
    expect(document.errors).toEqual([]);
    const parsed = ActionMetadataSchema.parse(document.toJS());
    expect(parsed.runs).toEqual({ using: 'node24', main: 'action/dist/index.cjs' });
    expect(Object.keys(parsed.inputs).sort()).toEqual(['base-path', 'config', 'out-dir', 'repository', 'tag', 'token']);
    expect(Object.keys(parsed.outputs).sort()).toEqual(['output-path', 'release-tag']);
    expect(parsed.inputs['out-dir']).toMatchObject({ default: '.facade-dist' });
    expect(parsed.inputs.repository).not.toHaveProperty('default');
    expect(parsed.inputs.token).not.toHaveProperty('default');
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
