// Dev probe: per lightness band, compare the cloud's chroma distribution with the ramp's chroma.
// Usage: bun scripts/vivid.ts <ppm-dir> [ink-substring...]
import { readFileSync, readdirSync } from "node:fs";
import { extract } from "../src/core/extract";
import { analyze, combineScans, defaultAnalysisOptions } from "../src/core/analyze";

const [dir, ...only] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".ppm") && (!only.length || only.some((o) => f.includes(o)))).sort();
for (const f of files) {
  const buf = readFileSync(`${dir}/${f}`);
  const w = 1600, h = 1131, off = buf.length - w * h * 3;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i*4]=buf[off+i*3]; rgba[i*4+1]=buf[off+i*3+1]; rgba[i*4+2]=buf[off+i*3+2]; rgba[i*4+3]=255; }
  const e = extract(rgba, w, h);
  const a = analyze(combineScans([e]), defaultAnalysisOptions);
  const curve = Array.from({ length: a.curve.lab.length / 3 }, (_, i) => [...a.curve.lab.subarray(i * 3, i * 3 + 3)]);
  const n = a.points.length / 3;
  const rows: string[] = [];
  for (let L = 0.3; L < 0.98; L += 0.1) {
    const cs: number[] = [];
    for (let i = 0; i < n; i++) if (Math.abs(a.points[i*3] - L - 0.05) < 0.05) cs.push(Math.hypot(a.points[i*3+1], a.points[i*3+2]));
    if (cs.length < 10) continue;
    cs.sort((x, y) => x - y);
    const q = (p: number) => cs[Math.floor(p * (cs.length - 1))].toFixed(3);
    const rc = curve.filter((c) => Math.abs(c[0] - L - 0.05) < 0.05).map((c) => Math.hypot(c[1], c[2]));
    const ramp = rc.length ? (rc.reduce((s, x) => s + x, 0) / rc.length).toFixed(3) : "  -  ";
    rows.push(`L${(L + 0.05).toFixed(2)} p50=${q(0.5)} p90=${q(0.9)} p98=${q(0.98)} ramp=${ramp}`);
  }
  console.log(f.replace(".ppm", ""));
  for (const r of rows) console.log("   ", r);
}
