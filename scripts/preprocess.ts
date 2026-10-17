// Extracts every sample scan ahead of time so the app doesn't have to (see src/core/cloudfile.ts),
// then analyses every ink and prerenders everything the app shows (see src/core/summary.ts).
// Writes public/precomputed/{manifest.json, <ink>.bin, summary.json, strokes.webp,
// strokes/<ink>.webp, points/<ink>.bin}, and src/{samples.json, kanji.woff2, kanji-font.css}. Only changed scans
// are re-extracted; scans whose files were deleted from samples/ are dropped, along with their
// entries in samples/sources.json.
// Usage: bun run preprocess [--force]
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { cpus } from "node:os";
import sharp from "sharp";
import {
  MAX_SIDE,
  PRECOMPUTED_DIR,
  SAMPLE_FILE,
  decodeScan,
  encodeScan,
  scanBytes,
  type Crop,
  type Manifest,
  type ManifestScan,
  type ScanCloud,
} from "../src/core/cloudfile";
import { ANALYSIS_VERSION, analyze, combineScans, defaultAnalysisOptions } from "../src/core/analyze";
import { EXTRACT_VERSION } from "../src/core/extract";
import { paintStroke } from "../src/core/brush";
import { encodePoints, viewOf, type InkView } from "../src/core/inkview";
import { loopOrder } from "../src/core/order";
import { inkHistogram, type InkHistogram } from "../src/core/shared";
import {
  DETAIL_STROKE,
  SHEET_COLUMNS,
  STROKE_DPR,
  STROKE_SHEET,
  SUMMARY_FILE,
  TABLE_STROKE,
  pointsFile,
  sampleSignature,
  strokeFile,
  summarize,
  type SummaryFile,
} from "../src/core/summary";

const ROOT = new URL("..", import.meta.url).pathname;
const SAMPLES = `${ROOT}samples`;
const OUT = `${ROOT}public/${PRECOMPUTED_DIR}`;
const force = process.argv.includes("--force");

mkdirSync(OUT, { recursive: true });
rmSync(`${OUT}/thumbs`, { recursive: true, force: true });
const sources: Record<string, { crop?: Crop }> = JSON.parse(readFileSync(`${SAMPLES}/sources.json`, "utf8"));
const old: Manifest | undefined = existsSync(`${OUT}/manifest.json`)
  ? JSON.parse(readFileSync(`${OUT}/manifest.json`, "utf8"))
  : undefined;
const oldUsable = old && old.version === EXTRACT_VERSION && old.maxSide === MAX_SIDE && !force;
const oldBins = new Map<string, ArrayBuffer>();

/** Previously extracted cloud for this file, if the file and crop haven't changed. */
function reuse(ink: string, file: string, bytes: number, mtime: number, crop?: Crop): ScanCloud | undefined {
  if (!oldUsable) return;
  const entry = old!.inks[ink];
  const scan = entry?.scans.find((s) => s.file === file);
  if (!scan || scan.bytes !== bytes || scan.mtime !== mtime || JSON.stringify(scan.crop) !== JSON.stringify(crop))
    return;
  if (!oldBins.has(ink)) {
    const b = readFileSync(`${OUT}/${entry.file}`);
    oldBins.set(ink, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  return decodeScan(oldBins.get(ink)!, scan);
}

// Extraction is plain JS, so it runs on a pool of worker threads, one per core.
const pool = Array.from({ length: Math.max(1, cpus().length - 1) }, () => new Worker(new URL("./preprocess-worker.ts", import.meta.url)));
const idle = [...pool];
const waiting: (() => void)[] = [];
let nextId = 0;
const pending = new Map<number, (c: ScanCloud) => void>();
for (const w of pool)
  w.onmessage = (ev: MessageEvent<{ id: number; cloud: ScanCloud }>) => {
    pending.get(ev.data.id)!(ev.data.cloud);
    pending.delete(ev.data.id);
    idle.push(w);
    waiting.shift()?.();
  };
async function runExtract(data: Uint8ClampedArray, width: number, height: number): Promise<ScanCloud> {
  while (!idle.length) await new Promise<void>((r) => waiting.push(r));
  const w = idle.pop()!;
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, data, width, height }, [data.buffer]);
  });
}

async function extractScan(file: string, crop?: Crop): Promise<ScanCloud> {
  let img = sharp(`${SAMPLES}/${file}`);
  if (crop) {
    const { width = 0, height = 0 } = await img.metadata();
    const left = Math.round(crop[0] * width);
    const top = Math.round(crop[1] * height);
    img = img.extract({ left, top, width: Math.round(crop[2] * width) - left, height: Math.round(crop[3] * height) - top });
  }
  const { data, info } = await img
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return runExtract(new Uint8ClampedArray(data), info.width, info.height);
}

