import { createEffect, createMemo, createSignal, For, onCleanup } from "solid-js";
import { oklabToHex, type Vec3 } from "../../core/color";
import type { Ramp } from "../../core/summary";
import { inks } from "../../inks";
import { loadPoints } from "../../load";

/** The ink the demo follows: sunset, whose colour turns from red to gold as it thins. */
const DEMO_INK = "yu-yake";

const STEPS = [
  { name: "scan", text: "A scan of the ink on paper. Every pixel is a colour. They're shown shuffled here, because the scans themselves aren't published." },
  { name: "colour space", text: "Each pixel becomes a point in a 3D colour space (oklab). Lightness runs up the middle; hue goes around it, and colourfulness outwards." },
  { name: "bands", text: "The points are split into bands by lightness, narrower at the ends. The most colourful points in each band (larger) decide that band's colour." },
  { name: "interpolation", text: "Each band gives one colour (the rings). A smooth curve is drawn through them, from the darkest ink to the palest." },
  { name: "ramp", text: "The curve gives a colour for every lightness. Eight evenly spaced points along it make the ink's ramp." },
  { name: "gradient", text: "Laid out flat, the curve is the ink's gradient: every strength of yu-yake, from darkest to palest. An accent colour is one point on a gradient like this." },
];
const SAMPLE = 2200;
const BANDS = 16;
const W = 560;
const H = 360;
/** Chroma drawn larger than lightness, as in the ink views. */
const CHROMA_SCALE = 2.5;
/** How far the view looks down onto the colour space. */
const TILT = 0.38;

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

