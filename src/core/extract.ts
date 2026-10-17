// Stage 1: scanned image → paper estimate → ink-only colours → deduplicated oklab cloud.
//
// The ink is modelled as a filter over the paper: in linear RGB, pixel = paper × T.
// Optical density D = −ln(pixel / paper) is linear in the amount of ink (Beer–Lambert),
// and exp(−D) is what the same ink would look like on ideal white paper.

import { linearToOklab, linearToSrgb, srgb8ToLinear, type Vec3 } from "./color";

/** Bump whenever extraction's output changes, so cached and preprocessed clouds are redone. */
export const EXTRACT_VERSION = 11;

export interface ExtractOptions {
  /** Paper-estimate grid cell size, px. */
  cellSize: number;
  /** Fraction of the image border to ignore (scanner edges). */
  margin: number;
  /**
   * A pixel is ink when its strongest channel density exceeds this. Below ~0.2 the scan's noise
   * and compression bleed swamp the ink's colour: hue across those pixels is close to random
   * (agreement 0.06–0.36 vs 0.7–0.97 above), so they would only drag the ramp towards a tinted white.
   */
  densityThreshold: number;
  /** Oklab bin size for deduplication: [L, a, b]. */
  binSize: Vec3;
  /** Neighbourhood radius for spotting edge fringes, px. */
  fringeRadius: number;
  /** A pixel this much paler than its neighbourhood's mean density is an edge fringe (0.4 = 40%). */
  fringeTolerance: number;
  /** Connected ink marks smaller than this many px are specks (dust, scanner noise), not ink. */
  minSpeckArea: number;
  /**
   * A pixel with any channel at or below this 8-bit value is clipped at black: its true density
   * is unknown, and it reads as more saturated than the ink. Photos of saturated blues often
   * clip red for a third or more of the ink.
   */
  clipFloor: number;
}

export const defaultExtractOptions: ExtractOptions = {
  cellSize: 32,
  margin: 0.015,
  densityThreshold: 0.2,
  binSize: [0.005, 0.0025, 0.0025],
  fringeRadius: 2,
  fringeTolerance: 0.4,
  minSpeckArea: 40,
  clipFloor: 4,
};

export interface Extracted {
  width: number;
  height: number;
  /** Global paper colour, linear RGB. */
  paper: Vec3;
  /** Fraction of grid cells that showed clean paper. */
  paperCoverage: number;
  inkPixels: number;
  /** Ink pixels dropped as edge fringes. */
  fringePixels: number;
  /** Ink pixels dropped as isolated specks. */
  speckPixels: number;
  /** Ink pixels dropped because a channel was clipped at black. */
  clippedPixels: number;
  /** Per-bin mean oklab, flat [L, a, b, ...]. */
  bins: Float32Array;
  /** Per-bin mean optical density, flat [r, g, b, ...]. */
  binDensity: Float32Array;
  /** Pixels per bin. Used only to reject noise — never as a weight. */
  binCount: Uint32Array;
  /** Paper-removed render (ink on white), RGBA8, same size as input; empty without previews. */
  inkOnWhite: Uint8ClampedArray;
  /** Estimated paper, RGBA8. */
  paperImage: Uint8ClampedArray;
  /** Pixels feeding the cloud in their ink-on-white colour; fringes and specks in magenta, clipped in orange. */
  usedImage: Uint8ClampedArray;
}

const SRGB8_LINEAR = Float32Array.from({ length: 256 }, (_, v) => srgb8ToLinear(v));
const ENCODE_LUT = new Uint8Array(4097);
for (let i = 0; i <= 4096; i++) ENCODE_LUT[i] = Math.round(linearToSrgb(i / 4096) * 255);
const encode8 = (c: number) => ENCODE_LUT[Math.round(Math.min(1, Math.max(0, c)) * 4096)];

function percentile(values: Float32Array | number[], q: number): number {
  const s = Float32Array.from(values).sort();
  if (s.length === 0) return NaN;
  const i = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))));
  return s[i];
}

function median(values: number[]): number {
  return percentile(values, 0.5);
}

