// Palettes mixed from the inks: every harmony gives a day and a night flavour made of the chosen
// inks and the ones it adds, as legible and in gamut as the madoromi flavours, and every port of
// them parses and installs beside madoromi.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { oklabToLinear } from "../src/core/color";
import { HARMONIES, harmonyInks, mixFamily, mixName } from "../src/core/mix";
import { ACCENTS, buildFamily, checkFlavour } from "../src/core/palette";
import { decodeSummary } from "../src/core/summary";
import { portFiles, vsixFiles } from "../src/ports";

const views = decodeSummary(JSON.parse(readFileSync("public/precomputed/summary.json", "utf8")))!.views;
const choices = [["tsuki-yo", "hana-ikada"], ["fuyu-syogun"], ["yu-yake"], ["kon-peki", "ina-ho", "momiji"]];

describe.each(HARMONIES.map((h) => [h.id] as const))("%s", (harmony) => {
  for (const chosen of choices)
    test(chosen.join(" + "), () => {
      const inks = harmonyInks(views, chosen, harmony);
      const family = mixFamily(views, chosen, harmony);
      expect(inks.slice(0, chosen.length)).toEqual(chosen);
      expect(family.map((f) => f.id)).toEqual([`${mixName(chosen, harmony)}-hiru`, `${mixName(chosen, harmony)}-yoru`]);
      for (const f of family) {
        // Every contrast the madoromi flavours meet; only distinctness may run short (few inks).
        expect(checkFlavour(f).filter((c) => !c.what.endsWith("ΔE") && c.value < c.min)).toEqual([]);
        for (const a of ACCENTS) expect(inks).toContain(f.colours[a.key].ink);
        for (const c of [...Object.values(f.colours), ...f.ansi]) {
          const rgb = oklabToLinear(...c.lab);
          expect(Math.min(...rgb)).toBeGreaterThan(-1e-3);
          expect(Math.max(...rgb)).toBeLessThan(1 + 1e-3);
        }
      }
    });
});

test("mono-ramp adds no inks; the others add some", () => {
  expect(harmonyInks(views, ["yu-yake"], "mono")).toEqual(["yu-yake"]);
  for (const h of HARMONIES.filter((x) => x.id !== "mono")) expect(harmonyInks(views, ["yu-yake"], h.id).length).toBeGreaterThan(1);
});

test("a mix's ports parse, and install beside madoromi's", () => {
  const name = `madoromi-${mixName(["tsuki-yo", "hana-ikada"], "complementary")}`;
  const files = portFiles(mixFamily(views, ["tsuki-yo", "hana-ikada"], "complementary"), name);
  const madoromi = portFiles(buildFamily(views));
  // The VS Code extension's own files are inside its package, which has the mix's name.
  for (const path of Object.keys(files).filter((p) => !p.startsWith("vscode/") || p.startsWith("vscode/themes/"))) expect(madoromi[path]).toBeUndefined();
  for (const [path, text] of Object.entries(files)) {
    if (path.endsWith(".json")) expect(() => JSON.parse(text)).not.toThrow();
    if (path.endsWith(".toml")) expect(() => Bun.TOML.parse(text)).not.toThrow();
  }
  const vsix = vsixFiles(files);
  expect(JSON.parse(vsix["extension/package.json"]).name).toBe(name);
  expect(vsix["extension.vsixmanifest"]).toContain(`Id="${name}"`);
});
