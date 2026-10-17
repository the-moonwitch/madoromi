import { createEffect, createMemo, onCleanup, onMount, untrack } from "solid-js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { inkOpacity } from "../core/brush";
import { oklabToLinear, oklabToSrgbGamut, type Vec3 } from "../core/color";
import type { InkView } from "../core/inkview";
import { softDot, useFit, useSpin } from "./spin";

export interface View3DProps {
  view: InkView;
  /** The ink's points, oklab flat. */
  points: Float32Array;
  inkId: string;
}

/**
 * Linear-sRGB vertex colours for a cloud's points, with ink opacity (opaque at the ink's darkest,
 * clear at white) as alpha. Computed once per points array.
 */
const colorCache = new WeakMap<Float32Array, Float32Array>();
function inkColors(points: Float32Array, darkest: number): Float32Array {
  let out = colorCache.get(points);
  if (out) return out;
  const n = points.length / 3;
  out = new Float32Array(n * 4);
  const lin: Vec3 = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    oklabToLinear(points[i * 3], points[i * 3 + 1], points[i * 3 + 2], lin);
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.min(1, Math.max(0, lin[k]));
    out[i * 4 + 3] = inkOpacity(points[i * 3], darkest);
  }
  colorCache.set(points, out);
  return out;
}

function linearColor(lab: Vec3): THREE.Color {
  const { rgb } = oklabToSrgbGamut(lab);
  return new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
}

export function View3D(props: View3DProps) {
  let host!: HTMLDivElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  const spin = useSpin();
  const lineMaterials: LineMaterial[] = [];
  const frameView = useFit(camera, () => controls);

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
    camera.position.set(0.75, 0.45, 1);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frameView.refit();
      for (const m of lineMaterials) m.resolution.set(w, h);
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

  // Turn the camera to the starting angle once per ink; the framing then follows the points.
  let aimedAt: string | undefined;
  const aim = () => {
    if (!controls || aimedAt === props.inkId) return;
    aimedAt = props.inkId;
    camera.position.copy(controls.target).add(new THREE.Vector3(0.75, 0.45, 1));
  };

  // Two layers: the points, and the ramp curve with its steps and peak.
  const layer = () => {
    const g = new THREE.Group();
    scene.add(g);
    return g;
  };
  const pointLayer = layer();
  const curveLayer = layer();
  const clear = (g: THREE.Group) => {
    disposeGroup(g);
    g.clear();
  };

  // Everything sits in oklab (lightness up), centred and scaled evenly to about [−1, 1], so the
  // ink keeps its true proportions.
  const frame = createMemo(() => {
    const pts = props.points;
    const n = pts.length / 3;
    const centre = [0, 0, 0];
    let extent = 1e-6;
    // three's y is up: oklab (L, a, b) → (a, L, b).
    const order = [1, 0, 2];
    for (let k = 0; k < 3; k++) {
      // Extents from a strided sample: as good as all the points, for a tenth of the sorting.
      const step = Math.max(1, Math.floor(n / 6000));
      const axis = Float32Array.from({ length: Math.ceil(n / step) }, (_, i) => pts[i * step * 3 + order[k]]).sort();
      const lo = axis[Math.floor(axis.length * 0.01)];
      const hi = axis[Math.floor(axis.length * 0.99)];
      centre[k] = (lo + hi) / 2;
      extent = Math.max(extent, hi - lo);
    }
    const k = 2 / extent;
    const at = (lab: ArrayLike<number>, o = 0): [number, number, number] => [
      (lab[o + 1] - centre[0]) * k,
      (lab[o] - centre[1]) * k,
      (lab[o + 2] - centre[2]) * k,
    ];
    const points = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) points.set(at(pts, i * 3), i * 3);
    return { points, at };
  });

  createEffect(() => {
    const f = frame();
    clear(pointLayer);
    const v = untrack(() => props.view);
    const pts = untrack(() => props.points);
    untrack(aim);
    const positions = f.points;
    // Framed on every point, so none is ever cut off however the view turns.
    frameView.fit(positions);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(inkColors(pts, v.ramp[0][0]), 4));
    // Broad, faint Gaussian splats, overlapping many deep, add up to an even haze of colour.
    pointLayer.add(
      new THREE.Points(
        g,
        new THREE.PointsMaterial({ size: 0.3, vertexColors: true, map: softDot(), transparent: true, opacity: 0.07, depthWrite: false }),
      ),
    );
  });

  createEffect(() => {
    const a = props.view;
    const cv = a.curve;
    const fr = frame();
    clear(curveLayer);
    lineMaterials.length = 0;
    // The ramp curve, drawn where its true colours sit.
    const m = cv.lab.length / 3;
    const lp: number[] = [];
    const lc: number[] = [];
    for (let i = 0; i < m; i++) {
      const lab: Vec3 = [cv.lab[i * 3], cv.lab[i * 3 + 1], cv.lab[i * 3 + 2]];
      lp.push(...fr.at(lab));
      const c = linearColor(lab);
      lc.push(c.r, c.g, c.b);
    }
    const lg = new LineGeometry();
    lg.setPositions(lp);
    lg.setColors(lc);
    // The curve runs through the middle of the cloud, so it's drawn over the points.
    const lm = new LineMaterial({ vertexColors: true, linewidth: 4, worldUnits: false, depthTest: false });
    lm.resolution.set(host?.clientWidth || 1, host?.clientHeight || 1);
    lineMaterials.push(lm);
    const line = new Line2(lg, lm);
    line.renderOrder = 10;
    curveLayer.add(line);

    const ball = new THREE.SphereGeometry(0.045, 16, 12);
    for (const lab of a.ramp) {
      const s = new THREE.Mesh(ball, new THREE.MeshBasicMaterial({ color: linearColor(lab), depthTest: false }));
      s.renderOrder = 11;
      s.position.set(...fr.at(lab));
      curveLayer.add(s);
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
    );
    ring.renderOrder = 12;
    ring.position.set(...fr.at(a.peak.lab));
    ring.lookAt(camera.position);
    curveLayer.add(ring);
  });

  return (
    <div class="view3d" ref={host}>
      <spin.Button />
    </div>
  );
}




function disposeGroup(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      (x as THREE.MeshBasicMaterial).map?.dispose();
      x.dispose();
    }
  });
}
