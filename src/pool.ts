import type { Crop, ExtractResponse, WorkerRequest } from "./worker";

type ExtractJob = { id: string; samples: { url: string; crop?: Crop }[] };

const newWorker = () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

/** Runs stage-1 extraction for many inks across a few workers. */
export function extractAll(
  jobs: ExtractJob[],
  onResult: (r: ExtractResponse) => void,
  // Each extraction needs ~100 MB of working memory, so keep the pool small.
  size = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1)),
): void {
  const queue = jobs.slice();
  for (let i = 0; i < Math.min(size, queue.length); i++) {
    const w = newWorker();
    const next = () => {
      const job = queue.shift();
      if (job) w.postMessage({ kind: "extract", ...job } satisfies WorkerRequest);
      else w.terminate();
    };
    w.onmessage = (ev: MessageEvent<ExtractResponse>) => {
      onResult(ev.data);
      next();
    };
    w.onerror = (err) => {
      console.error("extract worker failed", err);
      next();
    };
    next();
  }
}
