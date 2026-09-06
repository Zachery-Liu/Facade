import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cliPath = fileURLToPath(new URL('../dist/index.js', import.meta.url));

describe('facade CLI artifact', () => {
  it('prints help without relying on TypeScript source', () => {
    const output = execFileSync(process.execPath, [cliPath, '--help'], { encoding: 'utf8' });

    expect(output).toContain('Usage: facade');
    expect(output).toContain('Generate static software release pages');
  });
});
