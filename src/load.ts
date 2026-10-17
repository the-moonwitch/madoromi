// Loads what preprocessing made (see scripts/preprocess.ts): the summary, which is all the app
// needs to show every ink, an open ink's points, and the prerendered strokes. For scans that
// changed since, it loads their clouds, extracting any that are missing in the browser.
import { decodeScan, MAX_SIDE, PRECOMPUTED_DIR, type Manifest } from "./core/cloudfile";
import { EXTRACT_VERSION } from "./core/extract";
import { decodePoints } from "./core/inkview";
import { decodeSummary, pointsFile, strokeFile, SUMMARY_FILE, type Summary, type SummaryFile } from "./core/summary";
import type { Ink } from "./inks";
import { extractAll } from "./pool";
import type { SampleResult } from "./worker";

export interface InkScans {
  id: string;
  /** Aligned with the ink's samples; null where a scan failed to process. */
  samples: (SampleResult | null)[];
  /** How many came from preprocessing rather than in-browser extraction. */
  preprocessed: number;
}

const base = `${import.meta.env.BASE_URL}${PRECOMPUTED_DIR}`;
/** URL of a file preprocessing made. */
export const precomputed = (file: string) => `${base}/${file}`;

const points = new Map<string, Promise<Float32Array | undefined>>();
/** An ink's points for the 3D view; fetched once. */
export function loadPoints(ink: string): Promise<Float32Array | undefined> {
  let p = points.get(ink);
  if (!p) {
    p = fetch(precomputed(pointsFile(ink)))
      .then((r) => (r.ok ? r.arrayBuffer() : undefined))
      .then((b) => (b ? decodePoints(b) : undefined))
      .catch(() => undefined);
    points.set(ink, p);
  }
  return p;
}

/** Starts fetching what opening this ink will need, so it opens at once. */
export function prefetchInk(ink: string): void {
  void loadPoints(ink);
  new Image().src = precomputed(strokeFile(ink));
}

let manifest: Promise<Manifest | undefined> | undefined;
const loadManifest = () => (manifest ??= fetchManifest());

async function fetchManifest(): Promise<Manifest | undefined> {
  try {
    const res = await fetch(`${base}/manifest.json`);
    if (!res.ok) return;
    const m = (await res.json()) as Manifest;
    return m.version === EXTRACT_VERSION && m.maxSide === MAX_SIDE ? m : undefined;
  } catch {
    return;
  }
}

export async function loadSummary(): Promise<Summary | undefined> {
  try {
    const res = await fetch(`${base}/${SUMMARY_FILE}`);
    return res.ok ? decodeSummary((await res.json()) as SummaryFile) : undefined;
  } catch {
    return;
  }
}

/** Loads the given inks' scans, calling onInk as each ink is ready. */
export async function loadInks(inks: Ink[], onInk: (r: InkScans) => void): Promise<void> {
  const manifest = await loadManifest();
  const jobs: { ink: Ink; partial: (SampleResult | null)[]; missing: number[] }[] = [];
  await Promise.all(
    inks.map(async (ink) => {
      const entry = manifest?.inks[ink.id];
      const partial: (SampleResult | null)[] = ink.samples.map(() => null);
      const missing: number[] = [];
      let buf: ArrayBuffer | undefined;
      if (entry) {
        try {
          buf = await (await fetch(`${base}/${entry.file}`)).arrayBuffer();
        } catch {
          buf = undefined;
        }
      }
      ink.samples.forEach((s, i) => {
        const scan = entry?.scans.find((m) => m.file === s.file);
        if (buf && scan && JSON.stringify(scan.crop) === JSON.stringify(s.crop))
          partial[i] = { url: s.url, ...decodeScan(buf, scan) };
        else missing.push(i);
      });
      if (missing.length) jobs.push({ ink, partial, missing });
      else onInk({ id: ink.id, samples: partial, preprocessed: partial.length });
    }),
  );
  if (!jobs.length) return;
  console.info(`extracting ${jobs.reduce((t, j) => t + j.missing.length, 0)} scans in the browser (run \`bun run preprocess\` to skip this)`);
  extractAll(
    jobs.map((j) => ({ id: j.ink.id, samples: j.missing.map((i) => ({ url: j.ink.samples[i].url, crop: j.ink.samples[i].crop })) })),
    (r) => {
      const job = jobs.find((j) => j.ink.id === r.id)!;
      job.missing.forEach((i, k) => (job.partial[i] = r.samples[k]));
      for (const e of r.errors) console.warn(`[${r.id}] scan skipped:`, e);
      onInk({ id: r.id, samples: job.partial, preprocessed: job.partial.length - job.missing.length });
    },
  );
}
