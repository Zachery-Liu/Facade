import type { ManifestAsset } from '../../../manifest/release-page-manifest.js';
type AssetCardProps = { asset: ManifestAsset };
export function AssetCard({ asset }: AssetCardProps) { return <li><a href={asset.downloadUrl}>{asset.label}</a></li>; }
