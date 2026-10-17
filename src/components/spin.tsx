import { createSignal, Show } from "solid-js";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let dot: THREE.Texture | undefined;
/** A Gaussian point sprite, so overlapping points blend into an even haze. */
export function softDot(): THREE.Texture {
  if (dot) return dot;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d2 = ((x + 0.5 - size / 2) ** 2 + (y + 0.5 - size / 2) ** 2) / (size / 2) ** 2;
      const o = (y * size + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = 255 * Math.exp(-d2 * 4.5);
    }
  ctx.putImageData(img, 0, 0);
  dot = new THREE.CanvasTexture(c);
  return dot;
}

/**
 * Keeps a 3D view framed so the whole of its content (a sphere around it) is always on screen,
 * however it is turned: the camera stands far enough back for the narrower of the two fields of
 * view, and can't be zoomed in closer than that.
 */
export function useFit(camera: THREE.PerspectiveCamera, controls: () => OrbitControls | undefined) {
  let sphere: { center: THREE.Vector3; radius: number } | undefined;
  const apply = () => {
    const c = controls();
    if (!sphere || !c) return;
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = (sphere.radius / Math.sin(Math.min(vfov, hfov) / 2)) * 1.04;
    const dir = camera.position.clone().sub(c.target);
    if (dir.lengthSq() < 1e-9) dir.set(0.75, 0.45, 1);
    c.target.copy(sphere.center);
    camera.position.copy(sphere.center).add(dir.normalize().multiplyScalar(dist));
    c.minDistance = dist;
    c.maxDistance = dist * 4;
    camera.near = Math.max(0.001, dist - sphere.radius * 1.5);
    camera.far = dist + sphere.radius * 6;
    camera.updateProjectionMatrix();
  };
  /** Frame these points (flat x, y, z). */
  const fit = (positions: ArrayLike<number>) => {
    const n = positions.length / 3;
    if (!n) return;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], positions[i * 3 + k]);
        hi[k] = Math.max(hi[k], positions[i * 3 + k]);
      }
    const center = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2);
    let r2 = 0;
    for (let i = 0; i < n; i++)
      r2 = Math.max(r2, (positions[i * 3] - center.x) ** 2 + (positions[i * 3 + 1] - center.y) ** 2 + (positions[i * 3 + 2] - center.z) ** 2);
    sphere = { center, radius: Math.max(1e-3, Math.sqrt(r2)) };
    apply();
  };
  return { fit, refit: apply };
}

/**
 * A 3D view turns slowly on its own. Pointing at it stops it, and it stays stopped (so it can be
 * looked at or dragged) until the resume button is pressed.
 */
export function useSpin() {
  const [paused, setPaused] = createSignal(false);
  let controls: OrbitControls | undefined;
  const attach = (c: OrbitControls, host: HTMLElement) => {
    controls = c;
    c.autoRotate = true;
    c.autoRotateSpeed = 0.7;
    host.addEventListener("pointerenter", () => {
      c.autoRotate = false;
      setPaused(true);
    });
  };
  const resume = () => {
    if (controls) controls.autoRotate = true;
    setPaused(false);
  };
  const Button = () => (
    <Show when={paused()}>
      <button
        class="spin"
        onClick={(e) => {
          e.stopPropagation();
          resume();
        }}
        title="resume turning"
      >
        ↻
      </button>
    </Show>
  );
  return { attach, Button };
}
