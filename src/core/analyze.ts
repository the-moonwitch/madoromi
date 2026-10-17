// Stage 2: deduplicated oklab cloud → best-fit plane → square 2D chart → gradient field → curve → 1D ramp.
//
// Every surviving bin counts once. Bin pixel counts only decide which bins are noise.

import { oklabToOklch, oklabToSrgbGamut, toSrgbGamut, type Vec3 } from "./color";

/** Bump when a change here changes results, so precomputed summaries are recomputed. */
export const ANALYSIS_VERSION = 11;

export const AXIS_TARGETS = ["L", "C", "h", "L+C", "L-C", "L+h", "L-h", "C+h", "C-h"] as const;
export type AxisTarget = (typeof AXIS_TARGETS)[number];

export interface AnalysisOptions {
  minCount: number;
  /** Extra chart area around the unit square, for extrapolation. */
  margin: number;
}

export const defaultAnalysisOptions: AnalysisOptions = {
  minCount: 4,
  margin: 0.1,
};

// Fixed for every ink: the curve's lightness bands, its smoothing, the ramp's step count, and
// the gradient's resolution.
const CURVE_BANDS = 16;
const CURVE_SMOOTH = 4;
export const RAMP_STEPS = 8;
const FIELD_RES = 160;

export interface Analysis {
  /** Surviving points: oklab flat. */
  points: Float32Array;
  /** Points in the ink's cube: (lightness, chroma, hue) axes, each rescaled to fill [−1, 1]. */
  cube: Float32Array;
  /** Same points projected onto the plane, cube coords. */
  projected: Float32Array;
  /** oklab → cube coords. */
  toCube: (lab: Vec3) => Vec3;
  /** Cube coords → oklab. */
  fromCube: (c: Vec3) => Vec3;
  /** Oklab → chart coordinates, the way the points were placed. */
  labToChart: (lab: Vec3) => [number, number];
  /** Chart coordinates in the unit square (approximately), flat [u, v]. */
  chart: Float32Array;
  centroid: Vec3;
  normal: Vec3;
  /** Fraction of variance off the plane. */
  planarity: number;
  /** The pair of lightness/chroma/hue directions that best spans the plane. Y is the lighter-reading one. */
  axes: { x: AxisTarget; y: AxisTarget };
  axisAngleDeg: number;
  axisNote: string;
  /** Centroid and normal are in cube coords. Chart (u, v) → cube coords on the plane. */
  chartToPlane: (u: number, v: number) => Vec3;
  field: {
    res: number;
    lo: number;
    hi: number;
    lab: Float32Array;
    rgba: Uint8ClampedArray;
    clipped: Uint8Array;
  };
  /** The gradient: oklab at chart (u, v) is coef·[1, u, v] per channel (lightness clamped to [0, 1]). */
  fieldCoef: number[][];
  sampleField: (u: number, v: number) => Vec3;
  /** Dense curve, dark → light: chart coords and field colours. */
  curve: { uv: Float32Array; lab: Float32Array; param: Float32Array };
  controls: Float32Array;
  ramp: Vec3[];
  rampParams: number[];
  peak: { lab: Vec3; param: number; uv: [number, number]; neutral: boolean };
  /** The ink at full strength: what it looks like in the bottle or a dense stroke. */
  main: Vec3;
}

// ---------- small linear algebra ----------

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];

/** Symmetric 3×3 eigen-decomposition (Jacobi). Returns eigenvalues descending with unit eigenvectors. */
function eigSym3(m: number[][]): { values: number[]; vectors: Vec3[] } {
  const a = m.map((r) => r.slice());
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < 3; p++)
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-20) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 3; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 3; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
  }
  const order = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
  return {
    values: order.map((i) => a[i][i]),
    vectors: order.map((i) => [v[0][i], v[1][i], v[2][i]] as Vec3),
  };
}

