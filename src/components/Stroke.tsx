import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { paintStroke } from "../core/brush";
import type { Ramp } from "../core/summary";
import { nextTask } from "../tasks";

// Strokes are painted a few at a time between tasks, so a page of them doesn't hold up the first
// paint. (Tasks rather than requestAnimationFrame, which stalls in background tabs.)
const queue: (() => void)[] = [];
let scheduled = false;
const run = () => {
  const until = performance.now() + 12;
  while (queue.length && performance.now() < until) queue.shift()!();
  if (queue.length) nextTask(run);
  else scheduled = false;
};
function enqueue(job: () => void) {
  queue.push(job);
  if (scheduled) return;
  scheduled = true;
  nextTask(run);
}

/** An ink's ramp as a brush stroke. Without a width it fills its container's width. */
export function Stroke(props: { ramp: Ramp | undefined; seed: string; height: number; thickness: number; width?: number }) {
  let canvas!: HTMLCanvasElement;
  const [fill, setFill] = createSignal(0);
  onMount(() => {
    if (props.width) return;
    const ro = new ResizeObserver(() => setFill(canvas.parentElement!.clientWidth));
    ro.observe(canvas.parentElement!);
    onCleanup(() => ro.disconnect());
  });
  const width = () => props.width ?? fill();

  // Repaint only when the ramp or the size actually changes, not whenever the ramps are re-read.
  let painted: unknown[] = [];
  let token = 0;
  createEffect(() => {
    const r = props.ramp;
    const w = width();
    const { height, thickness, seed } = props;
    if (!r || !w) return;
    const key = [r, w, height, thickness, seed];
    if (key.every((k, i) => k === painted[i])) return;
    painted = key;
    const mine = ++token;
    enqueue(() => {
      if (mine !== token) return;
      const dpr = window.devicePixelRatio || 1;
      const px = paintStroke(r, { width: w, height, dpr, thickness, seed });
      canvas.width = px.width;
      canvas.height = px.height;
      canvas.getContext("2d")!.putImageData(new ImageData(px.data, px.width, px.height), 0, 0);
    });
  });

  return <canvas ref={canvas} class="stroke" style={{ width: `${width()}px`, height: `${props.height}px` }} />;
}
