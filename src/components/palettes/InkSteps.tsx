import { createEffect, createMemo, createSignal, For, onCleanup, onMount } from "solid-js";
import { anchoredField, defaultAnalysisOptions, renderField } from "../../core/analyze";
import { oklabToHex, type Vec3 } from "../../core/color";
import type { Ramp } from "../../core/summary";
import { inks } from "../../inks";
import { loadPoints } from "../../load";

const STEPS = [
  { name: "scan", text: "A scan of the ink on paper. Every pixel is a colour (shown here shuffled; the scans themselves aren't published)." },
  { name: "points", text: "Each pixel becomes a point in colour space. Seen from above, hue goes around and colourfulness goes outwards." },
  { name: "bands", text: "Seen from the side, lightness goes up and colourfulness out. The points are split into bands by lightness, and the most colourful in each band (larger) set that band's colour." },
  { name: "curve", text: "A smooth curve joins the bands. It gives one colour for each lightness, from the darkest ink to the palest. The dots are an 8-step ramp along it." },
  { name: "gradient", text: "A gradient is fitted around the curve to show how the ink varies on the paper. Colours a screen can't show are left out." },
];
const SAMPLE = 2400;
const BANDS = 16;
const W = 560;
const H = 360;

/** Seeded shuffle, so an ink always looks the same. */
function shuffle<T>(xs: T[], seed: number): T[] {
  let s = seed || 1;
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** From an ink's scans to its gradient, step by step, on the ink you choose. */
export function InkSteps(props: { ramp: (id: string) => Ramp | undefined; start: string }) {
  const [ink, setInk] = createSignal(props.start);
  const [step, setStep] = createSignal(0);
  const [points, setPoints] = createSignal<Vec3[]>([]);
  let canvas!: HTMLCanvasElement;

  createEffect(() => {
    const id = ink();
    setPoints([]);
    loadPoints(id).then((p) => {
      if (!p || id !== ink()) return;
      const all: Vec3[] = [];
      for (let i = 0; i < p.length; i += 3) all.push([p[i], p[i + 1], p[i + 2]]);
      setPoints(shuffle(all, id.length * 7919).slice(0, SAMPLE));
    });
  });

  // Where each point sits at each step, and what's drawn over it.
  const layout = createMemo(() => {
    const pts = points();
    const r = props.ramp(ink());
    if (!pts.length || !r) return;
    const pad = 24;
    // 1: a mosaic of the pixels.
    const cols = Math.ceil(Math.sqrt((pts.length * (W - 2 * pad)) / (H - 2 * pad)));
    const cell = (W - 2 * pad) / cols;
    const mosaic = pts.map((_, i) => [pad + (i % cols) * cell + cell / 2, pad + Math.floor(i / cols) * cell + cell / 2] as [number, number]);
    // 2: from above, a and b, fitted to the cloud.
    const curve = r.curve.lab;
    const ext = Math.max(0.04, ...pts.map((p) => Math.max(Math.abs(p[1]), Math.abs(p[2]))));
    const top = (lab: ArrayLike<number>) => [W / 2 + (lab[1] / ext) * (H / 2 - pad), H / 2 - (lab[2] / ext) * (H / 2 - pad)] as [number, number];
    // 3: from the side, chroma and lightness.
    const maxC = Math.max(0.05, ...pts.map((p) => Math.hypot(p[1], p[2]))) * 1.08;
    const side = (L: number, C: number) => [pad + 30 + (C / maxC) * (W - 2 * pad - 30), H - pad - L * (H - 2 * pad)] as [number, number];
    const sideOf = (lab: ArrayLike<number>) => side(lab[0], Math.hypot(lab[1], lab[2]));
    // Lightness bands, narrower at the ends (as the analysis cuts them), and their most vivid points.
    const byL = pts.map((p, i) => [p[0], i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const edges = Array.from({ length: BANDS + 1 }, (_, k) => byL[Math.min(byL.length - 1, Math.floor(((1 - Math.cos((Math.PI * k) / BANDS)) / 2) * (byL.length - 1)))][0]);
    const vivid = new Set<number>();
    for (let k = 0; k < BANDS; k++) {
      const band = byL.filter(([L]) => L >= edges[k] && L <= edges[k + 1]).map(([, i]) => i);
      band.sort((a, b) => Math.hypot(pts[b][1], pts[b][2]) - Math.hypot(pts[a][1], pts[a][2]));
      for (const i of band.slice(0, Math.max(1, Math.round(band.length * 0.06)))) vivid.add(i);
    }
    const n = curve.length / 3;
    const curvePts = Array.from({ length: n }, (_, i) => [curve[i * 3], curve[i * 3 + 1], curve[i * 3 + 2]] as Vec3);
    const field = renderField(anchoredField(r.sampleField, r.curve), defaultAnalysisOptions.margin);
    return { mosaic, top: pts.map(top), sidePts: pts.map(sideOf), edges, vivid, curvePts, sideOf, side, field, maxC };
  });

  // Points glide from one arrangement to the next.
  let from: [number, number][] = [];
  let shown: [number, number][] = [];
  let t = 1;
  let raf = 0;
  const target = () => {
    const l = layout();
    if (!l) return [];
    return step() === 0 ? l.mosaic : step() === 1 ? l.top : l.sidePts;
  };
  createEffect(() => {
    const goal = target();
    void step();
    from = shown.length === goal.length ? shown.slice() : goal;
    // No gliding where motion is to be kept down, or where nothing would draw it (a hidden page).
    t = matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden ? 1 : 0;
    cancelAnimationFrame(raf);
    const tick = () => {
      t = Math.min(1, t + 1 / 24);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      shown = goal.map((g, i) => [from[i][0] + (g[0] - from[i][0]) * e, from[i][1] + (g[1] - from[i][1]) * e]);
      draw(e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    tick();
  });
  onCleanup(() => cancelAnimationFrame(raf));

  const draw = (e: number) => {
    const ctx = canvas?.getContext("2d");
    const l = layout();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!l) return;
    const css = getComputedStyle(canvas);
    const faint = css.getPropertyValue("--hair") || "#ccc";
    const dim = css.getPropertyValue("--dim") || "#888";
    const s = step();
    // The gradient, faded in over everything else.
    if (s === 4) {
      const { res, rgba, clipped } = l.field;
      const img = new ImageData(res, res);
      for (let i = 0; i < res * res; i++) {
        img.data.set(rgba.subarray(i * 4, i * 4 + 3), i * 4);
        img.data[i * 4 + 3] = clipped[i] ? 0 : 255 * e;
      }
      const off = new OffscreenCanvas(res, res);
      off.getContext("2d")!.putImageData(img, 0, 0);
      const size = H - 48;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, (W - size) / 2, 24, size, size);
      const { lo, hi } = l.field;
      const toPx = (u: number, v: number) => [(W - size) / 2 + ((u - lo) / (hi - lo)) * size, 24 + (1 - (v - lo) / (hi - lo)) * size];
      const r = props.ramp(ink())!;
      ctx.beginPath();
      for (let i = 0; i < r.curve.uv.length / 2; i++) {
        const [x, y] = toPx(r.curve.uv[i * 2], r.curve.uv[i * 2 + 1]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5 * e;
      ctx.stroke();
      if (e >= 1) return;
    }
    // Axes and bands.
    if (s >= 2) {
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1;
      for (const L of l.edges) {
        const [, y] = l.side(L, 0);
        ctx.beginPath();
        ctx.moveTo(l.side(0, 0)[0], y);
        ctx.lineTo(W - 24, y);
        ctx.stroke();
      }
      ctx.fillStyle = dim;
      ctx.font = "11px sans-serif";
      ctx.fillText("lightness ↑", 24, 16);
      ctx.fillText("colourfulness →", W - 120, H - 6);
    } else if (s === 1) {
      ctx.strokeStyle = faint;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The points.
    const pts = points();
    const fade = s === 4 ? 1 - e : s === 3 ? 0.35 : 1;
    for (let i = 0; i < shown.length; i++) {
      const big = s === 2 && l.vivid.has(i);
      ctx.globalAlpha = fade * (s === 2 && !big ? 0.35 : 0.9);
      ctx.fillStyle = oklabToHex(pts[i]);
      const [x, y] = shown[i];
      if (s === 0 && e >= 1) {
        const c = (W - 48) / Math.ceil(Math.sqrt((pts.length * (W - 48)) / (H - 48)));
        ctx.fillRect(x - c / 2, y - c / 2, c + 0.5, c + 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, big ? 4 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // The curve and its ramp.
    if (s === 3) {
      for (let i = 1; i < l.curvePts.length; i++) {
        const [x0, y0] = l.sideOf(l.curvePts[i - 1]);
        const [x1, y1] = l.sideOf(l.curvePts[i]);
        ctx.strokeStyle = oklabToHex(l.curvePts[i]);
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      for (const c of props.ramp(ink())!.ramp) {
        const [x, y] = l.sideOf(c);
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = oklabToHex(c);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--paper") || "#fff";
        ctx.stroke();
      }
    }
  };
  onMount(() => draw(1));

  return (
    <div class="m-steps-demo">
      <div class="m-steps-controls">
        <label>
          <span class="visually-hidden">ink</span>
          <select value={ink()} onChange={(e) => setInk(e.currentTarget.value)}>
            <For each={inks}>{(i) => <option value={i.id}>{`${i.name} ${i.kanji ?? ""}`}</option>}</For>
          </select>
        </label>
        <div class="m-steps-tabs" role="tablist" aria-label="step">
          <For each={STEPS}>
            {(st, i) => (
              <button role="tab" aria-selected={step() === i()} classList={{ on: step() === i() }} onClick={() => setStep(i())}>
                {i() + 1} {st.name}
              </button>
            )}
          </For>
        </div>
      </div>
      <canvas ref={canvas} class="m-steps-canvas" role="img" aria-label={`${ink()}: ${STEPS[step()].name}`} />
      <p class="m-steps-text">
        {step() + 1}. {STEPS[step()].text}
      </p>
      <div class="m-steps-nav">
        <button class="link" disabled={step() === 0} onClick={() => setStep(step() - 1)}>
          ← back
        </button>
        <button class="link" disabled={step() === STEPS.length - 1} onClick={() => setStep(step() + 1)}>
          next →
        </button>
      </div>
    </div>
  );
}
