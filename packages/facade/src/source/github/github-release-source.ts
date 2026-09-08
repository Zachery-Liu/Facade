import { z } from 'zod';
import { FacadeError } from '../../runtime/facade-error.js';
import {
  RawAssetSchema,
  RawReleaseSchema,
  RepositoryMetadataSchema,
  RepositorySnapshotSchema,
  type RawAsset,
  type RawRelease,
  type ReleaseSource,
  type RepositoryMetadata,
  type RepositorySnapshot,
} from '../repository-snapshot.js';

const DEFAULT_API_URL = 'https://api.github.com';
const ASSETS_PER_PAGE = 100;
const MAX_RETRY_DELAY_MS = 1_000;
const MAX_ATTEMPTS = 10;

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
    if (!Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1 || this.maxAttempts > MAX_ATTEMPTS) {
      throw new FacadeError('SOURCE_INVALID_RETRY_POLICY', 'maxAttempts must be an integer between 1 and 10.');
    }
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.token = options.token;
  }

  async getRepository(): Promise<RepositoryMetadata> {
    const response = await this.request('/repos/' + this.owner + '/' + this.repositoryName, 'repository');
    const parsed = parseResponse(RepositoryResponseSchema, await parseJson(response, 'repository'), 'repository');
    return parseResponse(RepositoryMetadataSchema, { fullName: parsed.full_name, htmlUrl: parsed.html_url }, 'repository');
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
      const parsed = parseResponse(z.array(AssetResponseSchema), await parseJson(response, 'assets'), 'assets');
      assets.push(...parsed.map((asset) => parseResponse(RawAssetSchema, { id: String(asset.id), name: asset.name, downloadUrl: asset.browser_download_url, size: asset.size }, 'assets')));
      if (parsed.length < ASSETS_PER_PAGE) return assets;
    }
  }

  async getSnapshot(strategy: 'github-latest' | 'tag', tag?: string): Promise<RepositorySnapshot> {
    const repository = await this.getRepository();
    const release = strategy === 'tag'
      ? await this.getReleaseByTag(requireTag(tag))
      : await this.getLatestRelease();
    return parseResponse(RepositorySnapshotSchema, { repository, release, assets: await this.getReleaseAssets(release.id) }, 'snapshot');
  }

  private async getRelease(path: string, kind: 'latest' | 'tag'): Promise<RawRelease> {
    const response = await this.request(path, kind);
    const parsed = parseResponse(ReleaseResponseSchema, await parseJson(response, 'release'), 'release');
    if (parsed.draft) throw new FacadeError('SOURCE_DRAFT_RELEASE', 'The selected release is a draft and cannot be published.');
    return parseResponse(RawReleaseSchema, {
      id: String(parsed.id),
      tagName: parsed.tag_name,
      name: parsed.name ?? parsed.tag_name,
      draft: parsed.draft,
      prerelease: parsed.prerelease,
    }, 'release');
  }

  private async request(path: string, kind: 'repository' | 'latest' | 'tag' | 'assets'): Promise<Response> {
    let cause: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetch(this.apiUrl + path, { headers: this.headers() });
        if (response.ok) return response;
        if (isRetryableResponse(response) && attempt < this.maxAttempts) {
          const delay = retryDelay(response, attempt);
          if (delay !== undefined) {
            await this.sleep(delay);
            continue;
          }
        }
        throw this.statusError(response, kind);
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

  private statusError(response: Response, kind: 'repository' | 'latest' | 'tag' | 'assets'): FacadeError {
    const { status } = response;
    if (isRateLimited(response)) return new FacadeError('SOURCE_RATE_LIMITED', 'GitHub rate-limited this release source.');
    if (status === 401) return new FacadeError('SOURCE_AUTHENTICATION_REQUIRED', 'GitHub authentication is required to read this release source.');
    if (status === 403) return new FacadeError('SOURCE_ACCESS_DENIED', 'GitHub denied access to this release source.');
    if (status === 404 && kind === 'latest') return new FacadeError('SOURCE_LATEST_NOT_FOUND', 'This repository has no published latest release.');
    if (status === 404 && kind === 'tag') return new FacadeError('SOURCE_TAG_NOT_FOUND', 'The requested release tag was not found.');
    if (status === 404 && kind === 'repository') return new FacadeError('SOURCE_REPOSITORY_NOT_FOUND', 'The requested GitHub repository was not found.');
    return new FacadeError('SOURCE_API_UNAVAILABLE', 'GitHub could not provide the requested release data.');
  }

}

function requireTag(tag: string | undefined): string {
  if (tag === undefined || tag.length === 0) throw new FacadeError('SOURCE_TAG_REQUIRED', 'A release tag is required when selecting a tagged release.');
  return tag;
}

function isRetryableResponse(response: Response): boolean {
  return isRateLimited(response) || response.status >= 500;
}

function isRateLimited(response: Response): boolean {
  return response.status === 429 || (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')));
}

function retryDelay(response: Response, attempt: number): number | undefined {
  const retryAfterValue = response.headers.get('retry-after');
  if (retryAfterValue !== null) return boundedDelay(Number(retryAfterValue) * 1000);
  if (response.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(response.headers.get('x-ratelimit-reset'));
    return Number.isFinite(reset) ? boundedDelay(Math.max(0, reset * 1000 - Date.now())) : undefined;
  }
  return response.status >= 500 ? boundedDelay(attempt * 100) : undefined;
}

function boundedDelay(delay: number): number | undefined {
  return Number.isFinite(delay) && delay >= 0 && delay <= MAX_RETRY_DELAY_MS ? delay : undefined;
}

async function parseJson(response: Response, resource: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw invalidResponse(resource, cause);
  }
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown, resource: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw invalidResponse(resource, parsed.error);
  return parsed.data;
}

function invalidResponse(resource: string, cause: unknown): FacadeError {
  return new FacadeError('SOURCE_INVALID_RESPONSE', 'GitHub returned an invalid ' + resource + ' response.', { cause });
}
