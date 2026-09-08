import { describe, expect, it } from 'vitest';
import { FacadeConfigSchema } from '../src/config/facade-config.js';
import { FacadeError } from '../src/runtime/facade-error.js';
import { GitHubReleaseSource } from '../src/source/github/github-release-source.js';
import { resolveGitHubSourceOptions } from '../src/source/github/source-options.js';
import { buildGitHubRelease } from '../src/source/github/build-github-release.js';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repository = { full_name: 'owner/repository', html_url: 'https://github.com/owner/repository' };
const release = { id: 7, tag_name: 'v1.2.3', name: 'Version 1.2.3', draft: false, prerelease: false };
const asset = (id: number) => ({ id, name: 'asset-' + id, browser_download_url: 'https://example.test/asset-' + id, size: id });

describe('GitHubReleaseSource', () => {
  it('normalizes the selected release and fetches every asset page', async () => {
    const requested: string[] = [];
    const source = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async (url) => {
      requested.push(url);
      if (url.endsWith('/repos/owner/repository')) return json(repository);
      if (url.includes('/releases/latest')) return json(release);
      if (url.endsWith('&page=1')) return json(Array.from({ length: 100 }, (_, index) => asset(index + 1)));
      return json([asset(101)]);
    } });

    await expect(source.getSnapshot('github-latest')).resolves.toEqual({
      repository: { fullName: 'owner/repository', htmlUrl: 'https://github.com/owner/repository' },
      release: { id: '7', tagName: 'v1.2.3', name: 'Version 1.2.3', draft: false, prerelease: false },
      assets: Array.from({ length: 101 }, (_, index) => ({ id: String(index + 1), name: 'asset-' + (index + 1), downloadUrl: 'https://example.test/asset-' + (index + 1), size: index + 1 })),
    });
    expect(requested).toHaveLength(4);
  });

  it('uses the exact requested tag and rejects draft releases', async () => {
    const source = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async (url) => json({ ...release, draft: true, tag_name: url.endsWith('v1.2.3') ? 'v1.2.3' : 'wrong' }) });
    await expect(source.getReleaseByTag('v1.2.3')).rejects.toMatchObject({ code: 'SOURCE_DRAFT_RELEASE' });
  });

  it('classifies missing latest releases and authentication failures without token disclosure', async () => {
    const latest = new GitHubReleaseSource({ repository: 'owner/repository', token: 'secret-token', fetch: async () => json({}, 404) });
    await expect(latest.getLatestRelease()).rejects.toMatchObject({ code: 'SOURCE_LATEST_NOT_FOUND' });
    const auth = new GitHubReleaseSource({ repository: 'owner/repository', token: 'secret-token', fetch: async () => json({}, 401) });
    await expect(auth.getRepository()).rejects.toSatisfy((error: unknown) => error instanceof FacadeError && error.code === 'SOURCE_AUTHENTICATION_REQUIRED' && !error.message.includes('secret-token'));
  });

  it('classifies access denial and an absent explicitly selected tag', async () => {
    const denied = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async () => json({}, 403) });
    await expect(denied.getRepository()).rejects.toMatchObject({ code: 'SOURCE_ACCESS_DENIED' });
    const missingTag = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async () => json({}, 404) });
    await expect(missingTag.getReleaseByTag('v9')).rejects.toMatchObject({ code: 'SOURCE_TAG_NOT_FOUND' });
  });

  it('classifies 403 rate-limit responses separately from access denial', async () => {
    const source = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async () => json({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '9999999999' }) });
    await expect(source.getRepository()).rejects.toMatchObject({ code: 'SOURCE_RATE_LIMITED' });
  });

  it('classifies malformed JSON and invalid neutral source fields', async () => {
    const malformed = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async () => new Response('{', { status: 200 }) });
    await expect(malformed.getRepository()).rejects.toMatchObject({ code: 'SOURCE_INVALID_RESPONSE' });
    const unsafeUrl = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async () => json({ ...repository, html_url: 'javascript:alert(1)' }) });
    await expect(unsafeUrl.getRepository()).rejects.toMatchObject({ code: 'SOURCE_INVALID_RESPONSE' });
  });

  it('retries transient network failures with a bounded attempt count', async () => {
    let calls = 0;
    const source = new GitHubReleaseSource({ repository: 'owner/repository', maxAttempts: 2, sleep: async () => undefined, fetch: async () => {
      calls += 1;
      throw new TypeError('offline');
    } });
    await expect(source.getRepository()).rejects.toMatchObject({ code: 'SOURCE_NETWORK_UNAVAILABLE' });
    expect(calls).toBe(2);
  });

  it('does not retry before a server-provided rate-limit delay', async () => {
    let calls = 0;
    const delays: number[] = [];
    const source = new GitHubReleaseSource({ repository: 'owner/repository', maxAttempts: 2, sleep: async (milliseconds) => { delays.push(milliseconds); }, fetch: async () => {
      calls += 1;
      return json({}, 429, { 'retry-after': '99' });
    } });
    await expect(source.getRepository()).rejects.toMatchObject({ code: 'SOURCE_RATE_LIMITED' });
    expect(calls).toBe(1);
    expect(delays).toEqual([]);
  });

  it('retries short transient server failures with a bounded delay', async () => {
    let calls = 0;
    const delays: number[] = [];
    const source = new GitHubReleaseSource({ repository: 'owner/repository', maxAttempts: 2, sleep: async (milliseconds) => { delays.push(milliseconds); }, fetch: async () => {
      calls += 1;
      return calls === 1 ? json({}, 503) : json(repository);
    } });
    await expect(source.getRepository()).resolves.toEqual({ fullName: 'owner/repository', htmlUrl: 'https://github.com/owner/repository' });
    expect(delays).toEqual([100]);
  });

  it('rejects unbounded or empty retry policies', () => {
    expect(() => new GitHubReleaseSource({ repository: 'owner/repository', maxAttempts: 0 })).toThrow(/between 1 and 10/);
    expect(() => new GitHubReleaseSource({ repository: 'owner/repository', maxAttempts: 11 })).toThrow(/between 1 and 10/);
  });
});

