// Dev probe: is each ink's ramp a steady dark → light climb? Reports lightness reversals along the dense curve.
// Usage: bun scripts/monotone.ts <ppm-dir> [ink-substring...]
import { readFileSync, readdirSync } from "node:fs";
import { extract } from "../src/core/extract";
import { analyze, combineScans } from "../src/core/analyze";
import { oklabToHex } from "../src/core/color";

const [dir, ...only] = process.argv.slice(2);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".ppm") && (!only.length || only.some((o) => f.includes(o)))).sort()) {
  const buf = readFileSync(`${dir}/${f}`);
  const w = 1600, h = 1131, off = buf.length - w * h * 3;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i*4]=buf[off+i*3]; rgba[i*4+1]=buf[off+i*3+1]; rgba[i*4+2]=buf[off+i*3+2]; rgba[i*4+3]=255; }
  const a = analyze(combineScans([extract(rgba, w, h)]));
  const m = a.curve.lab.length / 3;
  let drop = 0, maxDrop = 0, runMax = -1;
  for (let i = 0; i < m; i++) {
    const L = a.curve.lab[i * 3];
    if (L < runMax) { maxDrop = Math.max(maxDrop, runMax - L); }
    if (i && L < a.curve.lab[i * 3 - 3]) drop += a.curve.lab[i * 3 - 3] - L;
    runMax = Math.max(runMax, L);
  }
  console.log(f.replace(".ppm", "").padEnd(20), `Y=${a.axes.y} X=${a.axes.x}`.padEnd(14), `total L reversal=${drop.toFixed(3)} worst dip=${maxDrop.toFixed(3)}`, a.ramp.map((c) => c[0].toFixed(2)).join(" "));
}
