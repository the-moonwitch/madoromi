// Every port's files parse in the format their program reads, and the zips the page offers open.
import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildFamily } from "../src/core/palette";
import { decodeSummary } from "../src/core/summary";
import { PORTS, portFiles, portFolder } from "../src/ports";
import { zip } from "../src/ports/zip";

const summary = decodeSummary(JSON.parse(readFileSync("public/precomputed/summary.json", "utf8")))!;
const files = portFiles(buildFamily(summary.views));
const has = (cmd: string) => spawnSync("sh", ["-c", `command -v ${cmd}`]).status === 0;
const ofType = (ext: string) => Object.entries(files).filter(([p]) => p.endsWith(ext));

test("the committed palettes/ is what the ports write now (run `bun run palettes`)", () => {
  for (const [path, text] of Object.entries(files)) expect(readFileSync(join("palettes", path), "utf8")).toBe(text.endsWith("\n") ? text : text + "\n");
});

test("JSON parses", () => {
  for (const [, text] of ofType(".json")) expect(() => JSON.parse(text)).not.toThrow();
});

test("TOML parses", () => {
  for (const [, text] of ofType(".toml")) expect(() => Bun.TOML.parse(text)).not.toThrow();
});

test.skipIf(!has("plutil"))("iTerm2 colour presets are valid plists", () => {
  const dir = mkdtempSync(join(tmpdir(), "madoromi-"));
  for (const [path, text] of ofType(".itermcolors")) {
    const at = join(dir, path.split("/").pop()!);
    writeFileSync(at, text);
    expect(spawnSync("plutil", ["-lint", at]).status).toBe(0);
  }
});

test.skipIf(!has("nvim"))("every Neovim colour scheme loads", () => {
  const dir = mkdtempSync(join(tmpdir(), "madoromi-"));
  for (const [path, text] of Object.entries(files).filter(([p]) => p.startsWith("nvim/"))) {
    const at = join(dir, path);
    spawnSync("mkdir", ["-p", at.slice(0, at.lastIndexOf("/"))]);
    writeFileSync(at, text);
  }
  for (const [path] of ofType(".lua").filter(([p]) => p.startsWith("nvim/colors/"))) {
    const name = path.split("/").pop()!.replace(".lua", "");
    const r = spawnSync("nvim", ["--headless", "--clean", "-u", "NONE", "--cmd", `set rtp^=${join(dir, "nvim")}`, "-c", `colorscheme ${name}`, "-c", "lua io.write(vim.g.colors_name)", "-c", "qa!"]);
    expect(r.stderr.toString()).toBe("");
    expect(r.stdout.toString()).toContain(name);
  }
});

test.skipIf(!has("emacs"))("every Emacs theme loads", () => {
  const dir = mkdtempSync(join(tmpdir(), "madoromi-"));
  for (const [path, text] of ofType("-theme.el")) writeFileSync(join(dir, path.split("/").pop()!), text);
  for (const [path] of ofType("-theme.el")) {
    const name = path.split("/").pop()!.replace("-theme.el", "");
    const r = spawnSync("emacs", ["--batch", "--eval", `(progn (add-to-list 'custom-theme-load-path "${dir}/") (load-theme '${name} t) (princ (format "%s" custom-enabled-themes)))`]);
    expect(r.stderr.toString()).toBe("");
    expect(r.stdout.toString()).toContain(name);
  }
});

test.skipIf(!has("unzip"))("the page's zips open", () => {
  const dir = mkdtempSync(join(tmpdir(), "madoromi-"));
  for (const port of PORTS.filter((p) => p.dir !== ".")) {
    const f = portFolder(port, files);
    if (!Object.keys(f.files).length) continue;
    const at = join(dir, f.name);
    writeFileSync(at, zip(f.files));
    expect(spawnSync("unzip", ["-tq", at]).status).toBe(0);
  }
});

test("every port says how to install it", () => {
  for (const p of PORTS) expect(p.install.length).toBeGreaterThan(0);
});
