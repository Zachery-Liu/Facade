import { describe, expect, it } from 'vitest';
import { FacadeError } from '../src/runtime/facade-error.js';
import { createLogger } from '../src/runtime/logger.js';

describe('runtime diagnostics', () => {
  it('preserves a stable error code and causal error', () => {
    const cause = new Error('network unavailable');
    const error = new FacadeError('SOURCE_UNAVAILABLE', 'Unable to read release data.', { cause });
    expect(error.code).toBe('SOURCE_UNAVAILABLE');
    expect(error.cause).toBe(cause);
  });

  it('writes structured context without undefined values', () => {
    const lines: string[] = [];
    createLogger((line) => lines.push(line)).warn({ repository: 'owner/repo', token: undefined }, 'release unavailable');
    expect(lines).toEqual(['{"level":"warn","repository":"owner/repo","message":"release unavailable"}']);
  });
});
