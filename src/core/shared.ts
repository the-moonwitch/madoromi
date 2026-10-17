// Data for the all-inks view: one common plane, and each ink's spread of hues.

import type { Cloud } from "./analyze";
import { oklabToOklch, type Vec3 } from "./color";

/** A plane through oklab: origin, two in-plane unit axes, and their names. */
export interface SharedPlane {
  origin: Vec3;
  u: Vec3;
  v: Vec3;
  uLabel: string;
  vLabel: string;
}

/** The a–b plane seen from above: a hue wheel (yellow up, magenta right, green left, blue down). */
export const HUE_WHEEL: SharedPlane = { origin: [0, 0, 0], u: [0, 1, 0], v: [0, 0, 1], uLabel: "green ← → red", vLabel: "blue ↓ ↑ yellow" };

export function project(plane: SharedPlane, lab: ArrayLike<number>, o = 0): [number, number] {
  const d0 = lab[o] - plane.origin[0];
  const d1 = lab[o + 1] - plane.origin[1];
  const d2 = lab[o + 2] - plane.origin[2];
  return [
    d0 * plane.u[0] + d1 * plane.u[1] + d2 * plane.u[2],
    d0 * plane.v[0] + d1 * plane.v[1] + d2 * plane.v[2],
  ];
}

/** Near-greys are binned by lightness, everything else by hue. */
const NEUTRAL_C = 0.03;
const HUE_BARS = 36;
const GREY_BARS = 8;
export const HIST_BARS = GREY_BARS + HUE_BARS;

/** One ink's spread over the histogram's bars: the share of its colours in each, and their mean. */
export interface InkHistogram {
  /** Shares, summing to 1, so every ink weighs the same. */
  share: number[];
  /** Mean oklab of the ink's colours in each bar, flat. */
  lab: number[];
}

/** Each surviving colour bin counts once, like everywhere else. */
export function inkHistogram(cloud: Cloud, minCount: number): InkHistogram {
  const count = new Array(HIST_BARS).fill(0);
  const sum = new Array(HIST_BARS * 3).fill(0);
  let total = 0;
  for (let i = 0; i < cloud.binCount.length; i++) {
    if (cloud.binCount[i] < minCount) continue;
    const lab: Vec3 = [cloud.bins[i * 3], cloud.bins[i * 3 + 1], cloud.bins[i * 3 + 2]];
    const [L, C, h] = oklabToOklch(lab);
    const b = C < NEUTRAL_C ? Math.min(GREY_BARS - 1, Math.floor(L * GREY_BARS)) : GREY_BARS + Math.min(HUE_BARS - 1, Math.floor((h / 360) * HUE_BARS));
    count[b]++;
    for (let k = 0; k < 3; k++) sum[b * 3 + k] += lab[k];
    total++;
  }
  return {
    share: count.map((c) => c / (total || 1)),
    lab: sum.map((s, j) => (count[Math.floor(j / 3)] ? s / count[Math.floor(j / 3)] : 0)),
  };
}
