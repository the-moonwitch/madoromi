// Colour-space conversions. Oklab triples are [L, a, b]; linear sRGB in [0, 1].

export type Vec3 = [number, number, number];

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function srgb8ToLinear(v: number): number {
  return SRGB_TO_LINEAR[v];
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function linearToOklab(r: number, g: number, b: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return out;
}

export function oklabToLinear(L: number, a: number, b: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  out[0] = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  out[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  out[2] = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return out;
}

export function oklabToOklch([L, a, b]: Vec3): Vec3 {
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [L, C, h];
}

function inGamut(c: Vec3, eps = 1e-4): boolean {
  return c[0] >= -eps && c[0] <= 1 + eps && c[1] >= -eps && c[1] <= 1 + eps && c[2] >= -eps && c[2] <= 1 + eps;
}

/** Map oklab into sRGB by reducing chroma at constant L and hue. Returns gamma-encoded sRGB in [0,1]. */
/**
 * The colour with its chroma reduced, at the same lightness and hue, just far enough to be
 * displayable in sRGB. In-gamut colours come back unchanged.
 */
export function toSrgbGamut(lab: Vec3): Vec3 {
  const L = Math.min(1, Math.max(0, lab[0]));
  const lin: Vec3 = [0, 0, 0];
  oklabToLinear(L, lab[1], lab[2], lin);
  if (inGamut(lin)) return [L, lab[1], lab[2]];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    oklabToLinear(L, lab[1] * mid, lab[2] * mid, lin);
    if (inGamut(lin)) lo = mid;
    else hi = mid;
  }
  return [L, lab[1] * lo, lab[2] * lo];
}

export function oklabToSrgbGamut(lab: Vec3, out: Vec3 = [0, 0, 0]): { rgb: Vec3; clipped: boolean } {
  const L = Math.min(1, Math.max(0, lab[0]));
  const lin: Vec3 = [0, 0, 0];
  oklabToLinear(L, lab[1], lab[2], lin);
  let clipped = false;
  if (!inGamut(lin)) {
    clipped = true;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      oklabToLinear(L, lab[1] * mid, lab[2] * mid, lin);
      if (inGamut(lin)) lo = mid;
      else hi = mid;
    }
    oklabToLinear(L, lab[1] * lo, lab[2] * lo, lin);
  }
  for (let i = 0; i < 3; i++) out[i] = linearToSrgb(Math.min(1, Math.max(0, lin[i])));
  return { rgb: out, clipped };
}

export function oklabToHex(lab: Vec3): string {
  const { rgb } = oklabToSrgbGamut(lab);
  return "#" + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
}

export function oklabToCss(lab: Vec3): string {
  const [L, C, h] = oklabToOklch(lab);
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(4)} ${h.toFixed(1)})`;
}