/** Solve A x = b (small dense, Gaussian elimination with partial pivoting). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / (M[r][r] || 1e-12);
  }
  return x;
}

function quantile(sorted: ArrayLike<number>, q: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, q * (sorted.length - 1)));
  const lo = Math.floor(i);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function medianOf(values: number[]): number {
  const s = values.slice().sort((a, b) => a - b);
  return quantile(s, 0.5);
}

/** Whittaker smoother: minimise |z − y|² + λ|Δ²z|². */
function whittaker(y: number[], lambda: number): number[] {
  const n = y.length;
  if (n < 3 || lambda <= 0) return y.slice();
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let k = 0; k < n - 2; k++) {
    const d = [1, -2, 1];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A[k + i][k + j] += lambda * d[i] * d[j];
  }
  return solve(A, y);
}

// ---------- axis targets ----------

function targetDirections(centroid: Vec3, points: Float32Array): { dirs: Record<"L" | "C" | "h", Vec3>; note: string } {
  let cdir: [number, number];
  let note = "";
  const cc = Math.hypot(centroid[1], centroid[2]);
  if (cc > 0.015) {
    cdir = [centroid[1] / cc, centroid[2] / cc];
  } else {
    // Near-neutral ink: the centroid's hue is noise. Use the main direction the cloud spreads in a/b instead.
    let saa = 0;
    let sab = 0;
    let sbb = 0;
    const n = points.length / 3;
    for (let i = 0; i < n; i++) {
      const a = points[i * 3 + 1] - centroid[1];
      const b = points[i * 3 + 2] - centroid[2];
      saa += a * a;
      sab += a * b;
      sbb += b * b;
    }
    const ang = 0.5 * Math.atan2(2 * sab, saa - sbb);
    cdir = [Math.cos(ang), Math.sin(ang)];
    if (cdir[0] * centroid[1] + cdir[1] * centroid[2] < 0) cdir = [-cdir[0], -cdir[1]];
    note = "near-neutral: C/h directions taken from the cloud's a/b spread";
  }
  return {
    dirs: { L: [1, 0, 0], C: [0, cdir[0], cdir[1]], h: [0, -cdir[1], cdir[0]] },
    note,
  };
}

function resolveTarget(t: AxisTarget, dirs: Record<"L" | "C" | "h", Vec3>): Vec3 {
  if (t.length === 1) return dirs[t as "L" | "C" | "h"];
  const a = dirs[t[0] as "L" | "C" | "h"];
  const b = dirs[t[2] as "L" | "C" | "h"];
  return norm(add(a, b, t[1] === "+" ? 1 : -1));
}


// An axis is stretched to fill the cube only down to this oklab extent. Near-grey inks span
// ~0.03 in chroma and hue, which is scan noise; stretching that to the size of lightness turns
// the cloud into a blob, piles different lightnesses onto the same chart spot, and the ramp
// stops climbing steadily. Real chroma/hue spreads are 0.08–0.2.
const MIN_CUBE_EXTENT = 0.08;

// ---------- main ----------

/** An ink's scans side by side: every scan's bins, each tagged with the scan it came from. */
export interface Cloud {
  bins: Float32Array;
  binCount: Uint32Array;
  /** Index of the scan each bin came from. */
  source: Uint16Array;
  sources: number;
}

/** Puts several scans' bins side by side. Each scan has had its own paper removed. */
export function combineScans(parts: { bins: Float32Array; binCount: Uint32Array }[]): Cloud {
  const total = parts.reduce((t, p) => t + p.binCount.length, 0);
  const bins = new Float32Array(total * 3);
  const binCount = new Uint32Array(total);
  const source = new Uint16Array(total);
  let o = 0;
  parts.forEach((p, s) => {
    bins.set(p.bins, o * 3);
    binCount.set(p.binCount, o);
    source.fill(s, o, o + p.binCount.length);
    o += p.binCount.length;
  });
  return { bins, binCount, source, sources: parts.length };
}

/** Share of each scan's ink pixels, darkest first, that counts as full-strength ink. */
const FULL_STRENGTH_SHARE = 0.2;

