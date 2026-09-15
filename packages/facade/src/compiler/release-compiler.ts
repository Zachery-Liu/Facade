import type { FacadeConfigInput } from '../config/facade-config.js';
import type { ReleasePageManifest } from '../manifest/release-page-manifest.js';
import type { RepositorySnapshot } from '../source/repository-snapshot.js';
import { resolveRelease } from './release-resolver.js';

export function compileReleaseSnapshot(snapshot: RepositorySnapshot, config?: FacadeConfigInput): ReleasePageManifest {
  return resolveRelease(snapshot, { ...(config === undefined ? {} : { config }) }).manifest;
}