/** Normalised convolution on a grid: Gaussian blur of value·weight over blur of weight. */
function normalizedBlur(
  values: Float32Array[],
  weight: Float32Array,
  gw: number,
  gh: number,
  sigma: number,
): { out: Float32Array[]; wsum: Float32Array } {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  for (let i = -r; i <= r; i++) k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  const blur = (src: Float32Array): Float32Array => {
    const tmp = new Float32Array(gw * gh);
    const dst = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        let s = 0;
        for (let i = -r; i <= r; i++) {
          const xx = x + i;
          if (xx >= 0 && xx < gw) s += src[y * gw + xx] * k[i + r];
        }
        tmp[y * gw + x] = s;
      }
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        let s = 0;
        for (let i = -r; i <= r; i++) {
          const yy = y + i;
          if (yy >= 0 && yy < gh) s += tmp[yy * gw + x] * k[i + r];
        }
        dst[y * gw + x] = s;
      }
    return dst;
  };
  const wsum = blur(weight);
  const out = values.map((v) => {
    const vw = new Float32Array(gw * gh);
    for (let i = 0; i < vw.length; i++) vw[i] = v[i] * weight[i];
    const b = blur(vw);
    for (let i = 0; i < b.length; i++) b[i] = wsum[i] > 1e-6 ? b[i] / wsum[i] : 0;
    return b;
  });
  return { out, wsum };
}

