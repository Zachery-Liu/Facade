import { describe, expect, it } from 'vitest';
import { FacadeError } from '../src/runtime/facade-error.js';
import { createLogger } from '../src/runtime/logger.js';

describe('runtime diagnostics', () => {
  it('preserves a stable error code and causal error', () => { const cause = new Error('network unavailable'); const error = new FacadeError('SOURCE_UNAVAILABLE', 'Unable to read release data.', { cause }); expect(error.code).toBe('SOURCE_UNAVAILABLE'); expect(error.cause).toBe(cause); });
  it('writes structured context without undefined or reserved values', () => { const lines: string[] = []; createLogger((line) => lines.push(line)).warn({ repository: 'owner/repo', token: undefined }, 'release unavailable'); expect(lines).toEqual(['{"repository":"owner/repo","level":"warn","message":"release unavailable"}']); });
  it('keeps level authoritative when an untyped caller supplies a reserved key', () => { const lines: string[] = []; createLogger((line) => lines.push(line)).error({ level: 'info' } as never, 'release unavailable'); expect(lines[0]).toContain('"level":"error"'); });
});
