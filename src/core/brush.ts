// An ink's ramp painted as a brush stroke on the ink's own plane: the stroke follows the ramp's
// curve through the 2D chart, with each chart axis stretched so the curve fills the canvas, and
// it masks the chart's gradient, so its colour changes across the stroke as well as along it.
// Like ink, it is as opaque as it stands apart from the paper: on white, the ink's darkest step is
// solid and white is clear.
// It's painted straight into pixels, so dozens of strokes stay cheap.

import { oklabToSrgbGamut, type Vec3 } from "./color";
import { hashString, noise, rng } from "./noise";
import type { Ramp } from "./summary";

/** How much more one chart axis may be stretched than the other to fill the canvas. */
const MAX_STRETCH = 3;

export interface StrokeOptions {
  /** Canvas size in CSS px, and the device pixel ratio to paint at. */
  width: number;
  height: number;
  dpr: number;
  /** Stroke width in CSS px. */
  thickness: number;
  /** Seeds the ragged edges, so an ink always gets the same stroke. */
  seed: string;
  /** The paper's lightness: 1 (white) unless it's painted for a dark one. */
  paper?: number;
}





const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Half-width of the stroke along its length: a blunt, rounded start, full body, tapering release. */
function profile(t: number): number {
  const attack = t < 0.04 ? Math.sqrt(1 - (1 - t / 0.04) ** 2) * 0.4 + 0.6 : 1;
  const release = 1 - 0.3 * smooth(0.6, 1, t);
  return attack * release;
}


/** RGBA pixels, straight alpha, at the canvas's device size. */
export interface StrokePixels {
  data: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
}

