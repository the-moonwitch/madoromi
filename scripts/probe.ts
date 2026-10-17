// Dev probe: run stage 1 on PPMs decoded from samples (dwebp -ppm) and print diagnostics.
// Usage: bun scripts/probe.ts <ppm-dir> [out-dir]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { extract } from "../src/core/extract";
import { linearToOklab, oklabToHex, oklabToOklch, oklabToSrgbGamut } from "../src/core/color";
import { analyze, combineScans } from "../src/core/analyze";

function readPpm(path: string) {
  const buf = readFileSync(path);
  let pos = 0;
  const tok = () => {
    while (/\s/.test(String.fromCharCode(buf[pos]))) pos++;
    let s = "";
    while (!/\s/.test(String.fromCharCode(buf[pos]))) s += String.fromCharCode(buf[pos++]);
    return s;
  };
  tok();
  const w = +tok(), h = +tok();
  tok();
  pos++;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = buf[pos + i * 3];
    rgba[i * 4 + 1] = buf[pos + i * 3 + 1];
    rgba[i * 4 + 2] = buf[pos + i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return { w, h, rgba };
}

function crc32(b: Uint8Array) {
  let c = ~0;
  for (const x of b) {
    c ^= x;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function writePng(path: string, rgba: Uint8ClampedArray, w: number, h: number) {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())];
  writeFileSync(path, Buffer.concat(parts));
}

const [dir, outDir] = process.argv.slice(2);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".ppm")).sort()) {
  const { w, h, rgba } = readPpm(`${dir}/${f}`);
  const t = performance.now();
  const e = extract(rgba, w, h);
  const ms = performance.now() - t;
  const pl = oklabToOklch(linearToOklab(...e.paper));
  let kept = 0;
  for (const c of e.binCount) if (c >= 4) kept++;
  console.log(
    f.padEnd(26),
    `paper L=${pl[0].toFixed(3)} C=${pl[1].toFixed(4)} h=${pl[2].toFixed(0)}`,
    `cov=${(e.paperCoverage * 100).toFixed(0)}%`,
    `ink=${e.inkPixels}`,
    `bins=${e.binCount.length} (≥4: ${kept})`,
    `${ms.toFixed(0)}ms`,
  );
  const a = analyze(combineScans([e]));
  const pk = oklabToOklch(a.peak.lab);
  console.log(
    "   ",
    `planarity=${(a.planarity * 100).toFixed(2)}% Y=${a.axes.y} X=${a.axes.x} (${a.axisAngleDeg.toFixed(0)}°)`,
    `peak C=${pk[1].toFixed(3)} h=${pk[2].toFixed(0)} at t=${a.peak.param.toFixed(2)}${a.peak.neutral ? " (neutral)" : ""}`,
    a.ramp.map(oklabToHex).join(" "),
    a.axisNote,
  );
  if (outDir) {
    // chart: field with points (dark dots) and curve (white), plus ramp strip underneath
    const R = a.field.res, S = 2, W = R * S, H = R * S + 40;
    const img = new Uint8ClampedArray(W * H * 4).fill(255);
    for (let y = 0; y < R * S; y++) for (let x = 0; x < W; x++) {
      const si = (Math.floor(y / S) * R + Math.floor(x / S)) * 4;
      img.set(a.field.rgba.subarray(si, si + 4), (y * W + x) * 4);
    }
    const toPx = (u: number, v: number) => [Math.round(((u - a.field.lo) / (a.field.hi - a.field.lo)) * (W - 1)), Math.round((1 - (v - a.field.lo) / (a.field.hi - a.field.lo)) * (R * S - 1))];
    const put = (x: number, y: number, c: number[]) => { if (x >= 0 && y >= 0 && x < W && y < R * S) img.set([...c, 255], (y * W + x) * 4); };
    for (let i = 0; i < a.chart.length / 2; i += 7) { const [x, y] = toPx(a.chart[i * 2], a.chart[i * 2 + 1]); put(x, y, [0, 0, 0]); }
    for (let i = 0; i < a.curve.uv.length / 2; i++) { const [x, y] = toPx(a.curve.uv[i * 2], a.curve.uv[i * 2 + 1]); for (const [dx, dy] of [[0,0],[1,0],[0,1],[1,1]]) put(x + dx, y + dy, [255, 255, 255]); }
    for (let x = 0; x < W; x++) {
      const st = a.ramp[Math.min(a.ramp.length - 1, Math.floor((x / W) * a.ramp.length))];
      const { rgb } = oklabToSrgbGamut(st);
      for (let y = R * S + 8; y < H - 4; y++) img.set([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, 255], (y * W + x) * 4);
    }
    writePng(`${outDir}/${f.replace(".ppm", "_chart.png")}`, img, W, H);
    writePng(`${outDir}/${f.replace(".ppm", "_ink.png")}`, e.inkOnWhite, w, h);
    writePng(`${outDir}/${f.replace(".ppm", "_paper.png")}`, e.paperImage, w, h);
  }
}
