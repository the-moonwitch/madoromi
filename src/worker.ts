/// <reference lib="webworker" />
import { dropSingletons, MAX_SIDE, type Crop, type ScanCloud } from "./core/cloudfile";
import { EXTRACT_VERSION, extract } from "./core/extract";

export type { Crop };

export type WorkerRequest = { kind: "extract"; id: string; samples: { url: string; crop?: Crop }[] };

/** What the app keeps per scan: its colour cloud and a few stats. */
export interface SampleResult extends ScanCloud {
  url: string;
}

export interface ExtractResponse {
  kind: "extract";
  id: string;
  /** One entry per requested sample; null where extraction failed (see errors). */
  samples: (SampleResult | null)[];
  errors: string[];
  ms: number;
}


const CACHE_VERSION = `extract-v${EXTRACT_VERSION}-${MAX_SIDE}`;

// Results are cached per scan in IndexedDB, so only new or changed scans are processed on reload.
function openCache(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("madoromi-cache", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("samples");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
const cache = openCache();

async function cacheGet(key: string): Promise<SampleResult | undefined> {
  const db = await cache;
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const req = db.transaction("samples").objectStore("samples").get(key);
      req.onsuccess = () => resolve(req.result as SampleResult | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function cachePut(key: string, value: SampleResult): Promise<void> {
  const db = await cache;
  if (!db) return;
  try {
    db.transaction("samples", "readwrite").objectStore("samples").put(value, key);
  } catch {
    /* cache is best-effort */
  }
}

async function load(url: string, crop: Crop = [0, 0, 1, 1]) {
  // Larger images are scaled down first: extraction cost grows with pixel count, the colours don't.
  const bmp = await createImageBitmap(await (await fetch(url)).blob());
  const sx = Math.round(crop[0] * bmp.width);
  const sy = Math.round(crop[1] * bmp.height);
  const sw = Math.round(crop[2] * bmp.width) - sx;
  const sh = Math.round(crop[3] * bmp.height) - sy;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  const canvas = new OffscreenCanvas(dw, dh);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, dw, dh);
  bmp.close();
  return ctx.getImageData(0, 0, dw, dh);
}

async function extractOne(url: string, crop?: Crop): Promise<SampleResult> {
  const { data, width, height } = await load(url, crop);
  const e = extract(data, width, height, undefined, false);
  return {
    url,
    width,
    height,
    paper: e.paper,
    paperCoverage: e.paperCoverage,
    inkPixels: e.inkPixels,
    fringePixels: e.fringePixels,
    speckPixels: e.speckPixels,
    clippedPixels: e.clippedPixels,
    ...dropSingletons(e.bins, e.binCount),
  };
}


const post = (msg: ExtractResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  const t0 = performance.now();
  const parts: (SampleResult | null)[] = [];
  const errors: string[] = [];
  for (const s of req.samples) {
    const key = `${CACHE_VERSION}|${s.url}|${(s.crop ?? []).join(",")}`;
    try {
      let part = await cacheGet(key);
      if (!part) {
        part = await extractOne(s.url, s.crop);
        await cachePut(key, part);
      }
      parts.push(part);
    } catch (err) {
      parts.push(null);
      errors.push(`${s.url}: ${err}`);
    }
  }
  const ok = parts.filter((p): p is SampleResult => p !== null);
  post(
    { kind: "extract", id: req.id, samples: parts, errors, ms: performance.now() - t0 },
    ok.flatMap((p) => [p.bins.buffer, p.binCount.buffer]),
  );
};