const files = readdirSync(SAMPLES).filter((f) => SAMPLE_FILE.test(f)).sort();
// The app's list of samples and their crops: it works from what's derived from them, not the
// images themselves (see src/inks.ts).
writeFileSync(`${ROOT}src/samples.json`, JSON.stringify(Object.fromEntries(files.map((f) => [f, sources[f]?.crop ?? null])), null, 1) + "\n");
const byInk = new Map<string, string[]>();
for (const f of files) {
  const ink = f.match(SAMPLE_FILE)![1];
  byInk.set(ink, [...(byInk.get(ink) ?? []), f]);
}

const t0 = performance.now();
let redone = 0;
let reused = 0;
const manifest: Manifest = { version: EXTRACT_VERSION, maxSide: MAX_SIDE, inks: {} };
type Done = { file: string; crop?: Crop; bytes: number; mtime: number; cloud: ScanCloud };
const done = new Map<string, Done[]>();
// One queue across all inks; a couple more runners than threads so decoding overlaps extraction.
const queue = [...byInk].flatMap(([ink, fs]) => fs.map((f) => [ink, f] as const));
await Promise.all(
  Array.from({ length: pool.length + 2 }, async () => {
    for (let task = queue.shift(); task; task = queue.shift()) {
      const [ink, f] = task;
      const st = statSync(`${SAMPLES}/${f}`);
      const crop = sources[f]?.crop;
      let cloud = reuse(ink, f, st.size, st.mtimeMs, crop);
      if (cloud) reused++;
      else {
        try {
          cloud = await extractScan(f, crop);
          redone++;
        } catch (err) {
          console.warn(`  skipped ${f}: ${err}`);
          continue;
        }
      }
      done.set(ink, [...(done.get(ink) ?? []), { file: f, crop, bytes: st.size, mtime: st.mtimeMs, cloud }]);
    }
  }),
);

for (const ink of byInk.keys()) {
  const clouds = done.get(ink) ?? [];
  clouds.sort((a, b) => a.file.localeCompare(b.file));

  const total = clouds.reduce((t, c) => t + scanBytes(c.cloud.binCount.length), 0);
  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  let offset = 0;
  const scans: ManifestScan[] = clouds.map(({ file, crop, bytes, mtime, cloud }) => {
    encodeScan(cloud, view, offset);
    const { bins: _b, binCount, ...stats } = cloud;
    const entry: ManifestScan = { file, crop, bytes, mtime, offset, count: binCount.length, ...stats };
    offset += scanBytes(binCount.length);
    return entry;
  });
  writeFileSync(`${OUT}/${ink}.bin`, new Uint8Array(buf));
  manifest.inks[ink] = { file: `${ink}.bin`, scans };
  console.log(`${ink.padEnd(17)} ${String(scans.length).padStart(3)} scans  ${(total / 1e6).toFixed(2)} MB`);
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));

// Every ink analysed at the fixed options: its view data, histogram, points, and strokes.
const t1 = performance.now();
const { minCount } = defaultAnalysisOptions;
rmSync(`${OUT}/shared.bin`, { force: true });
for (const dir of ["strokes", "points"]) {
  rmSync(`${OUT}/${dir}`, { recursive: true, force: true });
  mkdirSync(`${OUT}/${dir}`, { recursive: true });
}
const analysed = new Map<string, { view: InkView; hist: InkHistogram; files: string }>();
for (const ink of byInk.keys()) {
  const scans = done.get(ink) ?? [];
  if (!scans.length) continue;
  const cloud = combineScans(scans.map((d) => d.cloud));
  const a = analyze(cloud, defaultAnalysisOptions);
  analysed.set(ink, { view: viewOf(a), hist: inkHistogram(cloud, minCount), files: sampleSignature(scans) });
  writeFileSync(`${OUT}/${pointsFile(ink)}`, encodePoints(a.points));
}
const order = loopOrder([...analysed.keys()], (id) => analysed.get(id)?.view);

// Strokes: the table's on one sheet (in display order), each ink's large one on its own.
const encode = (px: { data: Uint8ClampedArray; width: number; height: number }) =>
  sharp(Buffer.from(px.data.buffer, px.data.byteOffset, px.data.byteLength), { raw: { width: px.width, height: px.height, channels: 4 } });
