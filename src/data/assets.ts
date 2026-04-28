import assetManifest from '../../assets.manifest.json';

export type AssetCategory =
  | 'audio'
  | 'background'
  | 'icon'
  | 'portrait'
  | 'tile'
  | 'token'
  | 'ui';

export type AssetSpec = {
  assetId: string;
  category: AssetCategory;
  purpose: string;
  usedBy: string[];
  format: string;
  placeholderAllowed: boolean;
  replaceableAfterV1: boolean;
  spec: string;
  variants?: string[];
  notes?: string;
  loop?: boolean;
  transparentBackground?: boolean;
  targetPx?: number;
  aspectRatio?: string;
  volumeRole?: 'music' | 'sfx';
};

export type AssetManifest = {
  version: number;
  notes: string[];
  assets: AssetSpec[];
};

export const assets = (assetManifest as AssetManifest).assets;

export function getAsset(assetId: string): AssetSpec {
  const asset = assets.find((candidate) => candidate.assetId === assetId);

  if (!asset) {
    throw new Error(`Unknown assetId: ${assetId}`);
  }

  return asset;
}

export function useAsset(assetId: string): AssetSpec {
  return getAsset(assetId);
}
