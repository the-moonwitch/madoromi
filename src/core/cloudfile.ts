// Preprocessed scans: `bun run preprocess` extracts every sample ahead of time into one binary
// file per ink plus a manifest, so the app can skip in-browser extraction.

export const PRECOMPUTED_DIR = "precomputed";
/** Scans are scaled to fit this before extraction, both when preprocessing and in the browser. */
export const MAX_SIDE = 1200;
/** Oklab is stored as int16 at this many steps per unit (bins are 0.005 wide, so plenty). */
const SCALE = 30000;

export type Crop = [number, number, number, number];

/** Everything kept about one scan: its colour cloud and a few stats. */
export interface ScanCloud {
  width: number;
  height: number;
  paper: [number, number, number];
  paperCoverage: number;
  inkPixels: number;
  fringePixels: number;
  speckPixels: number;
  clippedPixels: number;
  /** Bin mean oklab, flat [L, a, b, ...]. Single-pixel bins are dropped as noise. */
  bins: Float32Array;
  binCount: Uint32Array;
}

export interface ManifestScan extends Omit<ScanCloud, "bins" | "binCount"> {
  file: string;
  crop?: Crop;
  /** Source file's size and modification time, to spot changed files. */
  bytes: number;
  mtime: number;
  /** Byte offset of this scan's data in the ink's .bin file, and its bin count. */
  offset: number;
  count: number;
}

export interface Manifest {
  version: number;
  maxSide: number;
  inks: Record<string, { file: string; scans: ManifestScan[] }>;
}

/** Bytes one scan takes in a .bin file: int16 L, a, b per bin, then uint16 counts. */
export const scanBytes = (count: number) => count * 8;

export function encodeScan(cloud: ScanCloud, out: DataView, offset: number): void {
  const n = cloud.binCount.length;
  for (let i = 0; i < n * 3; i++) out.setInt16(offset + i * 2, Math.round(cloud.bins[i] * SCALE), true);
  for (let i = 0; i < n; i++) out.setUint16(offset + n * 6 + i * 2, Math.min(65535, cloud.binCount[i]), true);
}

export function decodeScan(buf: ArrayBuffer, m: ManifestScan): ScanCloud {
  const view = new DataView(buf);
  const n = m.count;
  const bins = new Float32Array(n * 3);
  const binCount = new Uint32Array(n);
  for (let i = 0; i < n * 3; i++) bins[i] = view.getInt16(m.offset + i * 2, true) / SCALE;
  for (let i = 0; i < n; i++) binCount[i] = view.getUint16(m.offset + n * 6 + i * 2, true);
  const { file: _f, crop: _c, bytes: _b, mtime: _m, offset: _o, count: _n, ...stats } = m;
  return { ...stats, bins, binCount };
}

/** Keep only bins with at least 2 pixels: single pixels are noise, and they're most of the bins. */
export function dropSingletons(bins: Float32Array, binCount: Uint32Array) {
  let keep = 0;
  for (let i = 0; i < binCount.length; i++) if (binCount[i] >= 2) keep++;
  const b = new Float32Array(keep * 3);
  const c = new Uint32Array(keep);
  for (let i = 0, j = 0; i < binCount.length; i++) {
    if (binCount[i] < 2) continue;
    b.set(bins.subarray(i * 3, i * 3 + 3), j * 3);
    c[j++] = binCount[i];
  }
  return { bins: b, binCount: c };
}

/** Sample files are `[NN_]<ink>[--anything].<ext>`; group 1 is the ink. */
export const SAMPLE_FILE = /^(?:\d+_)?([a-z-]+?)(?:--[^/]*)?\.(?:webp|jpe?g|png)$/;
