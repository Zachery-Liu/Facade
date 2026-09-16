import type { ConditionResult } from './selection-contract.js';

export function matchValue(field: string, expected: string, actual: string | undefined): ConditionResult {
  const status = actual === undefined || actual === 'unknown' || expected === 'unknown' ? 'unknown' : expected === actual ? 'match' : 'mismatch';
  return { field, status, reason: status === 'unknown' ? 'Value is unknown' : `Requires ${expected}; environment reports ${actual}` };
}

/** Numeric dotted versions only. BigInt avoids rounding long integer segments. */
export function matchMinimumVersion(field: string, minimum: string, actual: string | undefined): ConditionResult {
  if (actual === undefined || !/^\d+(?:\.\d+)*$/.test(actual) || !/^\d+(?:\.\d+)*$/.test(minimum)) {
    return { field, status: 'unknown', reason: 'Version cannot be compared as dotted nonnegative integers' };
  }
  const required = minimum.split('.').map(BigInt);
  const observed = actual.split('.').map(BigInt);
  let comparison = 0;
  for (let i = 0; i < Math.max(required.length, observed.length); i++) {
    const left = observed[i] ?? 0n; const right = required[i] ?? 0n;
    if (left !== right) { comparison = left > right ? 1 : -1; break; }
  }
  return { field, status: comparison >= 0 ? 'match' : 'mismatch', reason: `Requires >= ${minimum}; environment reports ${actual}` };
}

export function conditionStatus(conditions: readonly ConditionResult[]): ConditionResult['status'] {
  if (conditions.some((condition) => condition.status === 'mismatch')) return 'mismatch';
  return conditions.some((condition) => condition.status === 'unknown') ? 'unknown' : 'match';
}