export function extract(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: ExtractOptions = defaultExtractOptions,
  /** Also render the ink-on-white, paper and pixels-used images (3 × 4 bytes per pixel). */
  previews = true,
): Extracted {
  const n = width * height;
  // Without previews the image buffers are left empty and never touched.
  const image = () => new Uint8ClampedArray(previews ? n * 4 : 0);
  const lin = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  const Y = new Float32Array(n);
  linearize(rgba, lin[0], lin[1], lin[2], Y);

  const m = Math.round(opts.margin * Math.min(width, height));
  const x0 = m;
  const y0 = m;
  const x1 = width - m;
  const y1 = height - m;

  // --- Paper candidates per cell: mean colour of the brightest 10% of the cell.
  const cs = opts.cellSize;
  const gw = Math.ceil((x1 - x0) / cs);
  const gh = Math.ceil((y1 - y0) / cs);
  const cand = [new Float32Array(gw * gh), new Float32Array(gw * gh), new Float32Array(gw * gh)];
  const cellY: number[] = [];
  const hist = new Uint32Array(1024);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      hist.fill(0);
      const cx1 = Math.min(x1, x0 + (gx + 1) * cs);
      const cy1 = Math.min(y1, y0 + (gy + 1) * cs);
      let total = 0;
      for (let y = y0 + gy * cs; y < cy1; y++)
        for (let x = x0 + gx * cs; x < cx1; x++) {
          hist[Math.min(1023, Math.floor(Y[y * width + x] * 1024))]++;
          total++;
        }
      let above = 0;
      let bin = 1023;
      while (bin > 0 && above + hist[bin] <= total * 0.1) above += hist[bin--];
      const p90 = bin / 1024;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let c = 0;
      for (let y = y0 + gy * cs; y < cy1; y++)
        for (let x = x0 + gx * cs; x < cx1; x++) {
          const i = y * width + x;
          if (Y[i] >= p90) {
            sr += lin[0][i];
            sg += lin[1][i];
            sb += lin[2][i];
            c++;
          }
        }
      const ci = gy * gw + gx;
      cand[0][ci] = sr / c;
      cand[1][ci] = sg / c;
      cand[2][ci] = sb / c;
      cellY.push(0.2126 * cand[0][ci] + 0.7152 * cand[1][ci] + 0.0722 * cand[2][ci]);
    }

  // --- Global paper: median of the brightest 15% of cell candidates. Close-ups of a swab can be
  // mostly ink, so "the brighter half" would already include ink cells.
  const yTop = percentile(cellY, 0.85);
  const bright = cellY.map((y, i) => (y >= yTop ? i : -1)).filter((i) => i >= 0);
  const paper: Vec3 = [0, 1, 2].map((c) => median(bright.map((i) => cand[c][i]))) as Vec3;
  const paperLab = linearToOklab(...paper);

  // --- A cell shows clean paper when its candidate is neutral relative to the global paper.
  // Shading (scanner falloff) darkens paper but doesn't tint it; ink tints or darkens a lot.
  const valid = new Float32Array(gw * gh);
  const lab: Vec3 = [0, 0, 0];
  for (let i = 0; i < gw * gh; i++) {
    linearToOklab(cand[0][i], cand[1][i], cand[2][i], lab);
    const dab = Math.hypot(lab[1] - paperLab[1], lab[2] - paperLab[2]);
    const dL = paperLab[0] - lab[0];
    valid[i] = dab < 0.008 && dL < 0.025 && dL > -0.02 ? 1 : 0;
  }
  let paperCoverage = 0;
  for (let i = 0; i < valid.length; i++) paperCoverage += valid[i];
  paperCoverage /= valid.length;

  // --- Fill: fine smoothing where paper is dense, coarse further away, global as last resort.
  const fine = normalizedBlur(cand, valid, gw, gh, 1.5);
  const coarse = normalizedBlur(cand, valid, gw, gh, 6);
  const field = [new Float32Array(gw * gh), new Float32Array(gw * gh), new Float32Array(gw * gh)];
  for (let i = 0; i < gw * gh; i++) {
    const wf = Math.min(1, fine.wsum[i] / 2);
    const wc = Math.min(1, coarse.wsum[i] / 4);
    for (let c = 0; c < 3; c++) {
      const far = wc * coarse.out[c][i] + (1 - wc) * paper[c];
      field[c][i] = wf * fine.out[c][i] + (1 - wf) * far;
    }
    // Shading only dims paper; it doesn't tint it. Keep just the local brightness, in the
    // global paper's colour: cells beside a pale wash otherwise pick up a trace of the ink,
    // and dividing pale ink by an ink-tinted paper leaves it with the complementary tint.
    const yLocal = 0.2126 * field[0][i] + 0.7152 * field[1][i] + 0.0722 * field[2][i];
    const yPaper = 0.2126 * paper[0] + 0.7152 * paper[1] + 0.0722 * paper[2];
    const k = yLocal / yPaper;
    for (let c = 0; c < 3; c++) field[c][i] = paper[c] * k;
  }

  // --- Per pixel: bilinear paper, density, ink on white.
  const inkOnWhite = image();
  const paperImage = image();
  const dens = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  const dmax = new Float32Array(n);
  densityPass(lin[0], lin[1], lin[2], field[0], field[1], field[2], dens[0], dens[1], dens[2], dmax, width, height, gw, gh, x0, y0, cs);
  if (previews) renderInkAndPaper(dens[0], dens[1], dens[2], field[0], field[1], field[2], inkOnWhite, paperImage, width, height, gw, gh, x0, y0, cs);

  // --- Edge fringes. A pixel only partly covered by ink (stroke and wash edges, plus blur and
  // compression bleed) is a blend of ink and paper, not paler ink. It shows up as a pixel much
  // paler than its neighbourhood. A pale wash is as pale as its neighbours, so it stays.
  const r = opts.fringeRadius;
  const local = boxMean(dmax, width, height, r);

  // --- Specks: tiny isolated marks are dust or scanner noise. Every colour bin counts once,
  // so a few stray pixels can otherwise outvote real ink in the palest, sparsest band.
  const thr = opts.densityThreshold;
  const isInk = new Uint8Array(n);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) isInk[y * width + x] = dmax[y * width + x] >= thr ? 1 : 0;
  const speck = smallComponents(isInk, width, height, opts.minSpeckArea);

  // --- Bins
  const usedImage = image();
  const acc = binPass(
    lin[0], lin[1], lin[2], dens[0], dens[1], dens[2], dmax, local, speck,
    width, height, x0, y0, x1, y1, thr, srgb8ToLinear(opts.clipFloor) + 1e-7, 1 - opts.fringeTolerance, opts.binSize,
  );
  const { nb, accLab, accD, accN, inkPixels, fringePixels, speckPixels, clippedPixels } = acc;
  if (previews) paintUsed(acc.status, inkOnWhite, usedImage);

  const bins = new Float32Array(nb * 3);
  const binDensity = new Float32Array(nb * 3);
  const binCount = new Uint32Array(nb);
  for (let i = 0; i < nb; i++) {
    binCount[i] = accN[i];
    for (let c = 0; c < 3; c++) {
      bins[i * 3 + c] = accLab[i * 3 + c] / accN[i];
      binDensity[i * 3 + c] = accD[i * 3 + c] / accN[i];
    }
  }

  return {
    width,
    height,
    paper,
    paperCoverage,
    inkPixels,
    fringePixels,
    speckPixels,
    clippedPixels,
    bins,
    binDensity,
    binCount,
    inkOnWhite,
    paperImage,
    usedImage,
  };
}

