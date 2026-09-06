import type { ManifestAsset } from '../../../manifest/release-page-manifest.js';
import { AssetCard } from './asset-card.js';
type AssetListProps = { assets: readonly ManifestAsset[] };
export function AssetList({ assets }: AssetListProps) { return <ul aria-label="Release downloads">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</ul>; }
