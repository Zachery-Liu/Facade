import type { ReleasePageManifest } from '../../../manifest/release-page-manifest.js';
import { AssetList } from './asset-list.js';
type ReleasePageProps = { manifest: ReleasePageManifest; basePath?: string };
export function ReleasePage({ manifest, basePath = '/' }: ReleasePageProps) { return <main><h1>{manifest.productName}</h1><p>Release {manifest.releaseTag}</p><nav aria-label="Release files"><a href={basePath + 'manifest.json'}>Manifest</a><a href={basePath + 'install.md'}>Install</a><a href={basePath + 'llms.txt'}>LLMs</a></nav><AssetList assets={manifest.assets} /></main>; }