/**
 * The ink at full strength: in each scan, the pixel-weighted mean colour of its darkest 20% of
 * ink pixels (pooled or dense ink, not a fixed lightness, so light inks stay light); then the
 * median across scans. Peak chroma can't do this: a dark ink's body has little chroma, so the
 * most chromatic point is a much paler tint of it.
 */
function fullStrength(cloud: Cloud): Vec3 {
  const perScan: Vec3[] = [];
  for (let s = 0; s < cloud.sources; s++) {
    const idx: number[] = [];
    let total = 0;
    for (let i = 0; i < cloud.binCount.length; i++)
      if (cloud.source[i] === s) {
        idx.push(i);
        total += cloud.binCount[i];
      }
    if (idx.length < 20) continue;
    idx.sort((a, b) => cloud.bins[a * 3] - cloud.bins[b * 3]);
    const sum: Vec3 = [0, 0, 0];
    let w = 0;
    for (const i of idx) {
      if (w > total * FULL_STRENGTH_SHARE) break;
      const c = cloud.binCount[i];
      for (let k = 0; k < 3; k++) sum[k] += cloud.bins[i * 3 + k] * c;
      w += c;
    }
    perScan.push([sum[0] / w, sum[1] / w, sum[2] / w]);
  }
  if (!perScan.length) return [0.5, 0, 0];
  return [0, 1, 2].map((k) => medianOf(perScan.map((p) => p[k]))) as Vec3;
}

/** Everything that depends only on the cloud and minCount: the cube, plane, axes and chart. */
interface Base {
  n: number;
  points: Float32Array;
  source: Uint16Array;
  /** Oklab chroma of each point. */
  chroma: Float32Array;
  /** Point indices, darkest first. */
  order: Uint32Array;
  cube: Float32Array;
  projected: Float32Array;
  chart: Float32Array;
  toCube: (lab: Vec3) => Vec3;
  fromCube: (c: Vec3) => Vec3;
  labToChart: (lab: Vec3) => [number, number];
  chartToPlane: (u: number, v: number) => Vec3;
  centroid: Vec3;
  normal: Vec3;
  planarity: number;
  axes: { x: AxisTarget; y: AxisTarget };
  axisAngleDeg: number;
  axisNote: string;
}

