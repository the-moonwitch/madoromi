// The order inks are shown in: the shortest closed loop through their ramps, so each ink sits
// next to the ones most like it, opened at the loop's longest step.

import { oklabToOklch } from "./color";
import type { Ramp } from "./summary";

/** An ink as a point: its ramp's steps in oklab, end to end. */
const feature = (r: Ramp) => r.ramp.flat();

const dist = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
};

/** Shortest closed tour (nearest-neighbour from every start, then 2-opt), as indices. */
function shortestLoop(d: number[][]): number[] {
  const n = d.length;
  const length = (t: number[]) => t.reduce((s, x, i) => s + d[x][t[(i + 1) % n]], 0);
  let best: number[] = [];
  let bestLen = Infinity;
  for (let start = 0; start < n; start++) {
    const tour = [start];
    const used = new Set(tour);
    while (tour.length < n) {
      const last = tour[tour.length - 1];
      let next = -1;
      for (let j = 0; j < n; j++) if (!used.has(j) && (next < 0 || d[last][j] < d[last][next])) next = j;
      tour.push(next);
      used.add(next);
    }
    // 2-opt: reverse any stretch whose ends would join up shorter.
    for (let improved = true; improved; ) {
      improved = false;
      for (let i = 0; i < n - 1; i++)
        for (let k = i + 2; k < n; k++) {
          const a = tour[i], b = tour[i + 1], c = tour[k], e = tour[(k + 1) % n];
          if (a === e) continue;
          if (d[a][c] + d[b][e] < d[a][b] + d[c][e] - 1e-12) {
            tour.splice(i + 1, k - i, ...tour.slice(i + 1, k + 1).reverse());
            improved = true;
          }
        }
    }
    const len = length(tour);
    if (len < bestLen) {
      bestLen = len;
      best = tour;
    }
  }
  return best;
}

/** Hue of the ramp's most vivid step, from red round to purple. */
const hueKey = (r: Ramp) => {
  const v = r.ramp.map(oklabToOklch).reduce((a, b) => (b[1] > a[1] ? b : a));
  return (v[2] - 350 + 720) % 360;
};

export function loopOrder(ids: string[], ramp: (id: string) => Ramp | undefined): string[] {
  const known = ids.filter((id) => ramp(id));
  if (known.length < 3) return ids;
  const f = known.map((id) => feature(ramp(id)!));
  const d = f.map((a) => f.map((b) => dist(a, b)));
  const loop = shortestLoop(d);
  const n = loop.length;
  // Open the loop at its longest step, and read it from the redder end.
  let cut = 0;
  for (let i = 0; i < n; i++) if (d[loop[i]][loop[(i + 1) % n]] > d[loop[cut]][loop[(cut + 1) % n]]) cut = i;
  let line = [...loop.slice(cut + 1), ...loop.slice(0, cut + 1)].map((i) => known[i]);
  if (hueKey(ramp(line[0])!) > hueKey(ramp(line[n - 1])!)) line = line.reverse();
  return [...line, ...ids.filter((id) => !ramp(id))];
}
