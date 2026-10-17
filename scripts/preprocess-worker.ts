// Worker thread for scripts/preprocess.ts: runs extraction on decoded pixels.
import { dropSingletons } from "../src/core/cloudfile";
import { extract } from "../src/core/extract";

declare const self: Worker;
self.onmessage = (ev: MessageEvent<{ id: number; data: Uint8ClampedArray; width: number; height: number }>) => {
  const { id, data, width, height } = ev.data;
  const e = extract(data, width, height, undefined, false);
  const cloud = {
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
  self.postMessage({ id, cloud }, [cloud.bins.buffer, cloud.binCount.buffer]);
};
