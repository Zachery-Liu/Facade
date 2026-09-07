import { z } from 'zod';
import { FacadeError } from '../../runtime/facade-error.js';
import type { RawAsset, RawRelease, ReleaseSource, RepositoryMetadata, RepositorySnapshot } from '../repository-snapshot.js';

const DEFAULT_API_URL = 'https://api.github.com';
const ASSETS_PER_PAGE = 100;
const MAX_RETRY_DELAY_MS = 1_000;

const RepositoryResponseSchema = z.object({ full_name: z.string(), html_url: z.string().url() }).passthrough();
const ReleaseResponseSchema = z.object({
  id: z.number().int().nonnegative(),
  tag_name: z.string().min(1),
  name: z.string().nullable(),
  draft: z.boolean(),
  prerelease: z.boolean(),
}).passthrough();
const AssetResponseSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  browser_download_url: z.string().url(),
  size: z.number().int().nonnegative(),
}).passthrough();

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface GitHubReleaseSourceOptions {
  readonly repository: string;
  readonly token?: string;
  readonly apiUrl?: string;
  readonly fetch?: FetchLike;
  readonly maxAttempts?: number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

export class GitHubReleaseSource implements ReleaseSource {
  private readonly owner: string;
  private readonly repositoryName: string;
  private readonly apiUrl: string;
  private readonly fetch: FetchLike;
  private readonly maxAttempts: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly token: string | undefined;

  constructor(options: GitHubReleaseSourceOptions) {
    const [owner, repositoryName, ...remainder] = options.repository.split('/');
    if (owner === undefined || repositoryName === undefined || remainder.length > 0 || owner.length === 0 || repositoryName.length === 0) {
      throw new FacadeError('SOURCE_INVALID_REPOSITORY', 'Repository must use the owner/repository format.');
    }
    this.owner = owner;
    this.repositoryName = repositoryName;
    this.apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
    this.fetch = options.fetch ?? globalThis.fetch;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.token = options.token;
  }

  async getRepository(): Promise<RepositoryMetadata> {
    const response = await this.request('/repos/' + this.owner + '/' + this.repositoryName, 'repository');
    const parsed = RepositoryResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw this.invalidResponse('repository');
    return { fullName: parsed.data.full_name, htmlUrl: parsed.data.html_url };
  }

  async getLatestRelease(): Promise<RawRelease> {
    return this.getRelease('/repos/' + this.owner + '/' + this.repositoryName + '/releases/latest', 'latest');
  }

  async getReleaseByTag(tag: string): Promise<RawRelease> {
    return this.getRelease('/repos/' + this.owner + '/' + this.repositoryName + '/releases/tags/' + encodeURIComponent(tag), 'tag');
  }

  async getReleaseAssets(releaseId: string): Promise<RawAsset[]> {
    const assets: RawAsset[] = [];
    for (let page = 1; ; page += 1) {
      const response = await this.request('/repos/' + this.owner + '/' + this.repositoryName + '/releases/' + encodeURIComponent(releaseId) + '/assets?per_page=' + ASSETS_PER_PAGE + '&page=' + page, 'assets');
      const parsed = z.array(AssetResponseSchema).safeParse(await response.json());
      if (!parsed.success) throw this.invalidResponse('assets');
      assets.push(...parsed.data.map((asset) => ({ id: String(asset.id), name: asset.name, downloadUrl: asset.browser_download_url, size: asset.size })));
      if (parsed.data.length < ASSETS_PER_PAGE) return assets;
    }
  }

  async getSnapshot(strategy: 'github-latest' | 'tag', tag?: string): Promise<RepositorySnapshot> {
    const repository = await this.getRepository();
    const release = strategy === 'tag'
      ? await this.getReleaseByTag(requireTag(tag))
      : await this.getLatestRelease();
    return { repository, release, assets: await this.getReleaseAssets(release.id) };
  }

  private async getRelease(path: string, kind: 'latest' | 'tag'): Promise<RawRelease> {
    const response = await this.request(path, kind);
    const parsed = ReleaseResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw this.invalidResponse('release');
    if (parsed.data.draft) throw new FacadeError('SOURCE_DRAFT_RELEASE', 'The selected release is a draft and cannot be published.');
    return {
      id: String(parsed.data.id),
      tagName: parsed.data.tag_name,
      name: parsed.data.name ?? parsed.data.tag_name,
      draft: parsed.data.draft,
      prerelease: parsed.data.prerelease,
    };
  }

  private async request(path: string, kind: 'repository' | 'latest' | 'tag' | 'assets'): Promise<Response> {
    let cause: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetch(this.apiUrl + path, { headers: this.headers() });
        if (response.ok) return response;
        if (isRetryableStatus(response.status) && attempt < this.maxAttempts) {
          await this.sleep(retryDelay(response, attempt));
          continue;
        }
        throw this.statusError(response.status, kind);
      } catch (error) {
        if (error instanceof FacadeError) throw error;
        cause = error;
        if (attempt < this.maxAttempts) {
          await this.sleep(attempt * 100);
          continue;
        }
      }
    }
    throw new FacadeError('SOURCE_NETWORK_UNAVAILABLE', 'Unable to reach the GitHub release source.', { cause });
  }

  private headers(): HeadersInit {
    return this.token === undefined
      ? { accept: 'application/vnd.github+json' }
      : { accept: 'application/vnd.github+json', authorization: 'Bearer ' + this.token };
  }

  private statusError(status: number, kind: 'repository' | 'latest' | 'tag' | 'assets'): FacadeError {
    if (status === 401) return new FacadeError('SOURCE_AUTHENTICATION_REQUIRED', 'GitHub authentication is required to read this release source.');
    if (status === 403) return new FacadeError('SOURCE_ACCESS_DENIED', 'GitHub denied access to this release source.');
    if (status === 429) return new FacadeError('SOURCE_RATE_LIMITED', 'GitHub rate-limited this release source.');
    if (status === 404 && kind === 'latest') return new FacadeError('SOURCE_LATEST_NOT_FOUND', 'This repository has no published latest release.');
    if (status === 404 && kind === 'tag') return new FacadeError('SOURCE_TAG_NOT_FOUND', 'The requested release tag was not found.');
    if (status === 404 && kind === 'repository') return new FacadeError('SOURCE_REPOSITORY_NOT_FOUND', 'The requested GitHub repository was not found.');
    return new FacadeError('SOURCE_API_UNAVAILABLE', 'GitHub could not provide the requested release data.');
  }

  private invalidResponse(resource: string): FacadeError {
    return new FacadeError('SOURCE_INVALID_RESPONSE', 'GitHub returned an invalid ' + resource + ' response.');
  }
}

function requireTag(tag: string | undefined): string {
  if (tag === undefined || tag.length === 0) throw new FacadeError('SOURCE_TAG_REQUIRED', 'A release tag is required when selecting a tagged release.');
  return tag;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('retry-after'));
  const delay = Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : attempt * 100;
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}
