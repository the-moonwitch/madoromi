// What must hold of every flavour, whatever the knobs in src/core/palette.ts are turned to.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { oklabToLinear, oklabToOklch } from "../src/core/color";
import { ANSI_NAMES, GUIDE, slotOf } from "../src/core/guide";
import { ACCENTS, MAX_HUE_SHIFT, MIN_DELTA, MODES, NEUTRALS, SEASONS, buildFamily, checkFlavour, encodeFamily } from "../src/core/palette";
import { decodeSummary } from "../src/core/summary";

const summary = decodeSummary(JSON.parse(readFileSync("public/precomputed/summary.json", "utf8")))!;
const family = buildFamily(summary.views);
const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const dE = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

test("the summary is current", () => expect(summary).toBeDefined());

test("every season by day and by night, days first", () => {
  expect(family.map((f) => f.id)).toEqual(MODES.flatMap((m) => SEASONS.map((s) => `${s.id}-${m.id}`)));
});

test("src/flavours.json is what the inks give now (run `bun run palettes`)", () => {
  expect(JSON.parse(readFileSync("src/flavours.json", "utf8"))).toEqual(encodeFamily(family));
});

describe.each(family.map((f) => [f.id, f] as const))("%s", (_, f) => {
  test("meets every contrast and distinctness minimum", () => {
    const failing = checkFlavour(f).filter((c) => c.value < c.min);
    expect(failing.map((c) => `${c.what} ${c.value.toFixed(2)} < ${c.min}`)).toEqual([]);
  });

  test("every colour is in sRGB", () => {
    for (const s of [...ACCENTS, ...NEUTRALS]) {
      const rgb = oklabToLinear(...f.colours[s.key].lab);
      expect(Math.min(...rgb)).toBeGreaterThan(-1e-3);
      expect(Math.max(...rgb)).toBeLessThan(1 + 1e-3);
    }
  });

  test("every accent is near its name's hue", () => {
    for (const a of ACCENTS) expect(hueDistance(oklabToOklch(f.colours[a.key].lab)[2], a.hue)).toBeLessThanOrEqual(MAX_HUE_SHIFT + 0.5);
  });

  test("no accent goes grey", () => {
    for (const a of ACCENTS.filter((x) => x.vivid)) expect(oklabToOklch(f.colours[a.key].lab)[1]).toBeGreaterThan(a.minChroma * 0.65);
  });

  test("the neutrals run from paper to ink", () => {
    const L = (k: string) => f.colours[k].lab[0];
    const ladder = ["kami", "nijimi0", "nijimi1", "nijimi2", "kasure0", "kasure1", "kasure2", "usuzumi0", "usuzumi1", "sumi"];
    const sign = f.mode === "hiru" ? -1 : 1;
    for (let i = 1; i < ladder.length; i++) expect(sign * (L(ladder[i]) - L(ladder[i - 1]))).toBeGreaterThan(0);
  });

  test("16 terminal colours", () => expect(f.ansi).toHaveLength(16));
});

test("the seasons differ from each other", () => {
  for (const m of MODES) {
    const fs = family.filter((f) => f.mode === m.id);
    for (let i = 0; i < fs.length; i++)
      for (let j = i + 1; j < fs.length; j++) {
        const d = ACCENTS.reduce((t, a) => t + dE(fs[i].colours[a.key].lab, fs[j].colours[a.key].lab), 0) / ACCENTS.length;
        expect(d).toBeGreaterThan(MIN_DELTA * 0.5);
      }
  }
});

test("the style guide names only real colours", () => {
  const slots = new Set([...ACCENTS, ...NEUTRALS].map((s) => s.key));
  for (const s of GUIDE) for (const r of s.rows) for (const c of r.colours) expect(slots.has(slotOf(c))).toBe(true);
  expect(ANSI_NAMES).toHaveLength(8);
});