function buildBase(cloud: Cloud, minCount: number): Base {
  const { bins, binCount } = cloud;
  // --- Cloud
  let n = 0;
  for (let i = 0; i < binCount.length; i++) if (binCount[i] >= minCount) n++;
  const points = new Float32Array(n * 3);
  const source = new Uint16Array(n);
  const chroma = new Float32Array(n);
  for (let i = 0, j = 0; i < binCount.length; i++) {
    if (binCount[i] < minCount) continue;
    points[j * 3] = bins[i * 3];
    points[j * 3 + 1] = bins[i * 3 + 1];
    points[j * 3 + 2] = bins[i * 3 + 2];
    chroma[j] = Math.hypot(bins[i * 3 + 1], bins[i * 3 + 2]);
    source[j++] = cloud.source[i];
  }
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const Ls = new Float32Array(n);
  for (let i = 0; i < n; i++) Ls[i] = points[i * 3];
  order.sort((a, b) => Ls[a] - Ls[b]);

  // --- Ink-aligned cube. Turn a/b so the axes are the ink's own chroma and hue directions,
  // then stretch lightness, chroma and hue independently so the cloud fills [−1, 1]³.
  const mu0: Vec3 = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) mu0[c] += points[i * 3 + c] / n;
  const { dirs: frame, note } = targetDirections(mu0, points);
  const frameAxes = [frame.L, frame.C, frame.h];
  const centre: Vec3 = [0, 0, 0];
  const half: Vec3 = [1, 1, 1];
  const q = new Float32Array(n);
  for (let k = 0; k < 3; k++) {
    const [fx, fy, fz] = frameAxes[k];
    for (let i = 0; i < n; i++)
      q[i] = (points[i * 3] - mu0[0]) * fx + (points[i * 3 + 1] - mu0[1]) * fy + (points[i * 3 + 2] - mu0[2]) * fz;
    q.sort();
    const lo = quantile(q, 0.005);
    const hi = quantile(q, 0.995);
    centre[k] = (lo + hi) / 2;
    half[k] = Math.max(MIN_CUBE_EXTENT / 2, (hi - lo) / 2);
  }
  const toCube = (lab: Vec3): Vec3 => {
    const d0 = lab[0] - mu0[0];
    const d1 = lab[1] - mu0[1];
    const d2 = lab[2] - mu0[2];
    const out: Vec3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const f = frameAxes[k];
      out[k] = (d0 * f[0] + d1 * f[1] + d2 * f[2] - centre[k]) / half[k];
    }
    return out;
  };
  /** Cube coords → oklab (the frame axes are orthonormal, so the inverse is a sum). */
  const fromCube = (c: Vec3): Vec3 => {
    const out: Vec3 = [mu0[0], mu0[1], mu0[2]];
    for (let k = 0; k < 3; k++) {
      const t = c[k] * half[k] + centre[k];
      for (let j = 0; j < 3; j++) out[j] += t * frameAxes[k][j];
    }
    return out;
  };
  const cube = new Float32Array(n * 3);
  for (let k = 0; k < 3; k++) {
    const [fx, fy, fz] = frameAxes[k];
    for (let i = 0; i < n; i++)
      cube[i * 3 + k] =
        ((points[i * 3] - mu0[0]) * fx + (points[i * 3 + 1] - mu0[1]) * fy + (points[i * 3 + 2] - mu0[2]) * fz - centre[k]) / half[k];
  }

  // --- Plane (PCA in the cube, unweighted)
  const mu: Vec3 = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) mu[c] += cube[i * 3 + c] / n;
  let c00 = 0, c01 = 0, c02 = 0, c11 = 0, c12 = 0, c22 = 0;
  for (let i = 0; i < n; i++) {
    const x = cube[i * 3] - mu[0];
    const y = cube[i * 3 + 1] - mu[1];
    const z = cube[i * 3 + 2] - mu[2];
    c00 += x * x;
    c01 += x * y;
    c02 += x * z;
    c11 += y * y;
    c12 += y * z;
    c22 += z * z;
  }
  const cov = [
    [c00 / n, c01 / n, c02 / n],
    [c01 / n, c11 / n, c12 / n],
    [c02 / n, c12 / n, c22 / n],
  ];
  const { values, vectors } = eigSym3(cov);
  const [e1, e2, nrm] = vectors;
  const planarity = values[2] / (values[0] + values[1] + values[2] || 1);

  // --- Axes: the pair of L/C/h directions (or their diagonals) that best spans the plane.
  // A target's in-plane projection shrinks as it tilts out of the plane, so the area of the
  // parallelogram the two projections span is large only when both lie in the plane and
  // point different ways. Each chart axis then reads its target exactly (oblique axes).
  // In the cube, lightness, chroma and hue are simply its three axes.
  const dirs: Record<"L" | "C" | "h", Vec3> = { L: [1, 0, 0], C: [0, 1, 0], h: [0, 0, 1] };
  const inPlane = (t: Vec3): [number, number] => [dot(t, e1), dot(t, e2)];
  const unit2 = (v: [number, number]): [number, number] => {
    const l = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / l, v[1] / l];
  };
  const notes: string[] = note ? [note] : [];
  let best = { score: -1, y: "L" as AxisTarget, x: "C" as AxisTarget };
  for (const a of AXIS_TARGETS)
    for (const b of AXIS_TARGETS) {
      if (a >= b) continue;
      const pa = inPlane(resolveTarget(a, dirs));
      const pb = inPlane(resolveTarget(b, dirs));
      // Prefer plain L/C/h over diagonals when they span the plane about as well.
      const plain = (a.length === 1 ? 1 : 0.97) * (b.length === 1 ? 1 : 0.97);
      const score = Math.abs(pa[0] * pb[1] - pa[1] * pb[0]) * plain;
      if (score <= best.score) continue;
      // Y is whichever target leans more towards lightness, so up reads as lighter.
      const la = resolveTarget(a, dirs)[0];
      const lb = resolveTarget(b, dirs)[0];
      best = la >= lb ? { score, y: a, x: b } : { score, y: b, x: a };
    }
  const ty = unit2(inPlane(resolveTarget(best.y, dirs)));
  const tx = unit2(inPlane(resolveTarget(best.x, dirs)));
  const axisAngleDeg = (Math.acos(Math.max(-1, Math.min(1, tx[0] * ty[0] + tx[1] * ty[1]))) * 180) / Math.PI;

  // --- Project and read chart coordinates
  const projected = new Float32Array(n * 3);
  const rawU = new Float32Array(n);
  const rawV = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d0 = cube[i * 3] - mu[0];
    const d1 = cube[i * 3 + 1] - mu[1];
    const d2 = cube[i * 3 + 2] - mu[2];
    const s1 = d0 * e1[0] + d1 * e1[1] + d2 * e1[2];
    const s2 = d0 * e2[0] + d1 * e2[1] + d2 * e2[2];
    for (let c = 0; c < 3; c++) projected[i * 3 + c] = mu[c] + s1 * e1[c] + s2 * e2[c];
    rawU[i] = s1 * tx[0] + s2 * tx[1];
    rawV[i] = s1 * ty[0] + s2 * ty[1];
  }

  // --- Rescale so the points fill the unit square (robust extents)
  const su = Float32Array.from(rawU).sort();
  const sv = Float32Array.from(rawV).sort();
  const u0 = quantile(su, 0.005);
  const u1 = quantile(su, 0.995);
  const v0 = quantile(sv, 0.005);
  const v1 = quantile(sv, 0.995);
  const du = u1 - u0 || 1e-6;
  const dv = v1 - v0 || 1e-6;
  const chart = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    chart[i * 2] = (rawU[i] - u0) / du;
    chart[i * 2 + 1] = (rawV[i] - v0) / dv;
  }
  // Inverse: (u, v) → (s1, s2) → cube coords on the plane
  const det = tx[0] * ty[1] - tx[1] * ty[0];
  const chartToPlane = (u: number, v: number): Vec3 => {
    const ru = u0 + u * du;
    const rv = v0 + v * dv;
    const s1 = (ru * ty[1] - rv * tx[1]) / det;
    const s2 = (rv * tx[0] - ru * ty[0]) / det;
    return add(add(mu, e1, s1), e2, s2);
  };
  /** Oklab → chart coordinates, the same way the points were placed. */
  const labToChart = (lab: Vec3): [number, number] => {
    const c = toCube(lab);
    const d: Vec3 = [c[0] - mu[0], c[1] - mu[1], c[2] - mu[2]];
    const s1 = dot(d, e1);
    const s2 = dot(d, e2);
    return [(s1 * tx[0] + s2 * tx[1] - u0) / du, (s1 * ty[0] + s2 * ty[1] - v0) / dv];
  };

  return {
    n,
    points,
    source,
    chroma,
    order,
    cube,
    projected,
    chart,
    toCube,
    fromCube,
    labToChart,
    chartToPlane,
    centroid: mu,
    normal: nrm,
    planarity,
    axes: { x: best.x, y: best.y },
    axisAngleDeg,
    axisNote: notes.join("; "),
  };
}

