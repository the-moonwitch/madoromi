// What a release publishes, in release/: every port zipped (all themes in each), and the tokens.
// The VS Code extension is packaged separately by the release workflow (it needs vsce).
// Usage: bun scripts/release.ts
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRECOMPUTED_DIR } from "../src/core/cloudfile";
import { buildFamily } from "../src/core/palette";
import { SUMMARY_FILE, decodeSummary } from "../src/core/summary";
import { PORTS, portFiles, portFolder } from "../src/ports";
import { zip } from "../src/ports/zip";

const OUT = "release";
const summary = decodeSummary(JSON.parse(readFileSync(join("public", PRECOMPUTED_DIR, SUMMARY_FILE), "utf8")));
if (!summary) throw new Error("the summary is out of date: run `bun run preprocess` first");
const files = portFiles(buildFamily(summary.views));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const port of PORTS) {
  if (port.dir === ".") continue;
  const f = portFolder(port, files);
  writeFileSync(join(OUT, f.name), zip(f.files));
  console.log(`${f.name}: ${Object.keys(f.files).length} files`);
}
// Everything at once, as palettes/ is laid out.
writeFileSync(join(OUT, "madoromi-all.zip"), zip(Object.fromEntries(Object.entries(files).map(([p, t]) => [`madoromi/${p}`, t]))));
writeFileSync(join(OUT, "madoromi.json"), files["madoromi.json"]);
writeFileSync(join(OUT, "madoromi.css"), files["css/madoromi.css"]);
console.log(`wrote ${OUT}/`);
