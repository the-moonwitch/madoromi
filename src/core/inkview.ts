// Everything an open ink's views draw, without the analysis behind it: its ramp, its gradient and
// its most chromatic point. Preprocessing stores this for every ink, so opening one only fetches
// its points.

import { defaultAnalysisOptions, renderField, type Analysis } from "./analyze";
import type { Vec3 } from "./color";
import type { Ramp } from "./summary";

export interface InkView extends Ramp {
  /** The gradient's coefficients, see Analysis.fieldCoef. */
  fieldCoef: number[][];
  /** The most chromatic point of the curve. */
  peak: { lab: Vec3; uv: [number, number] };
}

export function viewOf(a: Analysis): InkView {
  return {
    main: a.main,
    ramp: a.ramp,
    rampParams: a.rampParams,
    curve: a.curve,
    sampleField: a.sampleField,
    fieldCoef: a.fieldCoef,
    peak: { lab: a.peak.lab, uv: a.peak.uv },
  };
}

/** The gradient image for the 2D chart, at the fixed margin. */
export const fieldOf = (v: InkView) => renderField(v.sampleField, defaultAnalysisOptions.margin);

// --- Point files: an ink's surviving points for the 3D view, capped in number, as a byte per
// channel (L over [0, 1], a and b over [−0.5, 0.5]): steps of ~0.004, far finer than the soft
// splats they're drawn with.

/** The 3D view is a soft haze; past this many points more only cost time. */
export const MAX_POINTS = 60000;
const LO = [0, -0.5, -0.5];

export function encodePoints(points: Float32Array): Uint8Array {
  const n = points.length / 3;
  const stride = Math.max(1, n / MAX_POINTS);
  const keep = Math.min(n, Math.floor(n / stride));
  const out = new Uint8Array(keep * 3);
  for (let j = 0; j < keep; j++) {
    const i = Math.floor(j * stride);
    for (let k = 0; k < 3; k++) out[j * 3 + k] = Math.max(0, Math.min(255, Math.round((points[i * 3 + k] - LO[k]) * 255)));
  }
  return out;
}

/** Decoded with a fixed dither within each step, so the steps don't show as a lattice. */
export function decodePoints(buf: ArrayBuffer): Float32Array {
  const raw = new Uint8Array(buf);
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = (raw[i] + (Math.imul(i, 2654435761) >>> 0) / 4294967296 - 0.5) / 255 + LO[i % 3];
  return out;
}
