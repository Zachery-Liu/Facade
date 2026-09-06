import type { ReleasePageManifest } from '../../../manifest/release-page-manifest.js';
import { AssetList } from './asset-list.js';
type ReleasePageProps = { manifest: ReleasePageManifest };
export function ReleasePage({ manifest }: ReleasePageProps) { return <main><h1>{manifest.productName}</h1><p>Release {manifest.releaseTag}</p><AssetList assets={manifest.assets} /></main>; }