/**
 * Gradient over the chart: the linear least-squares fit of the points' true colours across it.
 * (Each point's colour reaches the whole chart, so local detail averages out to this trend.)
 */
function buildField(b: Base, opts: AnalysisOptions): Pick<Analysis, "field" | "fieldCoef" | "sampleField"> {
  const { n, chart, points } = b;
  const ATA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const ATy = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < n; i++) {
    const f = [1, chart[i * 2], chart[i * 2 + 1]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) ATA[r][c] += f[r] * f[c];
      for (let k = 0; k < 3; k++) ATy[k][r] += f[r] * points[i * 3 + k];
    }
  }
  // Ridge on the slopes: directions the points barely span (e.g. across a near-neutral ink's
  // thin cloud) shrink towards "no change" instead of extrapolating noise.
  for (let r = 1; r < 3; r++) ATA[r][r] += 0.01 * n;
  const coef = ATy.map((rhs) => solve(ATA, rhs));
  const trend = trendOf(coef);

  return { field: renderField(trend, opts.margin), fieldCoef: coef, sampleField: trend };
}

/** The gradient as an image over the chart, the unit square plus a margin all round. */
export function renderField(trend: (u: number, v: number) => Vec3, margin: number): Analysis["field"] {
  const res = FIELD_RES;
  const lo = -margin;
  const hi = 1 + margin;
  const cell = (hi - lo) / (res - 1);
  const lab = new Float32Array(res * res * 3);
  const rgba = new Uint8ClampedArray(res * res * 4);
  const clipped = new Uint8Array(res * res);
  const rgb: Vec3 = [0, 0, 0];
  for (let y = 0; y < res; y++)
    for (let x = 0; x < res; x++) {
      const g = y * res + x;
      const c = trend(lo + x * cell, lo + y * cell);
      lab.set(c, g * 3);
      const m = oklabToSrgbGamut(c, rgb);
      // Stored with v up: row 0 is the top (v = hi).
      const o = ((res - 1 - y) * res + x) * 4;
      rgba[o] = m.rgb[0] * 255;
      rgba[o + 1] = m.rgb[1] * 255;
      rgba[o + 2] = m.rgb[2] * 255;
      rgba[o + 3] = 255;
      clipped[(res - 1 - y) * res + x] = m.clipped ? 1 : 0;
    }
  return { res, lo, hi, lab, rgba, clipped };
}

