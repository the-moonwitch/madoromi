// Mixes a palette from inks, like the site's mixer, and writes every port of it (by day and by
// night) into a folder, with the VS Code extension packed as a .vsix.
// Usage: bun run mix <ink> [<ink>…] [--harmony mono|analogous|complementary|triadic|tetradic] [--out <folder>]
// e.g.   bun run mix tsuki-yo hana-ikada --harmony complementary
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PRECOMPUTED_DIR } from "../src/core/cloudfile";
import { contrast } from "../src/core/color";
import { HARMONIES, mixFamily, mixName, type Harmony } from "../src/core/mix";
import { ACCENTS } from "../src/core/palette";
import { SUMMARY_FILE, decodeSummary } from "../src/core/summary";
import { portFiles, vsixFiles } from "../src/ports";
import { zip } from "../src/ports/zip";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const harmony = (flag("harmony") ?? "mono") as Harmony;
const outFlag = flag("out");
const fail = (message: string) => {
  console.error(message);
  process.exit(1);
};

const summary = decodeSummary(JSON.parse(readFileSync(join("public", PRECOMPUTED_DIR, SUMMARY_FILE), "utf8")));
if (!summary) fail("the summary is out of date: run `bun run preprocess` first");
if (!HARMONIES.some((h) => h.id === harmony)) fail(`harmony is one of: ${HARMONIES.map((h) => h.id).join(", ")}`);
const unknown = args.filter((id) => !summary!.views.has(id));
if (!args.length || unknown.length) fail(`${unknown.length ? `no ink called ${unknown.join(", ")}; ` : ""}inks: ${[...summary!.views.keys()].join(" ")}`);

const name = `madoromi-${mixName(args, harmony)}`;
const out = outFlag ?? name;
const family = mixFamily(summary!.views, args, harmony);
const files = portFiles(family, name);
for (const [path, text] of Object.entries(files)) {
  mkdirSync(dirname(join(out, path)), { recursive: true });
  writeFileSync(join(out, path), text.endsWith("\n") ? text : text + "\n");
}
writeFileSync(join(out, `${name}.vsix`), zip(vsixFiles(files)));

for (const f of family) {
  const paper = f.colours.kami.lab;
  console.log(`\n${f.id}  kami ${f.colours.kami.hex}  sumi ${f.colours.sumi.hex}`);
  for (const a of ACCENTS) {
    const c = f.colours[a.key];
    console.log(`  ${a.key.padEnd(9)} ${c.hex}  ${c.ink.padEnd(16)} at L ${c.L.toFixed(2)}  ${contrast(c.lab, paper).toFixed(1).padStart(4)}:1`);
  }
  const distinct = new Set(ACCENTS.map((a) => f.colours[a.key].hex)).size;
  if (distinct < ACCENTS.length) console.log(`  ${distinct} distinct accents: these inks have only so many legible strengths, so some accents share a colour.`);
}
console.log(`\n${Object.keys(files).length + 1} files in ${out}/ (see palettes/README.md for where each goes)`);
