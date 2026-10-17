// Builds the madoromi palettes from the inks' ramps (see src/core/palette.ts) and writes every port
// of them under palettes/: the tokens (madoromi.json, css/madoromi.css), terminal themes and editor
// themes. Prints each flavour's contrast and fails if any minimum isn't met.
// Usage: bun run palettes
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PRECOMPUTED_DIR } from "../src/core/cloudfile";
import { contrast, oklabToOklch } from "../src/core/color";
import { ACCENTS, MODES, NEUTRALS, ROLES, SEASONS, buildFamily, checkFlavour, harmonyOf, type Flavour } from "../src/core/palette";
import { SUMMARY_FILE, decodeSummary } from "../src/core/summary";
import { HEADER, type Files } from "./ports/common";
import { terminals } from "./ports/terminals";
import { vscode } from "./ports/vscode";
import { zed } from "./ports/zed";
import { nvim } from "./ports/nvim";

const OUT = "palettes";
/** Everything under palettes/ that this script writes; the rest (the readme) is left alone. */
const GENERATED = ["madoromi.json", "css", "ghostty", "kitty", "wezterm", "alacritty", "iterm2", "vscode/themes", "zed", "nvim"];

const summary = decodeSummary(JSON.parse(readFileSync(join("public", PRECOMPUTED_DIR, SUMMARY_FILE), "utf8")));
if (!summary) throw new Error("the summary is out of date: run `bun run preprocess` first");
const family = buildFamily(summary.views);

// --- Report.
let failed = 0;
for (const f of family) {
  const paper = f.colours.kami.lab;
  console.log(`\n${f.id}  kami ${f.colours.kami.hex}  sumi ${f.colours.sumi.hex}`);
  const line = (key: string) => {
    const c = f.colours[key];
    const [L, C, h] = oklabToOklch(c.lab);
    return `${key.padEnd(9)} ${c.hex}  ${c.ink.padEnd(16)} at L ${c.L.toFixed(2)}  oklch ${L.toFixed(2)} ${C.toFixed(2)} ${h.toFixed(0).padStart(3)}  ${contrast(c.lab, paper).toFixed(1).padStart(4)}:1`;
  };
  const h = harmonyOf(f);
  console.log(
    `  harmony: L** ${h.apparent.mean.toFixed(3)} ± ${h.apparent.sd.toFixed(3)}, glow ${h.glow.toFixed(3)}, chroma ${h.chroma.mean.toFixed(3)} ± ${h.chroma.sd.toFixed(3)}, gamut ${h.gamut.toFixed(2)}; loudest ${h.loudest.key} (glow ${h.loudest.glow.toFixed(3)})`,
  );
  for (const a of ACCENTS) console.log("  " + line(a.key));
  for (const n of NEUTRALS) console.log("  " + line(n.key));
  for (const c of checkFlavour(f).filter((c) => c.value < c.min)) {
    console.log(`  FAIL ${c.what}: ${c.value.toFixed(3)} < ${c.min}`);
    failed++;
  }
}

// --- Tokens.
const swatchJSON = (f: Flavour, key: string) => {
  const c = f.colours[key];
  const [L, C, h] = oklabToOklch(c.lab);
  return { hex: c.hex, oklch: [+L.toFixed(4), +C.toFixed(4), +h.toFixed(2)], ink: c.ink, at: +c.L.toFixed(3) };
};
const tokens = {
  name: "madoromi",
  about: "Every colour is one of Pilot's iroshizuku inks, diluted: `ink` is the ink and `at` the lightness along its ramp.",
  seasons: SEASONS.map(({ id, kanji, english, grey }) => ({ id, kanji, english, grey })),
  modes: MODES,
  accents: ACCENTS.map(({ key, name, kanji, english }) => ({ key, name, kanji, english })),
  neutrals: NEUTRALS.map(({ key, name, kanji, english }) => ({ key, name, kanji, english })),
  roles: ROLES,
  flavours: Object.fromEntries(
    family.map((f) => [
      f.id,
      {
        season: f.season,
        mode: f.mode,
        dark: f.mode === "yoru",
        colours: Object.fromEntries([...ACCENTS, ...NEUTRALS].map((s) => [s.key, swatchJSON(f, s.key)])),
        ansi: f.ansi.map((s) => s.hex),
      },
    ]),
  ),
};
const css = [
  `/* madoromi: ${HEADER}. */`,
  ...family.map((f) =>
    [
      `[data-madoromi="${f.id}"] {`,
      `  color-scheme: ${f.mode === "yoru" ? "dark" : "light"};`,
      ...[...NEUTRALS, ...ACCENTS].map((s) => `  --madoromi-${s.key}: ${f.colours[s.key].hex};`),
      `}`,
    ].join("\n"),
  ),
].join("\n\n");

const files: Files = {
  "madoromi.json": JSON.stringify(tokens, null, 2),
  "css/madoromi.css": css,
  ...terminals(family),
  ...vscode(family),
  ...zed(family),
  ...nvim(family),
};
for (const g of GENERATED) rmSync(join(OUT, g), { recursive: true, force: true });
for (const [path, text] of Object.entries(files)) {
  const to = join(OUT, path);
  if (!existsSync(dirname(to))) mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, text.endsWith("\n") ? text : text + "\n");
}
console.log(`\nwrote ${Object.keys(files).length} files under ${OUT}/`);
if (failed) {
  console.error(`${failed} checks failed`);
  process.exit(1);
}