export function paintStroke(r: Ramp, o: StrokeOptions): StrokePixels {
  const W = Math.max(1, Math.round(o.width * o.dpr));
  const H = Math.max(1, Math.round(o.height * o.dpr));
  const img = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H };
  const { uv, lab: curveLab } = r.curve;
  const n = uv.length / 2;
  if (n < 2) return img;

  // --- Stretch each chart axis so the curve fills the canvas. An axis the curve barely moves
  // along is stretched no more than MAX_STRETCH times the other, so its wobble isn't blown up.
  let xs = new Float32Array(n);
  let ys = new Float32Array(n);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < n; i++) {
    u0 = Math.min(u0, uv[i * 2]);
    u1 = Math.max(u1, uv[i * 2]);
    v0 = Math.min(v0, uv[i * 2 + 1]);
    v1 = Math.max(v1, uv[i * 2 + 1]);
  }
  const span = Math.max(u1 - u0, v1 - v0, 1e-6);
  const widen = (lo: number, hi: number): [number, number] => {
    const min = span / MAX_STRETCH;
    if (hi - lo >= min) return [lo, hi];
    const mid = (lo + hi) / 2;
    return [mid - min / 2, mid + min / 2];
  };
  [u0, u1] = widen(u0, u1);
  [v0, v1] = widen(v0, v1);
  const half = (o.thickness / 2) * o.dpr;
  // Room for the hairs that stray past the edges.
  const pad = half * 1.35;
  const toX = (u: number) => pad + ((u - u0) / (u1 - u0)) * (W - 2 * pad);
  const toY = (v: number) => H - pad - ((v - v0) / (v1 - v0)) * (H - 2 * pad);
  for (let i = 0; i < n; i++) {
    xs[i] = toX(uv[i * 2]);
    ys[i] = toY(uv[i * 2 + 1]);
  }
  // A brush can't turn on the spot: soften tight hooks, mostly at the ends, so the bristles don't
  // fan out into a comb there.
  for (let pass = 0; pass < 3; pass++) {
    const nx = new Float32Array(n);
    const ny = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let tx = 0, ty = 0, tw = 0;
      for (let j = Math.max(0, i - 5); j <= Math.min(n - 1, i + 5); j++) {
        const w = 1 - Math.abs(j - i) / 6;
        tx += xs[j] * w;
        ty += ys[j] * w;
        tw += w;
      }
      nx[i] = tx / tw;
      ny[i] = ty / tw;
    }
    xs = nx;
    ys = ny;
  }
  const px = xs;
  const py = ys;

  // --- Walk the path in small steps: position and normal.
  const seg = new Float32Array(n);
  for (let i = 1; i < n; i++) seg[i] = seg[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
  const total = seg[n - 1] || 1;
  const step = 0.7;
  const m = Math.ceil(total / step) + 1;
  const sxp = new Float32Array(m);
  const syp = new Float32Array(m);
  const snx = new Float32Array(m);
  const sny = new Float32Array(m);
  // The ramp's own colour at each step along the spine.
  const spine = new Float32Array(m * 3);
  for (let k = 0, j = 0; k < m; k++) {
    const d = (k / (m - 1)) * total;
    while (j < n - 2 && seg[j + 1] < d) j++;
    const f = Math.min(1, Math.max(0, (d - seg[j]) / (seg[j + 1] - seg[j] || 1)));
    sxp[k] = px[j] + (px[j + 1] - px[j]) * f;
    syp[k] = py[j] + (py[j + 1] - py[j]) * f;
    const ja = Math.max(0, j - 2);
    const jb = Math.min(n - 1, j + 3);
    const tx = px[jb] - px[ja];
    const ty = py[jb] - py[ja];
    const tl = Math.hypot(tx, ty) || 1;
    snx[k] = -ty / tl;
    sny[k] = tx / tl;
    for (let c = 0; c < 3; c++) spine[k * 3 + c] = curveLab[j * 3 + c] + (curveLab[(j + 1) * 3 + c] - curveLab[j * 3 + c]) * f;
  }

  // --- Bristles. The stroke is laid down as rows of bristles running along it. Each starts and
  // runs out at its own point (its end tapering to a needle, so the tail splits into streaks)
  // and skips in a few long dry gaps, more often near the edges and towards the tail, leaving
  // thin white streaks along the stroke. A few loose hairs run just outside the edges.
  const seed = hashString(o.seed);
  const rand = rng(seed);
  const per = o.dpr / step; // steps per CSS px
  const dot = 1.1 * o.dpr;
  type Bristle = { across: number; radius: number; start: number; end: number; gaps: [number, number][]; seed: number };
  const bristles: Bristle[] = [];
  const rows = Math.max(8, Math.round((2 * half) / dot));
  for (let i = 0; i < rows; i++) {
    const across = -1 + (2 * (i + 0.5)) / rows + (rand() - 0.5) * (0.3 / rows);
    const edge = Math.abs(across);
    const gaps: [number, number][] = [];
    const count = Math.floor(rand() * (0.3 + 3.2 * edge ** 3) + rand() * 0.55);
    for (let g = 0; g < count; g++) {
      const at = 0.3 + 0.7 * Math.sqrt(rand());
      const len = (0.02 + rand() * 0.15) * (0.3 + at);
      gaps.push([at - len / 2, at + len / 2]);
    }
    bristles.push({
      across,
      radius: dot,
      start: rand() * 0.01 + (edge > 0.8 ? rand() * 0.08 * edge : 0),
      end: Math.min(1.04, 0.78 + rand() * 0.27 - (edge > 0.7 ? rand() * 0.25 * edge ** 2 : 0)),
      gaps,
      seed: (seed + i * 7919) | 0,
    });
  }
  for (const side of [-1, 1])
    for (let h = 0, n = 1 + Math.floor(rand() * 3); h < n; h++) {
      const start = 0.05 + rand() * 0.5;
      bristles.push({ across: side * (1.04 + rand() * 0.22), radius: dot * 0.55, start, end: Math.min(1.02, start + 0.2 + rand() * 0.45), gaps: [], seed: (seed + 1e5 + h * 31 + side) | 0 });
    }

  const cover = new Float32Array(W * H);
  // Each step along the spine carries the ramp's colour there, as an offset from the gradient
  // there. Every pixel blends the offsets of the steps that painted it, by how close it is to
  // each one's spine point, so where the stroke folds back on itself the colour stays smooth.
  const chartU = (x: number) => u0 + ((x - pad) / (W - 2 * pad)) * (u1 - u0);
  const chartV = (y: number) => v0 + ((H - pad - y) / (H - 2 * pad)) * (v1 - v0);
  const offset = new Float32Array(m * 3);
  for (let k = 0; k < m; k++) {
    const there = r.sampleField(chartU(sxp[k]), chartV(syp[k]));
    for (let c = 0; c < 3; c++) offset[k * 3 + c] = spine[k * 3 + c] - there[c];
  }
  const blendW = new Float32Array(W * H);
  const blend = new Float32Array(W * H * 3);
  const near = 2 * (half * 0.6) ** 2;
  const splat = (cx: number, cy: number, radius: number, k: number) => {
    const R = Math.ceil(radius + 1);
    const outer = (radius + 0.5) ** 2;
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    for (let dy = -R; dy <= R; dy++) {
      const y = iy + dy;
      if (y < 0 || y >= H) continue;
      for (let dx = -R; dx <= R; dx++) {
        const x = ix + dx;
        if (x < 0 || x >= W) continue;
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 >= outer) continue;
        const c = Math.min(1, radius - Math.sqrt(d2) + 0.5);
        const p = y * W + x;
        if (c > cover[p]) cover[p] = c;
        const w = Math.exp(-((x - sxp[k]) ** 2 + (y - syp[k]) ** 2) / near) + 1e-6;
        blendW[p] += w;
        blend[p * 3] += offset[k * 3] * w;
        blend[p * 3 + 1] += offset[k * 3 + 1] * w;
        blend[p * 3 + 2] += offset[k * 3 + 2] * w;
      }
    }
  };
  // Past the end of the path, bristles carry on along its last direction.
  const lastX = sxp[m - 1], lastY = syp[m - 1];
  const dirX = sny[m - 1], dirY = -snx[m - 1];
  for (const b of bristles) {
    let lx = NaN;
    let ly = NaN;
    const kEnd = Math.round(b.end * (m - 1));
    for (let k = Math.round(b.start * (m - 1)); k <= kEnd; k++) {
      const t = k / (m - 1);
      if (b.gaps.some(([g0, g1]) => t > g0 && t < g1)) {
        lx = NaN;
        continue;
      }
      const tc = Math.min(1, t);
      const w = half * profile(tc) * (1 + (noise(k / (per * 40), seed + 3) - 0.5) * 0.12);
      // Bristles drift together with the stroke and only a little on their own, so the body stays solid.
      const across = b.across + (noise(k / (per * 25), b.seed) - 0.5) * (Math.abs(b.across) > 0.85 ? 0.06 : 0.012);
      let cx: number, cy: number;
      if (k < m) {
        cx = sxp[k] + snx[k] * across * w;
        cy = syp[k] + sny[k] * across * w;
      } else {
        const ext = (k - (m - 1)) * step;
        cx = lastX + dirX * ext + snx[m - 1] * across * w;
        cy = lastY + dirY * ext + sny[m - 1] * across * w;
      }
      // The last stretch of a bristle (and the first, a little) thins to a point.
      const toEnd = (b.end - t) / 0.07;
      const fromStart = (t - b.start) / 0.015;
      const r = b.radius * Math.min(1, Math.max(0.25, toEnd), Math.max(0.5, fromStart));
      // Round a turn the outer bristles sweep further than one step: fill in between.
      const gap = Math.hypot(cx - lx, cy - ly);
      if (gap > r * 0.8) {
        const sub = Math.min(60, Math.ceil(gap / (r * 0.6)));
        for (let e = 1; e < sub; e++) splat(lx + ((cx - lx) * e) / sub, ly + ((cy - ly) * e) / sub, r, Math.min(k, m - 1));
      }
      splat(cx, cy, r, Math.min(k, m - 1));
      lx = cx;
      ly = cy;
    }
  }

  // Colour: the gradient at the pixel plus the blended offset. So along the spine the stroke is
  // the ramp exactly (its darks included), and the colour still turns across the stroke as the
  // gradient does. As opaque as it is dark.
  const out = img.data;
  const rgb: Vec3 = [0, 0, 0];
  const darkest = Math.min(0.98, r.ramp[0][0]);
  const lab: Vec3 = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    const v = chartV(y);
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!cover[p]) continue;
      const here = r.sampleField(chartU(x), v);
      for (let c = 0; c < 3; c++) lab[c] = here[c] + blend[p * 3 + c] / blendW[p];
      lab[0] = Math.min(1, Math.max(0, lab[0]));
      oklabToSrgbGamut(lab, rgb);
      out[p * 4] = rgb[0] * 255;
      out[p * 4 + 1] = rgb[1] * 255;
      out[p * 4 + 2] = rgb[2] * 255;
      out[p * 4 + 3] = cover[p] * inkOpacity(lab[0], darkest, o.paper) * 255;
    }
  }
  return img;
}

/**
 * Ink is as opaque as it stands apart from the paper: on white, fully at the ink's darkest and not
 * at all at white; on a dark paper, fully at whichever end of the ink is furthest from it, not at
 * all at the paper's own lightness. Eased so the strong tones stay nearly solid and only those
 * nearest the paper fade into it.
 */
export function inkOpacity(L: number, darkest: number, paper = 1): number {
  const far = Math.max(Math.abs(darkest - paper), Math.abs(1 - paper));
  const x = 1 - Math.min(1, Math.abs(L - paper) / far);
  return 1 - x * x;
}