/** From an ink's scan to its gradient, a step at a time. */
export function InkSteps(props: { ramp: (id: string) => Ramp | undefined }) {
  const [step, setStep] = createSignal(0);
  const [points, setPoints] = createSignal<Vec3[]>([]);
  const ink = inks.find((i) => i.id === DEMO_INK)!;
  const ramp = () => props.ramp(DEMO_INK);
  let canvas!: HTMLCanvasElement;

  loadPoints(DEMO_INK).then((p) => {
    if (!p) return;
    const all: Vec3[] = [];
    for (let i = 0; i < p.length; i += 3) all.push([p[i], p[i + 1], p[i + 2]]);
    setPoints(shuffle(all, 7919).slice(0, SAMPLE));
  });

  // What the 3D steps need: the bands, their most colourful points, and one colour per band.
  const model = createMemo(() => {
    const pts = points();
    if (!pts.length) return;
    const byL = pts.map((p, i) => [p[0], i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const cut = (k: number) => Math.min(byL.length - 1, Math.floor(((1 - Math.cos((Math.PI * k) / BANDS)) / 2) * (byL.length - 1)));
    const edges = Array.from({ length: BANDS + 1 }, (_, k) => byL[cut(k)][0]);
    const vivid = new Set<number>();
    const controls: Vec3[] = [];
    for (let k = 0; k < BANDS; k++) {
      const band = byL.slice(cut(k), cut(k + 1) + 1).map(([, i]) => i);
      band.sort((a, b) => Math.hypot(pts[b][1], pts[b][2]) - Math.hypot(pts[a][1], pts[a][2]));
      const top = band.slice(0, Math.max(1, Math.round(band.length * 0.08)));
      for (const i of top) vivid.add(i);
      controls.push([0, 1, 2].map((c) => top.reduce((t, i) => t + pts[i][c], 0) / top.length) as Vec3);
    }
    const mid = (edges[0] + edges[BANDS]) / 2;
    const reach = Math.max(0.05, ...pts.map((p) => Math.hypot(p[1], p[2]) * CHROMA_SCALE), (edges[BANDS] - edges[0]) / 2);
    const radius = Math.max(...pts.map((p) => Math.hypot(p[1], p[2]))) * 1.05;
    return { edges, vivid, controls, mid, radius, scale: (H / 2 - 30) / reach };
  });

  // 3D → screen: turned about the lightness axis by `turn`, seen from a little above. The third
  // value is depth (larger is nearer).
  const project = (lab: ArrayLike<number>, turn: number): [number, number, number] => {
    const m = model()!;
    const a = lab[1] * CHROMA_SCALE;
    const b = lab[2] * CHROMA_SCALE;
    const x = a * Math.cos(turn) - b * Math.sin(turn);
    const z = a * Math.sin(turn) + b * Math.cos(turn);
    const y = lab[0] - m.mid;
    return [W / 2 + x * m.scale, H / 2 - (y * Math.cos(TILT) - z * Math.sin(TILT)) * m.scale, z * Math.cos(TILT) + y * Math.sin(TILT)];
  };
  const grid = (n: number) => {
    const cols = Math.ceil(Math.sqrt((n * (W - 48)) / (H - 48)));
    return { cols, cell: (W - 48) / cols };
  };
  const mosaic = (i: number, n: number): [number, number] => {
    const { cols, cell } = grid(n);
    return [24 + (i % cols) * cell + cell / 2, 24 + Math.floor(i / cols) * cell + cell / 2];
  };

  // The points glide from the mosaic into space, and the space keeps turning.
  let turn = 0.6;
  let glide = 1;
  let raf = 0;
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden;
  createEffect(() => {
    const s = step();
    void model();
    glide = s === 1 && !still() ? 0 : 1;
    cancelAnimationFrame(raf);
    const tick = () => {
      if (glide < 1) glide = Math.min(1, glide + 1 / 40);
      const turning = s >= 1 && s <= 4 && !still();
      if (turning) turn += 0.004;
      draw();
      if (glide < 1 || turning) raf = requestAnimationFrame(tick);
    };
    tick();
  });
  onCleanup(() => cancelAnimationFrame(raf));

  const draw = () => {
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const m = model();
    const r = ramp();
    const pts = points();
    if (!m || !r) return;
    const css = getComputedStyle(canvas);
    const hair = css.getPropertyValue("--hair").trim() || "#ccc";
    const dim = css.getPropertyValue("--dim").trim() || "#888";
    const paper = css.getPropertyValue("--paper").trim() || "#fff";
    const s = step();
    ctx.font = "11px sans-serif";
    ctx.globalAlpha = 1;

    if (s === 0) {
      const { cell } = grid(pts.length);
      pts.forEach((p, i) => {
        const [x, y] = mosaic(i, pts.length);
        ctx.fillStyle = oklabToHex(p);
        ctx.fillRect(x - cell / 2, y - cell / 2, cell + 0.5, cell + 0.5);
      });
      return;
    }

    if (s === 5) {
      // The curve laid flat, with the ramp's eight steps under it.
      const lab = r.curve.lab;
      const n = lab.length / 3;
      const x0 = 40;
      const x1 = W - 40;
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      for (let i = 0; i < n; i++) g.addColorStop(i / (n - 1), oklabToHex([lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x0, 110, x1 - x0, 70, 8);
      ctx.fill();
      const sw = (x1 - x0) / r.ramp.length;
      r.ramp.forEach((c, i) => {
        ctx.fillStyle = oklabToHex(c);
        ctx.beginPath();
        ctx.roundRect(x0 + i * sw + 3, 200, sw - 6, 40, 6);
        ctx.fill();
      });
      ctx.fillStyle = dim;
      ctx.fillText("darkest", x0, 100);
      ctx.textAlign = "right";
      ctx.fillText("palest", x1, 100);
      ctx.textAlign = "left";
      ctx.fillText("the ramp: eight steps", x0, 262);
      return;
    }

    // The lightness axis.
    const [ax, ay] = project([m.edges[0], 0, 0], turn);
    const [bx, by] = project([m.edges[BANDS], 0, 0], turn);
    ctx.strokeStyle = hair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = dim;
    ctx.fillText("lightness", bx + 6, by);
    // The bands, as rings around it.
    if (s === 2 || s === 3)
      for (const L of m.edges) {
        ctx.beginPath();
        for (let k = 0; k <= 48; k++) {
          const t = (k / 48) * Math.PI * 2;
          const [x, y] = project([L, m.radius * Math.cos(t), m.radius * Math.sin(t)], turn);
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = hair;
        ctx.stroke();
      }

    // Everything with depth, drawn back to front.
    const marks: { z: number; draw: () => void }[] = [];
    const glideEase = glide < 0.5 ? 2 * glide * glide : 1 - (-2 * glide + 2) ** 2 / 2;
    pts.forEach((p, i) => {
      let [x, y, z] = project(p, turn);
      if (s === 1 && glide < 1) {
        const [mx, my] = mosaic(i, pts.length);
        x = mx + (x - mx) * glideEase;
        y = my + (y - my) * glideEase;
      }
      const big = s === 2 && m.vivid.has(i);
      const alpha = s === 2 ? (big ? 1 : 0.25) : s >= 3 ? 0.18 : 0.9;
      marks.push({
        z,
        draw: () => {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = oklabToHex(p);
          ctx.beginPath();
          ctx.arc(x, y, big ? 3.6 : 2, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    });
    if (s === 3)
      // Each band's colour, and straight lines between them, under the smooth curve.
      m.controls.forEach((c, i) => {
        const [x, y, z] = project(c, turn);
        const next = m.controls[i + 1];
        if (next) {
          const [nx, ny, nz] = project(next, turn);
          marks.push({
            z: (z + nz) / 2,
            draw: () => {
              ctx.globalAlpha = 0.7;
              ctx.setLineDash([3, 3]);
              ctx.strokeStyle = dim;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(nx, ny);
              ctx.stroke();
              ctx.setLineDash([]);
            },
          });
        }
        marks.push({
          z: z + 0.001,
          draw: () => {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = oklabToHex(c);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.stroke();
          },
        });
      });
    if (s >= 3) {
      const lab = r.curve.lab;
      const n = lab.length / 3;
      for (let i = 1; i < n; i++) {
        const c: Vec3 = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
        const [x0, y0, z0] = project([lab[i * 3 - 3], lab[i * 3 - 2], lab[i * 3 - 1]], turn);
        const [x1, y1, z1] = project(c, turn);
        marks.push({
          z: (z0 + z1) / 2,
          draw: () => {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = oklabToHex(c);
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          },
        });
      }
    }
    if (s === 4)
      for (const c of r.ramp) {
        const [x, y, z] = project(c, turn);
        marks.push({
          z: z + 0.002,
          draw: () => {
            ctx.globalAlpha = 1;
            ctx.fillStyle = oklabToHex(c);
            ctx.strokeStyle = paper;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          },
        });
      }
    marks.sort((p, q) => p.z - q.z);
    for (const mk of marks) mk.draw();
    ctx.globalAlpha = 1;
  };

  /** Back and forward go round: after the last step comes the first. */
  const go = (by: number) => setStep((step() + by + STEPS.length) % STEPS.length);

  return (
    <div class="m-steps-demo">
      <div class="m-steps-tabs" role="tablist" aria-label="steps">
        <For each={STEPS}>
          {(st, i) => (
            <button role="tab" aria-selected={step() === i()} classList={{ on: step() === i() }} onClick={() => setStep(i())}>
              {st.name}
            </button>
          )}
        </For>
      </div>
      <canvas ref={canvas} class="m-steps-canvas" role="img" aria-label={`${ink.name}, ${STEPS[step()].name}`} />
      <div class="m-steps-nav">
        <button class="m-cta" onClick={() => go(-1)} aria-label="previous step">
          ←
        </button>
        <span class="m-steps-count">
          Step {step() + 1} of {STEPS.length}: <b>{STEPS[step()].name}</b>
        </span>
        <button class="m-cta" onClick={() => go(1)} aria-label="next step">
          →
        </button>
      </div>
      <p class="m-steps-text">{STEPS[step()].text}</p>
    </div>
  );
}
