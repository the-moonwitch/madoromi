import { createMemo, createSignal, For, Show } from "solid-js";
import { ACCENTS, MODES, NEUTRALS, ROLES, SEASONS, buildFamily, type Flavour, type Role } from "../core/palette";
import { SHEET_COLUMNS, type Ramp } from "../core/summary";
import { inks } from "../inks";
import type { Sprite } from "./Palette";

/** The neutrals from the paper outwards to the ink, as they're laid out. */
const LADDER = ["chitsu", "hyoshi", "kami", "nijimi0", "nijimi1", "nijimi2", "kasure0", "kasure1", "kasure2", "usuzumi0", "usuzumi1", "sumi"];
const SLOT = new Map([...ACCENTS, ...NEUTRALS].map((s) => [s.key, s]));
const INK = new Map(inks.map((i) => [i.id, i]));

/** A few lines of code, each token with the role it's drawn in. */
const CODE: [string, Role][][] = [
  [["// every colour is an ink, diluted", "comment"]],
  [["import", "keyword"], [" { ", "punctuation"], ["dilute", "function"], [" } ", "punctuation"], ["from", "keyword"], [' "./ink"', "string"], [";", "punctuation"]],
  [],
  [["export function ", "keyword"], ["brush", "function"], ["(", "punctuation"], ["ink", "parameter"], [": ", "operator"], ["Ink", "type"], [", ", "punctuation"], ["steps", "parameter"], [" = ", "operator"], ["8", "number"], [") {", "punctuation"]],
  [["  const ", "keyword"], ["ramp", "text"], [" = ", "operator"], ["dilute", "function"], ["(", "punctuation"], ["ink", "parameter"], [", { ", "punctuation"], ["from", "property"], [": ", "operator"], ["0.24", "number"], [", ", "punctuation"], ["sheen", "property"], [": ", "operator"], ["true", "constant"], [" });", "punctuation"]],
  [["  return ", "keyword"], ["ramp", "text"], [".", "operator"], ["map", "function"], ["((", "punctuation"], ["c", "parameter"], [") => ", "operator"], ["`${", "escape"], ["ink", "parameter"], [".", "operator"], ["name", "property"], ["}", "escape"], [": ", "string"], ["${", "escape"], ["c", "parameter"], ["}", "escape"], ["`", "string"], [");", "punctuation"]],
  [["}", "punctuation"]],
];

/** The four seasons by day and by night, every colour named with the ink it was diluted from. */
export function Palettes(props: { ramps: Map<string, Ramp>; ready: boolean; sprite: (id: string) => Sprite | undefined }) {
  const family = createMemo(() => (props.ready ? buildFamily(props.ramps) : []));
  return (
    <main class="flavours">
      <For each={SEASONS}>
        {(season) => (
          <section class="season">
            <For each={MODES}>
              {(mode) => (
                <Show when={family().find((f) => f.season === season.id && f.mode === mode.id)}>
                  {(f) => <FlavourPanel flavour={f()} kanji={season.kanji + mode.kanji} english={`${season.english} ${mode.english}`} sprite={props.sprite} />}
                </Show>
              )}
            </For>
          </section>
        )}
      </For>
    </main>
  );
}