describe('GitHub source option precedence', () => {
  const config = FacadeConfigSchema.parse({ schema: 1, repository: 'config/repository', release: { strategy: 'github-latest' } });

  it('uses CLI values before environment and config values', () => {
    expect(resolveGitHubSourceOptions(config, { FACADE_REPOSITORY: 'environment/repository', FACADE_RELEASE_STRATEGY: 'tag', FACADE_RELEASE_TAG: 'v2', GITHUB_TOKEN: 'environment-token' }, { repository: 'cli/repository', strategy: 'tag', tag: 'v3', token: 'cli-token' }))
      .toEqual({ repository: 'cli/repository', strategy: 'tag', tag: 'v3', token: 'cli-token' });
  });

  it('falls back from environment to config and omits absent optional values', () => {
    expect(resolveGitHubSourceOptions(config, {})).toEqual({ repository: 'config/repository', strategy: 'github-latest' });
    expect(resolveGitHubSourceOptions(config, { FACADE_REPOSITORY: 'environment/repository', FACADE_RELEASE_STRATEGY: 'tag', FACADE_RELEASE_TAG: 'v2', GITHUB_TOKEN: 'environment-token' }))
      .toEqual({ repository: 'environment/repository', strategy: 'tag', tag: 'v2', token: 'environment-token' });
  });

  it('drops lower-precedence tags when the resolved strategy is github-latest', () => {
    const taggedConfig = FacadeConfigSchema.parse({ schema: 1, repository: 'config/repository', release: { strategy: 'tag', tag: 'v1' } });
    expect(resolveGitHubSourceOptions(taggedConfig, { FACADE_RELEASE_TAG: 'v2' }, { strategy: 'github-latest' }))
      .toEqual({ repository: 'config/repository', strategy: 'github-latest' });
  });

  it('requires a tag after precedence is applied', () => {
    expect(() => resolveGitHubSourceOptions(config, { FACADE_RELEASE_STRATEGY: 'tag' })).toThrow(/release tag/i);
  });

  it('rejects an unsupported environment strategy', () => {
    expect(() => resolveGitHubSourceOptions(config, { FACADE_RELEASE_STRATEGY: 'beta' })).toThrow(/github-latest or tag/i);
  });
});

describe('GitHub build integration', () => {
  it('passes a live-source snapshot to the shared build boundary', async () => {
    const outDir = join(await mkdtemp(join(tmpdir(), 'facade-github-build-')), 'site');
    const source = new GitHubReleaseSource({ repository: 'owner/repository', fetch: async (url) => {
      if (url.endsWith('/repos/owner/repository')) return json(repository);
      if (url.includes('/releases/latest')) return json(release);
      return json([asset(1)]);
    } });
    await expect(buildGitHubRelease(source, { strategy: 'github-latest', outDir })).resolves.toMatchObject({ basePath: '/' });
    await expect(readFile(join(outDir, 'manifest.json'), 'utf8')).resolves.toContain('v1.2.3');
  });
});

function json(value: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}
