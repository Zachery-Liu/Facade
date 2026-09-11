import { describe, expect, it } from 'vitest';
import { classifyAsset } from '../src/classifier/asset-classifier.js';

function classify(name: string) {
  return classifyAsset({ id: name, name, downloadUrl: `https://example.test/${encodeURIComponent(name)}`, size: 1 });
}

describe('asset classifier', () => {
  it.each([
    ['Tool-macOS-arm64.DMG', 'macos', 'arm64', 'dmg', 'installer', 'unknown'],
    ['tool-win32-x64.msi', 'windows', 'x64', 'msi', 'installer', 'unknown'],
    ['tool-linux-x86_64-unknown-linux-gnu.tar.gz', 'linux', 'x64', 'tar.gz', 'archive', 'glibc'],
    ['tool-linux-aarch64-musl.AppImage', 'linux', 'arm64', 'appimage', 'installer', 'musl'],
    ['tool-darwin-universal.zip', 'macos', 'universal', 'zip', 'archive', 'unknown'],
  ])('classifies %s across every T06 dimension', (name, os, arch, format, kind, libc) => {
    expect(classify(name)).toMatchObject({ os, arch, format, kind, libc });
  });

  it('uses the longest suffix and protects x86_64 from an x86 double match', () => {
    const result = classify('tool-linux-x86_64.tar.gz');
    expect(result).toMatchObject({ arch: 'x64', format: 'tar.gz' });
    expect(result.evidence.arch.status).toBe('inferred');
  });

  it.each(['windowshade-x64.zip', 'macaroon-arm64.zip', 'darwinner-x64.zip', 'linuxgnu-x64.zip'])('does not match platform substrings in %s', (name) => {
    expect(classify(name).os).toBe('unknown');
  });

  it('does not infer glibc from an arbitrary gnu substring', () => {
    expect(classify('tool-linux-x64-gnumeric.zip').libc).toBe('unknown');
  });

  it.each([
    ['tool-linux-x64-checksums.txt', 'checksum'],
    ['tool-linux-x64.tar.gz.sig', 'signature'],
    ['tool-linux-x64-symbols.zip', 'debug'],
    ['tool-linux-x64-delta.zip', 'update'],
  ])('detects auxiliary purpose before artifact format for %s', (name, kind) => {
    expect(classify(name).kind).toBe(kind);
  });

  it.each([
    ['tool-linux-windows-x64.zip', 'os'],
    ['tool-linux-x64-arm64.zip', 'arch'],
    ['tool-linux-x64-musl-glibc.zip', 'libc'],
    ['tool-linux-x64.exe', 'os'],
    ['tool-windows-x64-musl.exe', 'libc'],
  ])('retains conflict evidence for %s', (name, field) => {
    const result = classify(name);
    expect(result.evidence[field as 'os' | 'arch' | 'libc'].status).toBe('conflict');
    expect(result.diagnostics.some((diagnostic) => diagnostic.field === field)).toBe(true);
  });
});
