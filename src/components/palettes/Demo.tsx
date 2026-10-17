import { createMemo, createSignal, For } from "solid-js";
import { ROLES, type Role } from "../../core/palette";
import { highlight, LANGUAGES, type Token } from "./highlight";

/** A colour by role or slot, as the custom property the site sets. */
export const v = (key: Role | string) => `var(--m-${(ROLES as Record<string, string>)[key] ?? key})`;
const ansi = (n: number) => `var(--m-ansi-${n})`;

interface Sample {
  source: string;
  /** 1-based lines. */
  cursor: number;
  selected: string;
  completion: { line: number; col: number; items: [name: string, role: Role, kind: string][] };
  hover: { line: number; col: number; signature: Token[]; doc: string };
  signs: Record<number, "added" | "modified" | "deleted">;
  diagnostics: Record<number, { kind: "error" | "warning"; text: string }>;
}

const SAMPLES: Record<string, Sample> = {
  ts: {
    source: `import { dilute, type Ink } from "./ink";

/** The strokes of one ink, palest last. */
@memo
export function strokes(ink: Ink, steps = 8): Stroke[] {
  const ramp = dil(ink, { from: 0.24, sheen: true });
  if (steps < 1) throw new RangeError(\`no strokes: \${steps}\`);
  return ramp.map((colour, i) => ({ colour, wet: i / steps }));
}

enum Kind { Brush, Pen }
const SAMPLE = /^(\\d{2})_([a-z-]+)\\.webp$/;
console.log(this.ramp);`,
    cursor: 6,
    selected: "dil",
    completion: { line: 6, col: 15, items: [["dilute", "function", "ƒ"], ["diluted", "property", "◇"], ["DILUTION", "constant", "π"], ["Ink", "type", "T"]] },
    hover: { line: 11, col: 5, signature: [["enum ", "keyword"], ["Kind", "type"], [" { ", "punctuation"], ["Brush", "enumMember"], [" = ", "operator"], ["0", "number"], [", ", "punctuation"], ["Pen", "enumMember"], [" = ", "operator"], ["1", "number"], [" }", "punctuation"]], doc: "how a stroke was made" },
    signs: { 5: "modified", 6: "modified", 12: "added", 9: "deleted" },
    diagnostics: { 11: { kind: "warning", text: "Pen is never used" }, 13: { kind: "error", text: "'this' is undefined here" } },
  },
  rs: {
    source: `use crate::ink::{dilute, Ink};

/// The strokes of one ink, palest last.
#[must_use]
pub fn strokes(ink: &Ink, steps: usize) -> Vec<Stroke> {
    let ramp = dil(ink, 0.24, true);
    if steps < 1 { panic!("no strokes: {steps}"); }
    ramp.iter().enumerate()
        .map(|(i, colour)| Stroke { colour, wet: i as f32 / steps as f32 })
        .collect()
}

enum Kind { Brush, Pen }
const SAMPLE: &str = r"^(\\d{2})_([a-z-]+)\\.webp$";`,
    cursor: 6,
    selected: "dil",
    completion: { line: 6, col: 18, items: [["dilute", "function", "ƒ"], ["diluted", "property", "◇"], ["DILUTION", "constant", "π"], ["Ink", "type", "T"]] },
    hover: { line: 13, col: 5, signature: [["enum ", "keyword"], ["Kind", "type"], [" { ", "punctuation"], ["Brush", "enumMember"], [", ", "punctuation"], ["Pen", "enumMember"], [" }", "punctuation"]], doc: "how a stroke was made" },
    signs: { 5: "modified", 6: "modified", 13: "added", 10: "deleted" },
    diagnostics: { 13: { kind: "warning", text: "variant \`Pen\` is never constructed" }, 14: { kind: "error", text: "expected \`Regex\`, found \`&str\`" } },
  },
  py: {
    source: `from ink import dilute, Ink

# The strokes of one ink, palest last.
@cache
def strokes(ink: Ink, steps: int = 8) -> list[Stroke]:
    ramp = dil(ink, start=0.24, sheen=True)
    if steps < 1:
        raise ValueError(f"no strokes: {steps}")
    return [Stroke(colour, wet=i / steps) for i, colour in enumerate(ramp)]


class Kind(Enum):
    BRUSH = 1
SAMPLE = re.compile(r"^(\\d{2})_([a-z-]+)\\.webp$")
print(self.ramp)`,
    cursor: 6,
    selected: "dil",
    completion: { line: 6, col: 14, items: [["dilute", "function", "ƒ"], ["diluted", "property", "◇"], ["DILUTION", "constant", "π"], ["Ink", "type", "T"]] },
    hover: { line: 12, col: 6, signature: [["class ", "keyword"], ["Kind", "type"], ["(", "punctuation"], ["Enum", "type"], [")", "punctuation"]], doc: "how a stroke was made" },
    signs: { 5: "modified", 6: "modified", 14: "added", 10: "deleted" },
    diagnostics: { 14: { kind: "error", text: '"re" is not defined' }, 15: { kind: "error", text: '"self" is not defined' } },
  },
};

