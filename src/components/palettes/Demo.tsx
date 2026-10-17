import { For } from "solid-js";
import { ROLES, type Role } from "../../core/palette";

/** A colour by role or slot, as the custom property the site sets. */
export const v = (key: Role | string) => `var(--m-${(ROLES as Record<string, string>)[key] ?? key})`;
const ansi = (n: number) => `var(--m-ansi-${n})`;

type Token = [text: string, role: Role, style?: "italic" | "bold"];
/** A line of code, and what's drawn over it. */
interface Line {
  tokens: Token[];
  cursor?: boolean;
  diagnostic?: { kind: "error" | "warning" | "hint"; text: string };
}

const CODE: Line[] = [
  { tokens: [["import", "keyword"], [" { ", "punctuation"], ["dilute", "function"], [", ", "punctuation"], ["type", "keyword"], [" Ink", "type"], [" } ", "punctuation"], ["from", "keyword"], [' "./ink"', "string"], [";", "punctuation"]] },
  { tokens: [] },
  { tokens: [["/** The strokes of one ink, palest last. */", "comment", "italic"]] },
  { tokens: [["@", "decorator"], ["memo", "decorator"]] },
  {
    tokens: [["export function ", "keyword"], ["strokes", "function"], ["(", "punctuation"], ["ink", "parameter", "italic"], [": ", "operator"], ["Ink", "type"], [", ", "punctuation"], ["steps", "parameter", "italic"], [" = ", "operator"], ["8", "number"], ["): ", "punctuation"], ["Stroke", "type"], ["[] {", "punctuation"]],
  },
  {
    cursor: true,
    tokens: [["  const ", "keyword"], ["ramp", "text"], [" = ", "operator"], ["dilute", "function"], ["(", "punctuation"], ["ink", "parameter", "italic"], [", { ", "punctuation"], ["from", "property"], [": ", "operator"], ["0.24", "number"], [", ", "punctuation"], ["sheen", "property"], [": ", "operator"], ["true", "constant"], [" });", "punctuation"]],
  },
  {
    tokens: [["  if", "keyword"], [" (", "punctuation"], ["steps", "parameter", "italic"], [" < ", "operator"], ["1", "number"], [") ", "punctuation"], ["throw new ", "keyword"], ["RangeError", "builtin"], ["(", "punctuation"], ["`no strokes: ", "string"], ["${", "escape"], ["steps", "parameter", "italic"], ["}", "escape"], ["`", "string"], [");", "punctuation"]],
  },
  {
    tokens: [["  return ", "keyword"], ["ramp", "text"], [".", "operator"], ["map", "function"], ["((", "punctuation"], ["colour", "parameter", "italic"], [", ", "punctuation"], ["i", "parameter", "italic"], [") => ({ ", "operator"], ["colour", "property"], [", ", "punctuation"], ["wet", "property"], [": ", "operator"], ["i", "parameter", "italic"], [" / ", "operator"], ["steps", "parameter", "italic"], [", ", "punctuation"], ["kind", "property"], [": ", "operator"], ["Kind", "type"], [".", "operator"], ["Brush", "enumMember"], [" }));", "punctuation"]],
  },
  { tokens: [["}", "punctuation"]] },
  { tokens: [] },
  { tokens: [["enum ", "keyword"], ["Kind", "type"], [" { ", "punctuation"], ["Brush", "enumMember"], [", ", "punctuation"], ["Pen", "enumMember"], [" }", "punctuation"]], diagnostic: { kind: "warning", text: "Pen is never used" } },
  { tokens: [["const ", "keyword"], ["SAMPLE", "constant"], [" = ", "operator"], ["/^(\\d{2})_([a-z-]+)\\.webp$/", "regexp"], [";", "punctuation"]] },
  { tokens: [["console", "builtin"], [".", "operator"], ["log", "function"], ["(", "punctuation"], ["this", "self", "italic"], [".", "operator"], ["ramp", "property"], [");", "punctuation"]], diagnostic: { kind: "error", text: "'this' is undefined here" } },
];

/** An editor, drawn as the ports draw it. */
export function EditorDemo() {
  return (
    <figure class="win editor" aria-label="an editor in this flavour">
      <div class="win-tabs">
        <span class="tab on">brush.ts</span>
        <span class="tab">ink.ts</span>
        <span class="tab">README.md</span>
      </div>
      <div class="win-body">
        <ol class="gutter">
          <For each={CODE}>{(l, i) => <li classList={{ on: !!l.cursor }}>{i() + 1}</li>}</For>
        </ol>
        <pre class="code">
          <For each={CODE}>
            {(l) => (
              <div class="line" classList={{ cursor: !!l.cursor }}>
                <For each={l.tokens}>
                  {([text, role, style], j) => (
                    <span
                      classList={{ squiggle: !!l.diagnostic && l.diagnostic.kind !== "hint" && j() === 0, sel: !!l.cursor && text === "dilute" }}
                      style={{
                        color: v(role),
                        "font-style": style === "italic" ? "italic" : undefined,
                        "font-weight": style === "bold" ? 700 : undefined,
                        "text-decoration-color": l.diagnostic ? v(l.diagnostic.kind) : undefined,
                      }}
                    >
                      {text}
                    </span>
                  )}
                </For>
                {l.cursor && <span class="caret" />}
                {l.diagnostic && <span class={`virtual ${l.diagnostic.kind}`}>■ {l.diagnostic.text}</span>}
                {l.tokens.length ? "" : " "}
              </div>
            )}
          </For>
        </pre>
      </div>
      <div class="win-status">
        <span class="mode">NORMAL</span>
        <span> main</span>
        <span style={{ color: v("error") }}>✗ 1</span>
        <span style={{ color: v("warning") }}>! 1</span>
        <span class="spacer" />
        <span>typescript</span>
        <span>6:21</span>
      </div>
    </figure>
  );
}

type Seg = [text: string, colour?: number | string, bold?: boolean];
const TERM: Seg[][] = [
  [["~/madoromi", 4], [" main", 5], [" ❯ ", 2], ["ls palettes"]],
  [["alacritty/  css/  ghostty/  iterm2/  kitty/  nvim/", 4, true]],
  [["vscode/  wezterm/  zed/  ", 4, true], ["madoromi.json  README.md  style-guide.md"]],
  [["~/madoromi", 4], [" main", 5], [" ❯ ", 2], ["git log --oneline -3"]],
  [["cf9266d", 3], [" (", 3], ["HEAD", 6, true], [" -> ", 3], ["main", 2, true], [")", 3], [" palettes: seasonal moods"]],
  [["d724c69", 3], [" palettes: choose accents for harmony"]],
  [["0847ca5", 3], [" palettes: chestnut autumn"]],
  [["~/madoromi", 4], [" main", 5], [" ❯ ", 2], ["bun run palettes"]],
  [["✓", 2], [" wrote 64 files under palettes/"]],
  [["!", 3], [" fuji glows by day"], [" (0.25)", 8]],
  [["~/madoromi", 4], [" main", 5], [" ❯ ", 1], ["█", "cursor"]],
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
