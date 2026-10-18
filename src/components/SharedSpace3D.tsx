import { createEffect, onCleanup, onMount } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { oklabToSrgbGamut, type Vec3 } from "../core/color";
import type { Ramp } from "../core/summary";
import { useFit, useSpin } from "./spin";

export interface SharedSpace3DProps {
  ramps: Map<string, Ramp>;
  hovered: string;
  onHover: (ink: string) => void;
  onPick: (ink: string) => void;
}

/** a and b are stretched by this so the hue spread reads at the same scale as lightness. */
const CHROMA_SCALE = 3;
// three's y is up: oklab (L, a, b) → (a·k, L, b·k).
const pos = (lab: ArrayLike<number>, o = 0): [number, number, number] => [lab[o + 1] * CHROMA_SCALE, lab[o], lab[o + 2] * CHROMA_SCALE];
const color = (lab: Vec3) => {
  const { rgb } = oklabToSrgbGamut(lab);
  return new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
};

/** Every ink's ramp in oklab, with a ball at its full-strength colour. */
export function SharedSpace3D(props: SharedSpace3DProps) {
  let host!: HTMLDivElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  const spin = useSpin();
  const layer = new THREE.Group();
  scene.add(layer);
  const frameView = useFit(camera, () => controls);
  const inks = new Map<string, { line: LineMaterial; ball: THREE.Mesh; at: THREE.Vector3[] }>();

  onMount(() => {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    host.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // Turning only: the wheel and pinch scroll the page rather than zoom.
    controls.enableZoom = false;
    controls.enablePan = false;
    spin.attach(controls, host);
    camera.position.set(0.75, 0.6, 1);
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frameView.refit();
      for (const o of inks.values()) o.line.resolution.set(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    onCleanup(() => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    });
  });

  createEffect(() => {
    const ramps = props.ramps;
    const all: number[] = [];
    layer.traverse((o) => {
      (o as THREE.Mesh).geometry?.dispose();
      ((o as THREE.Mesh).material as THREE.Material | undefined)?.dispose();
    });
    layer.clear();
    inks.clear();
    for (const [id, r] of ramps) {
      const m = r.curve.lab.length / 3;
      const lp: number[] = [];
      const lc: number[] = [];
      const at: THREE.Vector3[] = [];
      for (let i = 0; i < m; i++) {
        const p = pos(r.curve.lab, i * 3);
        lp.push(...p);
        all.push(...p);
        if (i % 4 === 0) at.push(new THREE.Vector3(...p));
        const c = color([r.curve.lab[i * 3], r.curve.lab[i * 3 + 1], r.curve.lab[i * 3 + 2]]);
        lc.push(c.r, c.g, c.b);
      }
      const lg = new LineGeometry();
      lg.setPositions(lp);
      lg.setColors(lc);
      const line = new LineMaterial({ vertexColors: true, linewidth: 2.5, worldUnits: false, transparent: true });
      line.resolution.set(host?.clientWidth || 1, host?.clientHeight || 1);
      layer.add(new Line2(lg, line));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshBasicMaterial({ color: color(r.main), transparent: true }));
      ball.position.set(...pos(r.main));
      at.push(ball.position.clone());
      layer.add(ball);
      inks.set(id, { line, ball, at });
    }
    // Framed on every ramp, so none is ever cut off however the view turns.
    frameView.fit(all);
    highlight(props.hovered);
  });

  const highlight = (hovered: string) => {
    for (const [id, o] of inks) {
      const focus = id === hovered;
      const faded = hovered && !focus ? 0.15 : 1;
      o.line.linewidth = focus ? 5 : 2.5;
      o.line.opacity = faded;
      (o.ball.material as THREE.MeshBasicMaterial).opacity = faded;
      o.ball.scale.setScalar(focus ? 1.8 : 1);
      o.ball.renderOrder = focus ? 1 : 0;
    }
  };
  createEffect(() => highlight(props.hovered));

  // A drag turns the view; only a click that stayed put picks an ink.
  let down = { x: 0, y: 0 };
  const still = (e: MouseEvent) => Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4;

  /** The ink whose ramp or ball is nearest the pointer on screen. */
  const nearest = (e: MouseEvent): string => {
    const r = renderer.domElement.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const v = new THREE.Vector3();
    let best = "";
    let bd = 14 * 14;
    for (const [id, o] of inks)
      for (const p of o.at) {
        v.copy(p).project(camera);
        const d = ((v.x + 1) / 2 * r.width - x) ** 2 + ((1 - v.y) / 2 * r.height - y) ** 2;
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
    return best;
  };

  return (
    <div
      class="view3d shared"
      ref={host}
      onPointerMove={(e) => props.onHover(nearest(e))}
      onPointerLeave={() => props.onHover("")}
      onPointerDown={(e) => (down = { x: e.clientX, y: e.clientY })}
      onClick={(e) => {
        const id = still(e) ? nearest(e) : "";
        if (id) props.onPick(id);
      }}
    >
    </div>
  );
}
