import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import { oklabToCss, oklabToHex, oklabToSrgbGamut, type Vec3 } from "../core/color";
import { fieldOf, type InkView } from "../core/inkview";
import { noise, noise2 } from "../core/noise";

export interface Chart2DProps {
  view: InkView;
}

const rgbCss = (lab: Vec3) => {
  const { rgb } = oklabToSrgbGamut(lab);
  return `rgb(${rgb.map((c) => Math.round(c * 255)).join(",")})`;
};

export function Chart2D(props: Chart2DProps) {
  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let overlay!: HTMLCanvasElement;
  const [size, setSize] = createSignal(300);
  const [hover, setHover] = createSignal<{ u: number; v: number; x: number; y: number } | null>(null);

  onMount(() => {
    const ro = new ResizeObserver(() => setSize(Math.max(120, Math.min(host.clientWidth, host.clientHeight))));
    ro.observe(host);
    onCleanup(() => ro.disconnect());
  });

  // Chart units → canvas px.
  const geom = () => {
    const f = field();
    const s = size();
    const lo = f?.lo ?? -0.15;
    const hi = f?.hi ?? 1.15;
    const toX = (u: number) => ((u - lo) / (hi - lo)) * s;
    const toY = (v: number) => (1 - (v - lo) / (hi - lo)) * s;
    const fromPx = (x: number, y: number) => ({ u: lo + (x / s) * (hi - lo), v: lo + (1 - y / s) * (hi - lo) });
    return { s, toX, toY, fromPx };
  };
  const field = createMemo(() => fieldOf(props.view));
  const curve = createMemo(() => props.view.curve);

  const setup = (c: HTMLCanvasElement, s: number) => {
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(s * dpr);
    c.height = Math.round(s * dpr);
    c.style.width = `${s}px`;
    c.style.height = `${s}px`;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, s, s);
    return { ctx, dpr };
  };

  // Base layer: the gradient, as if brushed on: frayed at its edges, and left unpainted where its
  // colours fall outside sRGB.
  createEffect(() => {
    const f = field();
    const { s } = geom();
    const { ctx, dpr } = setup(canvas, s);
    const { res, rgba } = f;
    const img = new OffscreenCanvas(res, res);
    img.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), res, res), 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, s, s);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(paintMask(f.clipped, res, s, dpr), 0, 0);
    ctx.restore();
  });

  // Overlay: curve, ramp steps and peak.
  createEffect(() => {
    const cv = curve();
    const { s, toX, toY } = geom();
    const { ctx } = setup(overlay, s);
    const a = untrack(() => props.view);
    const m = cv.uv.length / 2;
    // Steps, then the curve threaded through them, and the peak: lifted off the gradient by a soft
    // shadow rather than outlines.
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    a.rampParams.forEach((t, i) => {
      let j = 0;
      while (j < m - 1 && cv.param[j + 1] < t) j++;
      ctx.beginPath();
      ctx.arc(toX(cv.uv[j * 2]), toY(cv.uv[j * 2 + 1]), 6, 0, Math.PI * 2);
      ctx.fillStyle = rgbCss(a.ramp[i]);
      ctx.fill();
    });

    ctx.beginPath();
    for (let i = 0; i < m; i++) {
      const x = toX(cv.uv[i * 2]);
      const y = toY(cv.uv[i * 2 + 1]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Peak chroma.
    ctx.beginPath();
    ctx.arc(toX(a.peak.uv[0]), toY(a.peak.uv[1]), 10, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
  });

  const onMove = (e: PointerEvent) => {
    const r = overlay.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setHover({ ...geom().fromPx(x, y), x, y });
  };

  const hoverLab = () => {
    const h = hover();
    return h ? props.view.sampleField(h.u, h.v) : null;
  };

  // The readout sits beside the pointer, on whichever side has room.
  const readoutStyle = () => {
    const h = hover()!;
    const s = size();
    const left = h.x > s - 240;
    const up = h.y > s - 50;
    return {
      left: `${h.x + (left ? -14 : 14)}px`,
      top: `${h.y + (up ? -14 : 14)}px`,
      transform: `translate(${left ? "-100%" : "0"}, ${up ? "-100%" : "0"})`,
    };
  };

  return (
    <div class="chart2d" ref={host}>
      <div class="chart-frame" style={{ width: `${size()}px`, height: `${size()}px` }}>
        <canvas ref={canvas} />
        <canvas ref={overlay} class="overlay" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        <Show when={hoverLab()}>
          {(lab) => (
            <div class="readout" style={readoutStyle()}>
              <span class="chip" style={{ background: rgbCss(lab()) }} />
              <code>{oklabToHex(lab())}</code>
              <code>{oklabToCss(lab())}</code>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}

/**
 * Where the chart is painted, at device pixels: everything but a frayed border, as if the square
 * were laid down in horizontal brush strokes (a blunt, slightly ragged left edge, dry splintered
 * streaks off the right, wavering top and bottom), and nothing where the gradient leaves sRGB,
 * the boundary streaked the same way.
 */
const masks = new Map<string, OffscreenCanvas>();
function paintMask(clipped: Uint8Array, res: number, size: number, dpr: number): OffscreenCanvas {
  const W = Math.round(size * dpr);
  let sum = 0;
  for (let i = 0; i < clipped.length; i += 7) sum = (sum * 31 + clipped[i] * (i + 1)) | 0;
  const key = `${W}|${sum}`;
  const hit = masks.get(key);
  if (hit) return hit;
  const out = new OffscreenCanvas(W, W);
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(W, W);
  const px = 1 / dpr; // CSS px per device px
  const ramp = (x: number) => Math.min(1, Math.max(0, x));
  // Per row (y) for the left and right edges, per column (x) for the top and bottom.
  const leftInset = new Float32Array(W);
  const rightInset = new Float32Array(W);
  const topInset = new Float32Array(W);
  const bottomInset = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const t = i * px;
    leftInset[i] = 5 + 8 * noise(t / 26, 11) + 3 * noise(t / 2.2, 12);
    rightInset[i] = 4 + 9 * noise(t / 30, 13) + 30 * noise(t / 3.5, 14) ** 3 + 4 * noise(t / 1.2, 15);
    topInset[i] = 4 + 9 * noise(t / 70, 16) + 2 * noise(t / 9, 17);
    bottomInset[i] = 4 + 9 * noise(t / 70, 18) + 2 * noise(t / 9, 19);
  }
  for (let y = 0; y < W; y++) {
    const cy = y * px;
    // The clipped mask, sampled bilinearly (rows are top-down, like the canvas).
    const gy = (y / (W - 1)) * (res - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(res - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < W; x++) {
      const cx = x * px;
      const edge =
        ramp((cx - leftInset[y]) / 1.5) *
        ramp((size - cx - rightInset[y]) / 1.5) *
        ramp((cy - topInset[x]) / 1.5) *
        ramp((size - cy - bottomInset[x]) / 1.5);
      if (!edge) continue;
      const gx = (x / (W - 1)) * (res - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(res - 1, x0 + 1);
      const fx = gx - x0;
      const c =
        (clipped[y0 * res + x0] * (1 - fx) + clipped[y0 * res + x1] * fx) * (1 - fy) +
        (clipped[y1 * res + x0] * (1 - fx) + clipped[y1 * res + x1] * fx) * fy;
      // Streaky, like the edges: noise stretched along the brushing direction.
      const inGamut = c ? ramp((0.5 - c + 0.35 * (noise2(cx / 45, cy / 2.5, 21) - 0.5)) * 8) : 1;
      img.data[(y * W + x) * 4 + 3] = 255 * edge * inGamut;
    }
  }
  ctx.putImageData(img, 0, 0);
  masks.set(key, out);
  return out;
}