function FlavourPanel(props: { flavour: Flavour; kanji: string; english: string; sprite: (id: string) => Sprite | undefined }) {
  const c = (key: string) => props.flavour.colours[key].hex;
  const r = (role: Role) => c(ROLES[role]);
  const [shown, setShown] = createSignal("");
  const [copied, setCopied] = createSignal("");
  const copy = (key: string) => {
    navigator.clipboard?.writeText(c(key)).then(() => {
      setCopied(key);
      setTimeout(() => copied() === key && setCopied(""), 1200);
    });
  };
  const hover = (key: string) => ({
    onPointerEnter: () => setShown(key),
    onPointerLeave: () => setShown(""),
    onFocus: () => setShown(key),
    onBlur: () => setShown(""),
    onClick: () => copy(key),
  });
  const shownSwatch = () => (shown() ? props.flavour.colours[shown()] : undefined);

  return (
    <article
      class="flavour"
      style={{
        background: c("kami"),
        color: c("sumi"),
        "--f-dim": c("usuzumi0"),
        "--f-faint": c("kasure1"),
        "--f-line": c("nijimi0"),
        "--f-cover": c("hyoshi"),
      }}
    >
      <header class="flavour-name">
        <span class="deco kanji">{props.kanji}</span>
        <div>
          <h2>{props.flavour.id}</h2>
          <em>{props.english}</em>
        </div>
      </header>

      <ul class="accents">
        <For each={ACCENTS}>
          {(a) => (
            <li>
              <button style={{ color: c(a.key) }} classList={{ on: shown() === a.key }} {...hover(a.key)}>
                <span class="kanji">{a.kanji}</span>
                <span class="name">{a.name}</span>
              </button>
            </li>
          )}
        </For>
      </ul>

      <ul class="ladder">
        <For each={LADDER}>
          {(key) => (
            <li>
              <button style={{ background: c(key) }} classList={{ on: shown() === key }} title={SLOT.get(key)!.name} {...hover(key)} />
            </li>
          )}
        </For>
      </ul>

      <div class="flavour-readout">
        <Show when={shownSwatch()} fallback={
            <span class="from">
              {props.flavour.colours.kami.ink} <span class="kanji">{INK.get(props.flavour.colours.kami.ink)?.kanji}</span>
            </span>
          }>
          {(s) => {
            const slot = () => SLOT.get(shown())!;
            const sprite = () => props.sprite(s().ink);
            return (
              <>
                <Show when={sprite()}>
                  {(sp) => (
                    <span
                      class="stroke"
                      style={{
                        "background-image": `url(${sp().url})`,
                        "background-size": `${SHEET_COLUMNS * 100}% ${sp().rows * 100}%`,
                        "background-position": `${((sp().index % SHEET_COLUMNS) / (SHEET_COLUMNS - 1)) * 100}% ${
                          sp().rows > 1 ? (Math.floor(sp().index / SHEET_COLUMNS) / (sp().rows - 1)) * 100 : 0
                        }%`,
                      }}
                    />
                  )}
                </Show>
                <span class="chip" style={{ background: s().hex }} />
                <b>{slot().name}</b>
                <span class="kanji">{slot().kanji}</span>
                <code>{copied() === shown() ? "copied" : s().hex}</code>
                <span class="from">
                  {s().ink} <span class="kanji">{INK.get(s().ink)?.kanji}</span> at {s().L.toFixed(2)}
                </span>
              </>
            );
          }}
        </Show>
      </div>

      <pre class="code" style={{ background: c("hyoshi") }}>
        <For each={CODE}>
          {(line) => (
            <div>
              <For each={line}>{([text, role]) => <span style={{ color: r(role), "font-style": role === "comment" ? "italic" : undefined }}>{text}</span>}</For>
              {line.length ? "" : " "}
            </div>
          )}
        </For>
      </pre>

      <div class="term" style={{ background: c("kami"), "border-color": c("nijimi0") }}>
        <div>
          <span style={{ color: props.flavour.ansi[4].hex }}>~/madoromi</span> <span style={{ color: props.flavour.ansi[5].hex }}>❯</span> git status
        </div>
        <div>
          <span style={{ color: props.flavour.ansi[2].hex }}>+ palettes/</span> <span style={{ color: props.flavour.ansi[3].hex }}>~ palette.ts</span>{" "}
          <span style={{ color: props.flavour.ansi[1].hex }}>− grey.ts</span>
        </div>
        <ol class="ansi">
          <For each={props.flavour.ansi}>{(s) => <li style={{ background: s.hex }} title={`${s.ink} at ${s.L.toFixed(2)}`} />}</For>
        </ol>
      </div>
    </article>
  );
}

