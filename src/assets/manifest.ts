// ─── Asset Manifest Types ───────────────────────────────────
// Defines the structure of manifest.json used by LoadController.

/** Single asset entry in a bundle */
export interface AssetEntry {
  /** Unique alias for referencing this asset */
  alias: string;
  /** Path to the asset file (relative to public/) */
  src: string;
}

/** A named group of assets loaded together */
export interface AssetBundle {
  /** Bundle identifier (e.g. 'core', 'world-1', 'audio') */
  name: string;
  /** Human-readable description */
  description: string;
  /** Assets in this bundle */
  assets: AssetEntry[];
}

/** Root manifest structure */
export interface AssetManifest {
  /** Schema version */
  version: number;
  /** Build timestamp */
  buildTime: string;
  /** All asset bundles */
  bundles: AssetBundle[];
}

/** Bundle names used by the game */
export type BundleName = 'core' | `world-${number}` | 'audio';
