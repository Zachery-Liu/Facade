import type { RawAsset } from '../source/repository-snapshot.js';

export const OPERATING_SYSTEMS = ['macos', 'windows', 'linux', 'unknown'] as const;
export const ARCHITECTURES = ['arm64', 'x64', 'x86', 'universal', 'unknown'] as const;
export const ASSET_FORMATS = ['dmg', 'pkg', 'exe', 'msi', 'appimage', 'deb', 'rpm', 'zip', 'tar.gz', 'other'] as const;
export const ASSET_KINDS = ['installer', 'portable', 'archive', 'checksum', 'signature', 'debug', 'update', 'unknown'] as const;
export const LIBC_FAMILIES = ['glibc', 'musl', 'none', 'unknown'] as const;

export type OperatingSystem = typeof OPERATING_SYSTEMS[number];
export type Architecture = typeof ARCHITECTURES[number];
export type AssetFormat = typeof ASSET_FORMATS[number];
export type AssetKind = typeof ASSET_KINDS[number];
export type LibcFamily = typeof LIBC_FAMILIES[number];
export type ClassificationField = 'os' | 'arch' | 'format' | 'kind' | 'libc';
export type EvidenceStatus = 'explicit' | 'inferred' | 'unknown' | 'conflict';

export interface FieldEvidence {
  readonly source: 'filename-rule' | 'project-config';
  readonly status: EvidenceStatus;
  readonly detail: string;
  readonly ruleId?: string;
  readonly configPath?: string;
}

export interface ClassificationDiagnostic {
  readonly code: string;
  readonly field: ClassificationField;
  readonly message: string;
}

export interface ClassifiedAsset {
  readonly source: RawAsset;
  readonly os: OperatingSystem;
  readonly arch: Architecture;
  readonly format: AssetFormat;
  readonly kind: AssetKind;
  readonly libc: LibcFamily;
  readonly evidence: Readonly<Record<ClassificationField, FieldEvidence>>;
  readonly diagnostics: readonly ClassificationDiagnostic[];
}

const FORMAT_SUFFIXES: ReadonlyArray<readonly [string, AssetFormat]> = [
  ['.tar.gz', 'tar.gz'], ['.appimage', 'appimage'], ['.dmg', 'dmg'], ['.pkg', 'pkg'],
  ['.exe', 'exe'], ['.msi', 'msi'], ['.deb', 'deb'], ['.rpm', 'rpm'], ['.zip', 'zip'],
];

const OS_FORMAT_HINTS: Partial<Record<AssetFormat, Exclude<OperatingSystem, 'unknown'>>> = {
  dmg: 'macos', pkg: 'macos', exe: 'windows', msi: 'windows', appimage: 'linux', deb: 'linux', rpm: 'linux',
};

const INSTALLER_FORMATS = new Set<AssetFormat>(['dmg', 'pkg', 'exe', 'msi', 'appimage', 'deb', 'rpm']);
const ARCHIVE_FORMATS = new Set<AssetFormat>(['zip', 'tar.gz']);

export function classifyAsset(asset: RawAsset): ClassifiedAsset {
  const normalized = asset.name.toLowerCase();
  const format = inferFormat(normalized);
  const diagnostics: ClassificationDiagnostic[] = [];
  const osResult = inferOs(normalized, format, diagnostics);
  const archResult = inferArch(normalized, diagnostics);
  const kindResult = inferKind(normalized, format, diagnostics);
  let libcResult = inferLibc(normalized, diagnostics);
  if (libcResult.value !== 'unknown' && osResult.value !== 'unknown' && osResult.value !== 'linux') {
    const detail = `${libcResult.value} filename evidence conflicts with resolved ${osResult.value} OS`;
    diagnostics.push({ code: 'CLASSIFICATION_LIBC_CONFLICT', field: 'libc', message: `Conflicting libc evidence: ${detail}` });
    libcResult = { value: 'unknown', evidence: { source: 'filename-rule', status: 'conflict', detail } };
  }
  return {
    source: asset,
    os: osResult.value,
    arch: archResult.value,
    format,
    kind: kindResult.value,
    libc: libcResult.value,
    evidence: {
      os: osResult.evidence,
      arch: archResult.evidence,
      format: format === 'other' ? unknownEvidence('No recognized file suffix') : inferredEvidence(`Longest suffix matched ${format}`),
      kind: kindResult.evidence,
      libc: libcResult.evidence,
    },
    diagnostics,
  };
}

function inferFormat(name: string): AssetFormat {
  return FORMAT_SUFFIXES.find(([suffix]) => name.endsWith(suffix))?.[1] ?? 'other';
}

function inferOs(name: string, format: AssetFormat, diagnostics: ClassificationDiagnostic[]) {
  const candidates = new Map<Exclude<OperatingSystem, 'unknown'>, string[]>();
  addTokenCandidate(candidates, name, 'macos', ['macos', 'darwin', 'osx', 'mac']);
  addTokenCandidate(candidates, name, 'windows', ['windows', 'win', 'win32', 'win64']);
  addTokenCandidate(candidates, name, 'linux', ['linux']);
  const formatHint = OS_FORMAT_HINTS[format];
  if (formatHint !== undefined) addCandidate(candidates, formatHint, `${format} format hint`);
  return resolveCandidates('os', candidates, diagnostics);
}