/** Mean over a (2r+1)² window, clamped at the borders. */
function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    let c = 0;
    for (let x = -r; x < w; x++) {
      if (x + r < w) {
        s += src[y * w + x + r];
        c++;
      }
      if (x - r - 1 >= 0) {
        s -= src[y * w + x - r - 1];
        c--;
      }
      if (x >= 0) tmp[y * w + x] = s / c;
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    let c = 0;
    for (let y = -r; y < h; y++) {
      if (y + r < h) {
        s += tmp[(y + r) * w + x];
        c++;
      }
      if (y - r - 1 >= 0) {
        s -= tmp[(y - r - 1) * w + x];
        c--;
      }
      if (y >= 0) out[y * w + x] = s / c;
    }
  }
  return out;
}

/** Marks pixels of 8-connected components smaller than minArea. */
function smallComponents(mask: Uint8Array, w: number, h: number, minArea: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const comp: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    comp.length = 0;
    while (top) {
      const i = stack[--top];
      comp.push(i);
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (mask[j] && !seen[j]) {
            seen[j] = 1;
            stack[top++] = j;
          }
        }
    }
    if (comp.length < minArea) for (const i of comp) out[i] = 1;
  }
  return out;
}

/**
 * Merges several scans of one ink into one cloud. Each scan has had its own paper removed, so
 * their colours are comparable; bins that land in the same oklab cell are combined.
 */
export function mergeBins(
  parts: (Pick<Extracted, "bins" | "binCount"> & { binDensity?: Float32Array })[],
  binSize: Vec3 = defaultExtractOptions.binSize,
): Pick<Extracted, "bins" | "binDensity" | "binCount"> {
  const [bL, bA, bB] = binSize;
  const index = new Map<number, number>();
  const lab: number[] = [];
  const den: number[] = [];
  const cnt: number[] = [];
  for (const p of parts)
    for (let i = 0; i < p.binCount.length; i++) {
      const L = p.bins[i * 3];
      const A = p.bins[i * 3 + 1];
      const B = p.bins[i * 3 + 2];
      const key =
        (Math.round(L / bL) + 512) * 1048576 + (Math.round(A / bA) + 512) * 1024 + (Math.round(B / bB) + 512);
      let j = index.get(key);
      if (j === undefined) {
        j = cnt.length;
        index.set(key, j);
        lab.push(0, 0, 0);
        den.push(0, 0, 0);
        cnt.push(0);
      }
      const c = p.binCount[i];
      for (let k = 0; k < 3; k++) {
        lab[j * 3 + k] += p.bins[i * 3 + k] * c;
        den[j * 3 + k] += (p.binDensity?.[i * 3 + k] ?? 0) * c;
      }
      cnt[j] += c;
    }
  const n = cnt.length;
  const bins = new Float32Array(n * 3);
  const binDensity = new Float32Array(n * 3);
  const binCount = new Uint32Array(cnt);
  for (let j = 0; j < n; j++)
    for (let k = 0; k < 3; k++) {
      bins[j * 3 + k] = lab[j * 3 + k] / cnt[j];
      binDensity[j * 3 + k] = den[j * 3 + k] / cnt[j];
    }
  return { bins, binDensity, binCount };
}