const TREE: { name: string; depth: number; folder?: boolean; open?: boolean; status?: "modified" | "added"; file?: boolean }[] = [
  { name: "madoromi", depth: 0, folder: true, open: true },
  { name: "src", depth: 1, folder: true, open: true },
  { name: "brush", depth: 2, file: true, status: "modified" },
  { name: "ink", depth: 2 },
  { name: "palette", depth: 2, status: "added" },
  { name: "palettes", depth: 1, folder: true },
  { name: "samples", depth: 1, folder: true },
  { name: "README.md", depth: 1 },
];

/** An editor, drawn as the ports draw it, in a choice of languages. */
export function EditorDemo() {
  const [lang, setLang] = createSignal<keyof typeof LANGUAGES>("ts");
  const sample = () => SAMPLES[lang()];
  const lines = createMemo(() => highlight(sample().source, LANGUAGES[lang()]));
  const ext = () => LANGUAGES[lang()].file.split(".").pop();
  return (
    <figure class="win editor" aria-label="an editor in this flavour">
      <div class="win-tabs">
        <span class="tab on">{LANGUAGES[lang()].file}</span>
        <span class="tab">ink.{ext()}</span>
        <span class="spacer" />
        <span class="langs" role="group" aria-label="language">
          <For each={Object.entries(LANGUAGES)}>
            {([id, l]) => (
              <button classList={{ on: lang() === id }} onClick={() => setLang(id as keyof typeof LANGUAGES)}>
                {l.name}
              </button>
            )}
          </For>
        </span>
      </div>
      <div class="win-main">
        <ul class="tree">
          <For each={TREE}>
            {(t) => (
              <li classList={{ on: !!t.file }} style={{ "padding-left": `${8 + t.depth * 12}px`, color: t.status ? v(t.status) : t.folder ? v("usuzumi1") : undefined }}>
                <span class="twisty">{t.folder ? (t.open ? "▾" : "▸") : ""}</span>
                {t.folder || t.name.includes(".") ? t.name : `${t.name}.${ext()}`}
                {t.status && <span class="status">{t.status === "modified" ? "M" : "A"}</span>}
              </li>
            )}
          </For>
        </ul>
        <div class="win-body">
          <ol class="gutter">
            <For each={lines()}>
              {(_, i) => (
                <li classList={{ on: i() + 1 === sample().cursor }}>
                  {i() + 1}
                  <span class={`sign ${sample().signs[i() + 1] ?? ""}`} />
                </li>
              )}
            </For>
          </ol>
          <pre class="code">
            <For each={lines()}>
              {(tokens, i) => {
                const n = i() + 1;
                const d = () => sample().diagnostics[n];
                return (
                  <div class="line" classList={{ cursor: n === sample().cursor }}>
                    <For each={tokens}>
                      {([text, role, style], j) => (
                        <span
                          classList={{ squiggle: !!d() && j() === tokens.findIndex((t) => t[0].trim()), sel: n === sample().cursor && text === sample().selected }}
                          style={{
                            color: v(role),
                            "font-style": style === "italic" ? "italic" : undefined,
                            "text-decoration-color": d() ? v(d()!.kind) : undefined,
                          }}
                        >
                          {text}
                        </span>
                      )}
                    </For>
                    {n === sample().cursor && <span class="caret" />}
                    {d() && <span class={`virtual ${d()!.kind}`}>■ {d()!.text}</span>}
                    {tokens.length ? "" : " "}
                    {n === sample().completion.line && (
                      <span class="popup completion" style={{ left: `${sample().completion.col}ch` }}>
                        <For each={sample().completion.items}>
                          {([name, role, kind], k) => (
                            <span classList={{ item: true, on: k() === 0 }}>
                              <i style={{ color: v(role) }}>{kind}</i>
                              <b>{name.slice(0, sample().selected.length)}</b>
                              {name.slice(sample().selected.length)}
                            </span>
                          )}
                        </For>
                      </span>
                    )}
                    {n === sample().hover.line && (
                      <span class="popup hover" style={{ left: `${sample().hover.col}ch` }}>
                        <span>
                          <For each={sample().hover.signature}>{([t, r, st]) => <span style={{ color: v(r), "font-style": st === "italic" ? "italic" : undefined }}>{t}</span>}</For>
                        </span>
                        <span class="doc">{sample().hover.doc}</span>
                      </span>
                    )}
                  </div>
                );
              }}
            </For>
          </pre>
        </div>
      </div>
      <div class="win-status">
        <span class="mode">INSERT</span>
        <span>main</span>
        <span style={{ color: v("added") }}>+2</span>
        <span style={{ color: v("modified") }}>~2</span>
        <span style={{ color: v("error") }}>✗ {Object.values(sample().diagnostics).filter((d) => d.kind === "error").length}</span>
        <span style={{ color: v("warning") }}>! {Object.values(sample().diagnostics).filter((d) => d.kind === "warning").length}</span>
        <span class="spacer" />
        <span>{LANGUAGES[lang()].name.toLowerCase()}</span>
        <span>
          {sample().cursor}:{sample().completion.col + 1}
        </span>
      </div>
    </figure>
  );
}

