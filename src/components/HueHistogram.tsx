import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { oklabToCss, type Vec3 } from "../core/color";
import { HIST_BARS, type InkHistogram } from "../core/shared";

/**
 * How all the inks spread over the hues (near-greys first, by lightness), every ink weighing the
 * same. A hovered ink's own share is drawn over the faded total.
 */
export function HueHistogram(props: { hists: Map<string, InkHistogram>; hovered: string }) {
  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  const [width, setWidth] = createSignal(600);
  onMount(() => {
    const ro = new ResizeObserver(() => setWidth(host.clientWidth));
    ro.observe(host);
    onCleanup(() => ro.disconnect());
  });

  createEffect(() => {
    const w = width();
    const h = 42;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const total = new Array(HIST_BARS).fill(0);
    const sum = new Array(HIST_BARS * 3).fill(0);
    for (const hist of props.hists.values())
      for (let b = 0; b < HIST_BARS; b++) {
        total[b] += hist.share[b];
        for (let k = 0; k < 3; k++) sum[b * 3 + k] += hist.lab[b * 3 + k] * hist.share[b];
      }
    const max = Math.max(...total, 1e-9);
    const bw = w / HIST_BARS;
    const mean = (b: number): Vec3 => [0, 1, 2].map((k) => sum[b * 3 + k] / (total[b] || 1)) as Vec3;
    const own = props.hists.get(props.hovered);
    const ownMax = own ? Math.max(...own.share, 1e-9) : 1;
    for (let b = 0; b < HIST_BARS; b++) {
      if (!total[b]) continue;
      // With an ink hovered, the others' bars are only a faint backdrop.
      const bh = (total[b] / max) * (h - 4);
      ctx.globalAlpha = own ? 0.22 : 1;
      ctx.fillStyle = oklabToCss(mean(b));
      ctx.fillRect(b * bw + 0.5, h - bh, bw - 1, bh);
      if (own && own.share[b]) {
        // Scaled to its own tallest bar: one ink is a small part of the total.
        const oh = Math.max(1.5, (own.share[b] / ownMax) * (h - 4));
        ctx.globalAlpha = 1;
        ctx.fillStyle = oklabToCss(own.lab.slice(b * 3, b * 3 + 3) as Vec3);
        ctx.fillRect(b * bw + 0.5, h - oh, bw - 1, oh);
      }
    }
    ctx.globalAlpha = 1;
  });

  return (
    <div class="hue-hist" ref={host}>
      <canvas ref={canvas} />
    </div>
  );
}