function linearize(rgba: Uint8ClampedArray, r: Float32Array, g: Float32Array, b: Float32Array, Y: Float32Array) {
  const n = Y.length;
  for (let i = 0; i < n; i++) {
    const lr = SRGB8_LINEAR[rgba[i * 4]];
    const lg = SRGB8_LINEAR[rgba[i * 4 + 1]];
    const lb = SRGB8_LINEAR[rgba[i * 4 + 2]];
    r[i] = lr;
    g[i] = lg;
    b[i] = lb;
    Y[i] = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  }
}

/** Per pixel: bilinear paper from the grid, then optical density per channel and its maximum. */
function densityPass(
  l0: Float32Array, l1: Float32Array, l2: Float32Array,
  f0: Float32Array, f1: Float32Array, f2: Float32Array,
  d0: Float32Array, d1: Float32Array, d2: Float32Array, dmax: Float32Array,
  width: number, height: number, gw: number, gh: number, x0: number, y0: number, cs: number,
) {
  for (let y = 0; y < height; y++) {
    const fy = Math.min(gh - 1, Math.max(0, (y - y0) / cs - 0.5));
    const iy0 = Math.floor(fy);
    const iy1 = Math.min(gh - 1, iy0 + 1);
    const ty = fy - iy0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(gw - 1, Math.max(0, (x - x0) / cs - 0.5));
      const ix0 = Math.floor(fx);
      const ix1 = Math.min(gw - 1, ix0 + 1);
      const tx = fx - ix0;
      const w00 = (1 - tx) * (1 - ty);
      const w01 = tx * (1 - ty);
      const w10 = (1 - tx) * ty;
      const w11 = tx * ty;
      const a00 = iy0 * gw + ix0;
      const a01 = iy0 * gw + ix1;
      const a10 = iy1 * gw + ix0;
      const a11 = iy1 * gw + ix1;
      const pr = f0[a00] * w00 + f0[a01] * w01 + f0[a10] * w10 + f0[a11] * w11;
      const pg = f1[a00] * w00 + f1[a01] * w01 + f1[a10] * w10 + f1[a11] * w11;
      const pb = f2[a00] * w00 + f2[a01] * w01 + f2[a10] * w10 + f2[a11] * w11;
      const i = y * width + x;
      let dr = -Math.log((l0[i] > 1e-5 ? l0[i] : 1e-5) / pr);
      let dg = -Math.log((l1[i] > 1e-5 ? l1[i] : 1e-5) / pg);
      let db = -Math.log((l2[i] > 1e-5 ? l2[i] : 1e-5) / pb);
      if (dr < 0) dr = 0;
      if (dg < 0) dg = 0;
      if (db < 0) db = 0;
      d0[i] = dr;
      d1[i] = dg;
      d2[i] = db;
      dmax[i] = dr > dg ? (dr > db ? dr : db) : dg > db ? dg : db;
    }
  }
}

function renderInkAndPaper(
  d0: Float32Array, d1: Float32Array, d2: Float32Array,
  f0: Float32Array, f1: Float32Array, f2: Float32Array,
  inkOnWhite: Uint8ClampedArray, paperImage: Uint8ClampedArray,
  width: number, height: number, gw: number, gh: number, x0: number, y0: number, cs: number,
) {
  for (let y = 0; y < height; y++) {
    const gy = Math.min(gh - 1, Math.max(0, Math.round((y - y0) / cs - 0.5)));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(gw - 1, Math.max(0, Math.round((x - x0) / cs - 0.5)));
      const i = y * width + x;
      const o = i * 4;
      const g = gy * gw + gx;
      inkOnWhite[o] = encode8(Math.exp(-d0[i]));
      inkOnWhite[o + 1] = encode8(Math.exp(-d1[i]));
      inkOnWhite[o + 2] = encode8(Math.exp(-d2[i]));
      inkOnWhite[o + 3] = 255;
      paperImage[o] = encode8(f0[g]);
      paperImage[o + 1] = encode8(f1[g]);
      paperImage[o + 2] = encode8(f2[g]);
      paperImage[o + 3] = 255;
    }
  }
}