/** The gradient from its coefficients: oklab at (u, v) is coef·[1, u, v] per channel. */
export function trendOf(coef: number[][]): (u: number, v: number) => Vec3 {
  return (u, v) => {
    const L = coef[0][0] + coef[0][1] * u + coef[0][2] * v;
    return [Math.min(1, Math.max(0, L)), coef[1][0] + coef[1][1] * u + coef[1][2] * v, coef[2][0] + coef[2][1] * u + coef[2][2] * v];
  };
}

/**
 * Curve, dark → light: one control point per lightness band, from each scan's single most vivid
 * point in that band. Every scan counts equally, so one photo's colour cast can only pull the
 * curve by its share; the hue is the one the scans agree on, and the chroma the more vivid half's.
 */
function buildCurve(b: Base): Pick<Analysis, "curve" | "controls" | "ramp" | "rampParams" | "peak"> {
  const { n, order, source, chroma, points, labToChart } = b;
  const K = Math.max(3, Math.min(CURVE_BANDS, Math.floor(n / 8)));
  const cL: number[] = [];
  const cA: number[] = [];
  const cB: number[] = [];
  for (let k = 0; k < K; k++) {
    // Cosine-spaced quantile edges: narrower bands at the extremes so the curve reaches them.
    const ia = Math.floor(((1 - Math.cos((Math.PI * k) / K)) / 2) * n);
    const ib = Math.min(n, Math.max(ia + 1, Math.floor(((1 - Math.cos((Math.PI * (k + 1)) / K)) / 2) * n)));
    // Each scan's most vivid point in the band (scans with fewer than 3 points here are noise).
    const top = new Map<number, { i: number; count: number }>();
    for (let j = ia; j < ib; j++) {
      const i = order[j];
      const t = top.get(source[i]);
      if (!t) top.set(source[i], { i, count: 1 });
      else {
        t.count++;
        if (chroma[i] > chroma[t.i]) t.i = i;
      }
    }
    let picks = [...top.values()].filter((t) => t.count >= 3).map((t) => t.i);
    if (!picks.length) picks = [...top.values()].map((t) => t.i);
    // Lightness comes from every scan's pick. Hue is the one the scans mostly agree on: each
    // scan's hue counts the same however vivid (only near-greys, whose hue is noise, count less),
    // and picks pointing far from the consensus, like a sheen opposite the body colour, are set
    // aside rather than averaged in, which would only mix the two towards grey. Sheen close to
    // the body hue still turns the curve. Chroma is the more vivid half of the agreeing picks',
    // so a washed-out photo doesn't dull the ink, scaled by how tightly they agree.
    let L = 0;
    for (const i of picks) L += points[i * 3];
    const ang = picks.map((i) => Math.atan2(points[i * 3 + 2], points[i * 3 + 1]));
    const wt = picks.map((i) => Math.min(1, chroma[i] / 0.03));
    let h = 0;
    for (let it = 0; it < 4; it++) {
      let A = 0, B = 0;
      picks.forEach((_, j) => {
        const v = it ? wt[j] * Math.max(0, Math.cos(ang[j] - h)) : wt[j];
        A += Math.cos(ang[j]) * v;
        B += Math.sin(ang[j]) * v;
      });
      h = Math.atan2(B, A);
    }
    const agreeing = picks.map((_, j) => j).filter((j) => Math.cos(ang[j] - h) > 0.5);
    let A = 0, B = 0, Wsum = 0;
    for (const j of agreeing) {
      A += Math.cos(ang[j]) * wt[j];
      B += Math.sin(ang[j]) * wt[j];
      Wsum += wt[j];
    }
    const agree = Wsum > 0 ? Math.hypot(A, B) / Wsum : 0;
    const vivid = agreeing.map((j) => chroma[picks[j]]).sort((a, b) => b - a).slice(0, Math.ceil(agreeing.length / 2));
    const C = vivid.length ? (agree * vivid.reduce((t, c) => t + c, 0)) / vivid.length : 0;
    cL.push(L / picks.length);
    cA.push(C * Math.cos(h));
    cB.push(C * Math.sin(h));
  }
  const sL = whittaker(cL, CURVE_SMOOTH);
  const sA = whittaker(cA, CURVE_SMOOTH);
  const sB = whittaker(cB, CURVE_SMOOTH);
  const controls = new Float32Array(sL.length * 2);
  sL.forEach((L, i) => controls.set(labToChart([L, sA[i], sB[i]]), i * 2));

  // Centripetal Catmull–Rom through the control points, in oklab.
  const dense: Vec3[] = [];
  const P = (i: number): Vec3 => {
    const j = Math.max(0, Math.min(sL.length - 1, i));
    return [sL[j], sA[j], sB[j]];
  };
  const reflect3 = (a: Vec3, c: Vec3): Vec3 => [2 * c[0] - a[0], 2 * c[1] - a[1], 2 * c[2] - a[2]];
  const perSeg = 24;
  for (let i = 0; i < sL.length - 1; i++) {
    const p0 = i === 0 ? reflect3(P(1), P(0)) : P(i - 1);
    const p3 = i + 2 >= sL.length ? reflect3(P(i), P(i + 1)) : P(i + 2);
    for (let s = 0; s < perSeg; s++) dense.push(catmullRom(p0, P(i), P(i + 1), p3, s / perSeg) as Vec3);
  }
  dense.push(P(sL.length - 1));

  const m = dense.length;
  const cuv = new Float32Array(m * 2);
  const clab = new Float32Array(m * 3);
  const param = new Float32Array(m);
  let acc1 = 0;
  for (let i = 0; i < m; i++) {
    // The ink's colours are ones that were photographed, so they're displayable: each band's
    // chroma comes from its most vivid picks, which can overshoot sRGB once their hues and
    // lightnesses are averaged, so it's brought back in at the same lightness and hue.
    const c = toSrgbGamut(dense[i]);
    clab.set(c, i * 3);
    cuv.set(labToChart(c), i * 2);
    if (i > 0) {
      acc1 +=
        Math.hypot(cuv[i * 2] - cuv[i * 2 - 2], cuv[i * 2 + 1] - cuv[i * 2 - 1]);
    }
    param[i] = acc1;
  }
  for (let i = 0; i < m; i++) param[i] /= acc1 || 1;

  const atParam = (t: number): Vec3 => {
    let j = 0;
    while (j < m - 2 && param[j + 1] < t) j++;
    const seg = param[j + 1] - param[j] || 1;
    const f = Math.min(1, Math.max(0, (t - param[j]) / seg));
    return [0, 1, 2].map((k) => clab[j * 3 + k] * (1 - f) + clab[(j + 1) * 3 + k] * f) as Vec3;
  };
  const rampParams = Array.from({ length: RAMP_STEPS }, (_, i) => i / (RAMP_STEPS - 1));
  const ramp = rampParams.map(atParam);

  let pk = 0;
  let pc = -1;
  for (let i = 0; i < m; i++) {
    const C = Math.hypot(clab[i * 3 + 1], clab[i * 3 + 2]);
    if (C > pc) {
      pc = C;
      pk = i;
    }
  }
  const peakLab: Vec3 = [clab[pk * 3], clab[pk * 3 + 1], clab[pk * 3 + 2]];
  const peak = {
    lab: peakLab,
    param: param[pk],
    uv: [cuv[pk * 2], cuv[pk * 2 + 1]] as [number, number],
    neutral: oklabToOklch(peakLab)[1] < 0.03,
  };
  return { curve: { uv: cuv, lab: clab, param }, controls, ramp, rampParams, peak };
}

