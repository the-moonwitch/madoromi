// Everything the app shows, precomputed by `bun run preprocess`: each ink's ramp, view data and
// hue histogram, the order the inks are shown in, and where each ink's prerendered strokes are.
// With these the app draws every ink without analysing anything; an open ink only fetches its
// points. Scans that changed since are analysed in the browser instead.

import { ANALYSIS_VERSION, trendOf, type Analysis } from "./analyze";
import type { Vec3 } from "./color";
import type { InkView } from "./inkview";
import type { InkHistogram } from "./shared";

/** What the palette, the strokes and the shared view need from an ink's analysis. */
export type Ramp = Pick<Analysis, "main" | "ramp" | "rampParams" | "curve" | "sampleField">;

export const SUMMARY_FILE = "summary.json";
/** Every ink's table stroke, on one sheet. */
export const STROKE_SHEET = "strokes.webp";
/** An ink's large stroke and its points, one file each. */
export const strokeFile = (ink: string) => `strokes/${ink}.webp`;
export const pointsFile = (ink: string) => `points/${ink}.bin`;

/** Stroke sizes in CSS px, prerendered at STROKE_DPR. */
export const TABLE_STROKE = { size: 72, thickness: 24 };
export const DETAIL_STROKE = { size: 250, thickness: 56 };
export const STROKE_DPR = 2;
export const SHEET_COLUMNS = 8;

/** The curve is stored at this many points, evenly spaced along it. */
const CURVE_SAMPLES = 96;

interface InkJSON {
  /** Which scans (and crops) it was computed from; see sampleSignature. */
  files: string;
  main: number[];
  ramp: number[][];
  rampParams: number[];
  /** Evenly spaced along the curve, so its parameter is just the index. */
  curve: { uv: number[]; lab: number[] };
  /** The gradient's coefficients, see Analysis.fieldCoef. */
  field: number[][];
  peak: { lab: number[]; uv: number[] };
  hist: InkHistogram;
  /** Its cell on the stroke sheet. */
  stroke: number;
}

export interface SummaryFile {
  analysis: number;
  minCount: number;
  /** The shortest loop through the inks' ramps, see order.ts. */
  order: string[];
  inks: Record<string, InkJSON>;
}

export interface Summary {
  minCount: number;
  order: string[];
  views: Map<string, InkView>;
  files: Map<string, string>;
  hists: Map<string, InkHistogram>;
  strokes: Map<string, number>;
  sheetRows: number;
}

/** Identifies an ink's set of scans, so a summary made from other scans isn't used. */
export const sampleSignature = (samples: { file: string; crop?: number[] }[]) =>
  samples
    .map((s) => (s.crop ? `${s.file}@${s.crop.join(",")}` : s.file))
    .sort()
    .join("|");

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
const rounded = (v: ArrayLike<number>, d: number) => Array.from(v, (x) => round(x, d));

/** An ink's view, with the curve resampled evenly along its length. */
export function summarize(v: InkView, files: string, hist: InkHistogram, stroke: number): InkJSON {
  const { uv, lab, param } = v.curve;
  const m = param.length;
  const out = { uv: [] as number[], lab: [] as number[] };
  let j = 0;
  for (let s = 0; s < CURVE_SAMPLES; s++) {
    const t = s / (CURVE_SAMPLES - 1);
    while (j < m - 2 && param[j + 1] < t) j++;
    const f = Math.min(1, Math.max(0, (t - param[j]) / (param[j + 1] - param[j] || 1)));
    for (let k = 0; k < 2; k++) out.uv.push(round(uv[j * 2 + k] * (1 - f) + uv[(j + 1) * 2 + k] * f, 4));
    for (let k = 0; k < 3; k++) out.lab.push(round(lab[j * 3 + k] * (1 - f) + lab[(j + 1) * 3 + k] * f, 5));
  }
  return {
    files,
    main: rounded(v.main, 5),
    ramp: v.ramp.map((c) => rounded(c, 5)),
    rampParams: rounded(v.rampParams, 5),
    curve: out,
    field: v.fieldCoef.map((r) => rounded(r, 6)),
    peak: { lab: rounded(v.peak.lab, 5), uv: rounded(v.peak.uv, 4) },
    hist: { share: rounded(hist.share, 5), lab: rounded(hist.lab, 4) },
    stroke,
  };
}

export function decodeSummary(file: SummaryFile): Summary | undefined {
  if (file.analysis !== ANALYSIS_VERSION) return;
  const views = new Map<string, InkView>();
  const files = new Map<string, string>();
  const hists = new Map<string, InkHistogram>();
  const strokes = new Map<string, number>();
  for (const [id, r] of Object.entries(file.inks)) {
    const n = r.curve.lab.length / 3;
    views.set(id, {
      main: r.main as Vec3,
      ramp: r.ramp as Vec3[],
      rampParams: r.rampParams,
      curve: {
        uv: Float32Array.from(r.curve.uv),
        lab: Float32Array.from(r.curve.lab),
        param: Float32Array.from({ length: n }, (_, i) => i / (n - 1)),
      },
      sampleField: trendOf(r.field),
      fieldCoef: r.field,
      peak: { lab: r.peak.lab as Vec3, uv: r.peak.uv as [number, number] },
    });
    files.set(id, r.files);
    hists.set(id, r.hist);
    strokes.set(id, r.stroke);
  }
  return { minCount: file.minCount, order: file.order, views, files, hists, strokes, sheetRows: Math.ceil(strokes.size / SHEET_COLUMNS) };
}