type Seg = [text: string, colour?: number | string, bold?: boolean];
const PROMPT: Seg[] = [["~/madoromi", 4], [" main", 5], [" ❯ ", 2]];
const bar = (label: string, n: number, of = 30): Seg[] => {
  const full = Math.round((n / 100) * of);
  const g = Math.min(full, Math.round(of * 0.5));
  const y = Math.min(full - g, Math.round(of * 0.25));
  return [[` ${label} `, 6], ["[", 8], ["|".repeat(g), 2], ["|".repeat(y), 3], ["|".repeat(full - g - y), 1], [" ".repeat(of - full)], [`${n}%`.padStart(4), 8], ["]", 8]];
};
const TERM: Seg[][] = [
  [...PROMPT, ["ls -l palettes"]],
  [["drwxr-xr-x  ", 8], ["ghostty/", 4, true], ["  "], ["nvim/", 4, true], ["  "], ["vscode/", 4, true]],
  [["-rw-r--r--  ", 8], ["madoromi.json  style-guide.md"]],
  [["lrwxr-xr-x  ", 8], ["latest", 6], [" -> madoromi.json"]],
  [["-rwxr-xr-x  ", 8], ["install.sh", 2, true]],
  [...PROMPT, ["git diff --stat"]],
  [[" src/core/palette.ts | 42 "], ["+++++++++", 2], ["-----", 1]],
  [[" palettes/README.md  |  7 "], ["+++", 2], ["--", 1]],
  [...PROMPT, ["git log --oneline -2"]],
  [["dc76534", 3], [" (", 3], ["HEAD", 6, true], [" -> ", 3], ["main", 2, true], [")", 3], [" a site for the palettes"]],
  [["cf9266d", 3], [" seasonal moods, even neutrals"]],
  [...PROMPT, ["htop"]],
  bar("CPU", 58),
  bar("MEM", 83),
  [["  PID ", 0, true], ["USER     ", 0, true], ["COMMAND", 0, true]],
  [[" 4071 ", 8], ["you      ", 8], ["bun run palettes", 2]],
  [...PROMPT.slice(0, 2), [" ❯ ", 1], ["█", "cursor"]],
];

/** A terminal, in the flavour's 16 colours. */
export function TerminalDemo() {
  return (
    <figure class="win term" aria-label="a terminal in this flavour">
      <pre>
        <For each={TERM}>
          {(line) => (
            <div>
              <For each={line}>
                {([text, colour, bold]) => (
                  <span style={{ color: typeof colour === "number" ? ansi(colour) : colour ? v(colour) : undefined, "font-weight": bold ? 700 : undefined }}>{text}</span>
                )}
              </For>
            </div>
          )}
        </For>
      </pre>
      <ol class="ansi">
        <For each={Array.from({ length: 16 }, (_, i) => i)}>{(i) => <li style={{ background: ansi(i) }} title={`${i}`} />}</For>
      </ol>
    </figure>
  );
}

/** Buttons, notices, tags and links. */
export function InterfaceDemo() {
  return (
    <figure class="win ui" aria-label="interface parts in this flavour">
      <div class="ui-row">
        <button class="ui-button primary">install</button>
        <button class="ui-button">preview</button>
        <span class="ui-tag">aki</span>
        <span class="ui-tag">yoru</span>
        <a class="ui-link">style guide</a>
      </div>
      <For each={[["success", "64 files written"], ["info", "8 flavours, 26 colours each"], ["warning", "fuji glows by day"], ["error", "no ink fits that hue"]] as const}>
        {([kind, text]) => (
          <div class="ui-note" style={{ "--k": v(kind) }}>
            <b>{kind}</b> {text}
          </div>
        )}
      </For>
      <label class="ui-input">
        <span>search</span>
        <input placeholder="an ink, a colour…" />
      </label>
    </figure>
  );
}