/** Pixel status from binPass: 0 not ink, 1 clipped, 2 speck or fringe, 3 used. */
function paintUsed(status: Uint8Array, inkOnWhite: Uint8ClampedArray, used: Uint8ClampedArray) {
  for (let i = 0; i < status.length; i++) {
    const o = i * 4;
    const s = status[i];
    used[o] = s === 3 ? inkOnWhite[o] : 255;
    used[o + 1] = s === 3 ? inkOnWhite[o + 1] : s === 1 ? 150 : s === 2 ? 60 : 255;
    used[o + 2] = s === 3 ? inkOnWhite[o + 2] : s === 1 ? 0 : s === 2 ? 210 : 255;
    used[o + 3] = 255;
  }
}

/** Classifies every pixel and accumulates the used ones into oklab bins. */
function binPass(
  l0: Float32Array, l1: Float32Array, l2: Float32Array,
  d0: Float32Array, d1: Float32Array, d2: Float32Array,
  dmax: Float32Array, local: Float32Array, speck: Uint8Array,
  width: number, height: number, x0: number, y0: number, x1: number, y1: number,
  thr: number, clipLin: number, keepRatio: number, binSize: Vec3,
) {
  const [bL, bA, bB] = binSize;
  const status = new Uint8Array(width * height);
  const binIndex = new Map<number, number>();
  let cap = 4096;
  let accLab = new Float64Array(cap * 3);
  let accD = new Float64Array(cap * 3);
  let accN = new Uint32Array(cap);
  let nb = 0;
  let inkPixels = 0;
  let fringePixels = 0;
  let speckPixels = 0;
  let clippedPixels = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = y * width + x;
      if (dmax[i] < thr) continue;
      if (l0[i] <= clipLin || l1[i] <= clipLin || l2[i] <= clipLin) {
        clippedPixels++;
        status[i] = 1;
        continue;
      }
      if (speck[i] === 1) {
        speckPixels++;
        status[i] = 2;
        continue;
      }
      if (dmax[i] < keepRatio * local[i]) {
        fringePixels++;
        status[i] = 2;
        continue;
      }
      inkPixels++;
      status[i] = 3;
      const dr = d0[i];
      const dg = d1[i];
      const db = d2[i];
      const tr = Math.exp(-dr);
      const tg = Math.exp(-dg);
      const tb = Math.exp(-db);
      const lc = Math.cbrt(0.4122214708 * tr + 0.5363325363 * tg + 0.0514459929 * tb);
      const mc = Math.cbrt(0.2119034982 * tr + 0.6806995451 * tg + 0.1073969566 * tb);
      const sc = Math.cbrt(0.0883024619 * tr + 0.2817188376 * tg + 0.6299787005 * tb);
      const L = 0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc;
      const A = 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc;
      const B = 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc;
      const key =
        (Math.round(L / bL) + 512) * 1048576 + (Math.round(A / bA) + 512) * 1024 + (Math.round(B / bB) + 512);
      let bi = binIndex.get(key);
      if (bi === undefined) {
        bi = nb++;
        binIndex.set(key, bi);
        if (nb > cap) {
          cap *= 2;
          const lab = new Float64Array(cap * 3);
          lab.set(accLab);
          accLab = lab;
          const den = new Float64Array(cap * 3);
          den.set(accD);
          accD = den;
          const cnt = new Uint32Array(cap);
          cnt.set(accN);
          accN = cnt;
        }
      }
      accLab[bi * 3] += L;
      accLab[bi * 3 + 1] += A;
      accLab[bi * 3 + 2] += B;
      accD[bi * 3] += dr;
      accD[bi * 3 + 1] += dg;
      accD[bi * 3 + 2] += db;
      accN[bi]++;
    }
  return { nb, accLab, accD, accN, inkPixels, fringePixels, speckPixels, clippedPixels, status };
}