const cell = TABLE_STROKE.size * STROKE_DPR;
const tiles = await Promise.all(
  order.map(async (ink, i) => {
    const { view } = analysed.get(ink)!;
    const opts = { dpr: STROKE_DPR, seed: ink };
    const big = paintStroke(view, { ...opts, width: DETAIL_STROKE.size, height: DETAIL_STROKE.size, thickness: DETAIL_STROKE.thickness });
    await encode(big).webp({ quality: 88, alphaQuality: 90, effort: 5 }).toFile(`${OUT}/${strokeFile(ink)}`);
    const small = paintStroke(view, { ...opts, width: TABLE_STROKE.size, height: TABLE_STROKE.size, thickness: TABLE_STROKE.thickness });
    return { input: await encode(small).png().toBuffer(), left: (i % SHEET_COLUMNS) * cell, top: Math.floor(i / SHEET_COLUMNS) * cell };
  }),
);
await sharp({ create: { width: SHEET_COLUMNS * cell, height: Math.ceil(order.length / SHEET_COLUMNS) * cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(tiles)
  .webp({ quality: 88, alphaQuality: 90, effort: 5 })
  .toFile(`${OUT}/${STROKE_SHEET}`);

const summary: SummaryFile = { analysis: ANALYSIS_VERSION, minCount, order, inks: {} };
order.forEach((ink, i) => {
  const { view, hist, files } = analysed.get(ink)!;
  summary.inks[ink] = summarize(view, files, hist, i);
});
writeFileSync(`${OUT}/${SUMMARY_FILE}`, JSON.stringify(summary));
console.log(`analysed and drew ${analysed.size} inks in ${((performance.now() - t1) / 1000).toFixed(1)}s`);
// Inks with no samples left, and sources.json entries for deleted files.
for (const f of readdirSync(OUT))
  if (f.endsWith(".bin") && !manifest.inks[f.slice(0, -4)]) rmSync(`${OUT}/${f}`);
const present = new Set(files);
const kept = Object.fromEntries(Object.entries(sources).filter(([f]) => present.has(f)));
const dropped = Object.keys(sources).length - Object.keys(kept).length;
if (dropped) {
  writeFileSync(`${SAMPLES}/sources.json`, JSON.stringify(kept, null, 2) + "\n");
  console.log(`removed ${dropped} sources.json entr${dropped === 1 ? "y" : "ies"} for deleted samples`);
}
// The kanji font (Yuji Syuku, a brush hand), cut down to the characters the page uses. @fontsource ships it in
// ~120 pieces by unicode range, and the page's few dozen kanji are spread over ~40 of them; scripts/subset-kanji.py
// (fontTools, in .venv: `python3 -m venv .venv && .venv/bin/pip install fonttools brotli`) builds
// one small font from those. Without it, the stylesheet just lists the pieces that are needed.
const KANJI_WEIGHT = 400;
// Every kanji in the app's source: the inks' names, the masthead, the palettes' names.
const used = new Set(
  readdirSync(`${ROOT}src`, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx?$/.test(f))
    .flatMap((f) => [...readFileSync(`${ROOT}src/${f}`, "utf8")])
    .filter((c) => c.codePointAt(0)! >= 0x2e80),
);
const covers = (range: string) =>
  range.split(",").some((r) => {
    const [a, b] = r.trim().replace(/^U\+/i, "").split("-").map((x) => parseInt(x, 16));
    for (const c of used) if (c.codePointAt(0)! >= a && c.codePointAt(0)! <= (b ?? a)) return true;
    return false;
  });
const KANJI_FONT = "yuji-syuku";
const fontDir = `${ROOT}node_modules/@fontsource/${KANJI_FONT}`;
const pieces = (readFileSync(`${fontDir}/${KANJI_WEIGHT}.css`, "utf8").match(/@font-face\s*{[^}]*}/g) ?? []).filter((face) =>
  covers(face.match(/unicode-range:\s*([^;]+);/)?.[1] ?? ""),
);
const python = `${ROOT}.venv/bin/python`;
const built =
  existsSync(python) &&
  spawnSync(
    python,
    [
      "-I",
      `${ROOT}scripts/subset-kanji.py`,
      `${ROOT}src/kanji.woff2`,
      [...used].join(""),
      ...pieces.map((face) => `${fontDir}/${face.match(/url\(\.\/(files\/[^)]+\.woff2)\)/)![1]}`),
    ],
    { stdio: "inherit" },
  ).status === 0;
writeFileSync(
  `${ROOT}src/kanji-font.css`,
  built
    ? `/* Generated by scripts/preprocess.ts: Yuji Syuku, just the page's ${used.size} kanji. */
@font-face {
  font-family: 'Yuji Syuku';
  font-style: normal;
  font-display: swap;
  font-weight: ${KANJI_WEIGHT};
  src: url(./kanji.woff2) format('woff2');
}
`
    : `/* Generated by scripts/preprocess.ts: the Yuji Syuku pieces the page's kanji are in. */\n${pieces
        .map((face) => face.replace(/url\(\.\/files\//g, `url(../node_modules/@fontsource/${KANJI_FONT}/files/`))
        .join("\n")}\n`,
);
if (!built) rmSync(`${ROOT}src/kanji.woff2`, { force: true });
console.log(built ? `kanji font: ${used.size} characters, ${statSync(`${ROOT}src/kanji.woff2`).size} bytes` : `kanji font: ${pieces.length} pieces (no .venv with fontTools)`);

for (const w of pool) w.terminate();
console.log(`\n${redone} extracted, ${reused} reused, ${((performance.now() - t0) / 1000).toFixed(1)}s`);