function inferArch(name: string, diagnostics: ClassificationDiagnostic[]) {
  const candidates = new Map<Exclude<Architecture, 'unknown'>, string[]>();
  const protectedName = name.replace(/x86[_-]64/g, ' x64 ');
  addTokenCandidate(candidates, protectedName, 'x64', ['x64', 'amd64']);
  addTokenCandidate(candidates, protectedName, 'arm64', ['arm64', 'aarch64']);
  addTokenCandidate(candidates, protectedName, 'x86', ['x86', 'i386', 'i686']);
  addTokenCandidate(candidates, protectedName, 'universal', ['universal', 'universal2']);
  return resolveCandidates('arch', candidates, diagnostics);
}

function inferKind(name: string, format: AssetFormat, diagnostics: ClassificationDiagnostic[]) {
  const auxiliary = new Map<Exclude<AssetKind, 'unknown'>, string[]>();
  if (hasToken(name, ['checksum', 'checksums', 'sha256sum', 'sha256sums', 'sha512sum', 'sha512sums']) || /(?:^|[._-])sha(?:256|512)(?:[._-]|$)/.test(name)) addCandidate(auxiliary, 'checksum', 'checksum token');
  if (hasToken(name, ['signature', 'signatures']) || /\.(?:sig|asc|minisig)$/i.test(name)) addCandidate(auxiliary, 'signature', 'signature token or suffix');
  if (hasToken(name, ['debug', 'symbols', 'symbol', 'pdb', 'dsym'])) addCandidate(auxiliary, 'debug', 'debug-symbol token');
  if (hasToken(name, ['update', 'updater', 'delta', 'patch'])) addCandidate(auxiliary, 'update', 'update token');
  if (auxiliary.size > 0) return resolveCandidates('kind', auxiliary, diagnostics);

  if (hasToken(name, ['portable'])) return { value: 'portable' as const, evidence: inferredEvidence('portable token') };
  if (INSTALLER_FORMATS.has(format)) return { value: 'installer' as const, evidence: inferredEvidence(`${format} format rule`) };
  if (ARCHIVE_FORMATS.has(format)) return { value: 'archive' as const, evidence: inferredEvidence(`${format} format rule`) };
  return { value: 'unknown' as const, evidence: unknownEvidence('No recognized artifact-purpose evidence') };
}

function inferLibc(name: string, diagnostics: ClassificationDiagnostic[]) {
  const candidates = new Map<Exclude<LibcFamily, 'none' | 'unknown'>, string[]>();
  if (hasToken(name, ['musl'])) addCandidate(candidates, 'musl', 'bounded musl token');
  if (hasToken(name, ['glibc'])) addCandidate(candidates, 'glibc', 'bounded glibc token');
  if (/(?:^|[._-])(?:x86_64|amd64|aarch64|arm64|i[3-6]86)-(?:unknown-)?linux-gnu(?:[._-]|$)/.test(name)) addCandidate(candidates, 'glibc', 'recognized Linux GNU target pattern');
  return resolveCandidates('libc', candidates, diagnostics);
}

function resolveCandidates<T extends string>(field: ClassificationField, candidates: ReadonlyMap<T, readonly string[]>, diagnostics: ClassificationDiagnostic[]): { value: T | 'unknown'; evidence: FieldEvidence } {
  if (candidates.size === 0) return { value: 'unknown', evidence: unknownEvidence(`No recognized ${field} evidence`) };
  if (candidates.size === 1) {
    const [value, reasons] = [...candidates.entries()][0]!;
    return { value, evidence: inferredEvidence(reasons.join('; ')) };
  }
  const details = [...candidates.entries()].map(([value, reasons]) => `${value} (${reasons.join(', ')})`).join('; ');
  diagnostics.push({ code: `CLASSIFICATION_${field.toUpperCase()}_CONFLICT`, field, message: `Conflicting ${field} evidence: ${details}` });
  return { value: 'unknown', evidence: { source: 'filename-rule', status: 'conflict', detail: details } };
}

function addTokenCandidate<T extends string>(candidates: Map<T, string[]>, name: string, value: T, tokens: readonly string[]): void {
  const matched = tokens.filter((token) => hasToken(name, [token]));
  if (matched.length > 0) addCandidate(candidates, value, `${matched.join('/')} token`);
}

function addCandidate<T extends string>(candidates: Map<T, string[]>, value: T, reason: string): void {
  const reasons = candidates.get(value) ?? [];
  if (!reasons.includes(reason)) reasons.push(reason);
  candidates.set(value, reasons);
}

function hasToken(name: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => new RegExp(`(?:^|[^a-z0-9])${escapeRegex(token)}(?:$|[^a-z0-9])`, 'i').test(name));
}

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function inferredEvidence(detail: string): FieldEvidence { return { source: 'filename-rule', status: 'inferred', detail }; }
function unknownEvidence(detail: string): FieldEvidence { return { source: 'filename-rule', status: 'unknown', detail }; }