// Each stage is remembered per cloud against just the options it depends on, so moving the
// margin slider re-runs only the gradient, not the cube, plane or curve.
const stageCache = new WeakMap<
  Cloud,
  {
    main?: Vec3;
    base?: { key: string; value: Base };
    field?: { key: string; value: ReturnType<typeof buildField> };
    curve?: ReturnType<typeof buildCurve>;
  }
>();

export function analyze(cloud: Cloud, opts: AnalysisOptions = defaultAnalysisOptions): Analysis {
  let c = stageCache.get(cloud);
  if (!c) stageCache.set(cloud, (c = {}));
  const baseKey = String(opts.minCount);
  if (c.base?.key !== baseKey) {
    c.base = { key: baseKey, value: buildBase(cloud, opts.minCount) };
    c.field = undefined;
    c.curve = undefined;
  }
  const base = c.base.value;
  const fieldKey = String(opts.margin);
  if (c.field?.key !== fieldKey) c.field = { key: fieldKey, value: buildField(base, opts) };
  c.curve ??= buildCurve(base);
  c.main ??= fullStrength(cloud);
  return {
    points: base.points,
    cube: base.cube,
    projected: base.projected,
    toCube: base.toCube,
    fromCube: base.fromCube,
    labToChart: base.labToChart,
    chart: base.chart,
    centroid: base.centroid,
    normal: base.normal,
    planarity: base.planarity,
    axes: base.axes,
    axisAngleDeg: base.axisAngleDeg,
    axisNote: base.axisNote,
    chartToPlane: base.chartToPlane,
    ...c.field.value,
    ...c.curve,
    main: c.main,
  };
}

/** Centripetal Catmull–Rom between p1 and p2, in any number of dimensions. */
function catmullRom(p0: number[], p1: number[], p2: number[], p3: number[], t: number): number[] {
  const d = (a: number[], b: number[]) => Math.max(1e-6, Math.hypot(...a.map((x, i) => x - b[i])) ** 0.5);
  const t0 = 0;
  const t1 = t0 + d(p0, p1);
  const t2 = t1 + d(p1, p2);
  const t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const lerp = (a: number[], b: number[], ta: number, tb: number) => {
    const f = (tt - ta) / (tb - ta);
    return a.map((x, i) => x + (b[i] - x) * f);
  };
  const a1 = lerp(p0, p1, t0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}
