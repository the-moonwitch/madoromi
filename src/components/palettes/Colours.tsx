import { createSignal, For, Show } from "solid-js";
import { oklabToOklch } from "../../core/color";
import { ACCENTS, MODES, NEUTRALS, SEASONS, type Flavour } from "../../core/palette";
import { SHEET_COLUMNS } from "../../core/summary";
import { inks } from "../../inks";
import type { Sprite } from "../Palette";

const FORMATS = ["hex", "rgb", "hsl", "oklch"] as const;
type Format = (typeof FORMATS)[number];

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function hslOf(hex: string): [number, number, number] {
  const [r, g, b] = rgbOf(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function format(f: Flavour, key: string, as: Format): string {
  const c = f.colours[key];
  if (as === "hex") return c.hex;
  if (as === "rgb") return `rgb(${rgbOf(c.hex).join(", ")})`;
  if (as === "hsl") {
    const [h, s, l] = hslOf(c.hex);
    return `hsl(${Math.round(h)}deg, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }
  const [L, C, h] = oklabToOklch(c.lab);
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

const INK = new Map(inks.map((i) => [i.id, i]));

/** Every colour of a flavour in the format chosen, each with the ink it is. */
export function Colours(props: { flavour: Flavour; sprite: (id: string) => Sprite | undefined }) {
  const [as, setAs] = createSignal<Format>("hex");
  const [copied, setCopied] = createSignal("");
  const copy = (key: string, text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => copied() === key && setCopied(""), 1200);
    });
  const css = () => [...ACCENTS, ...NEUTRALS].map((s) => `--madoromi-${s.key}: ${format(props.flavour, s.key, as())};`).join("\n");
  const season = () => SEASONS.find((s) => s.id === props.flavour.season)!;
  const mode = () => MODES.find((m) => m.id === props.flavour.mode)!;

  const rows = (group: { key: string; name: string; kanji: string; english: string }[]) => (
    <For each={group}>
      {(s) => {
        const c = () => props.flavour.colours[s.key];
        const ink = () => INK.get(c().ink);
        const sprite = () => props.sprite(c().ink);
        return (
          <tr>
            <td>
              <span class="m-swatch" style={{ background: c().hex }} />
            </td>
            <td class="m-name">
              <b>{s.name}</b> <span class="kanji">{s.kanji}</span> <em>{s.english}</em>
            </td>
            <td>
              <button class="m-value" onClick={() => copy(s.key, format(props.flavour, s.key, as()))} title="copy">
                {copied() === s.key ? "copied" : format(props.flavour, s.key, as())}
              </button>
            </td>
            <td class="m-ink">
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
              {c().ink} <span class="kanji">{ink()?.kanji}</span> <span class="m-at">at {c().L.toFixed(2)}</span>
            </td>
          </tr>
        );
      }}
    </For>
  );

  return (
    <main class="m-page m-colours">
      <header class="m-title">
        <span class="deco kanji">{season().kanji + mode().kanji}</span>
        <div>
          <h2>{props.flavour.id}</h2>
          <p>
            {season().english} {mode().english}: every colour, and the ink it is. Click a value to copy it.
          </p>
        </div>
      </header>
      <div class="m-formats" role="group" aria-label="format">
        <For each={FORMATS}>
          {(fm) => (
            <button class="link" classList={{ on: as() === fm }} onClick={() => setAs(fm)}>
              {fm}
            </button>
          )}
        </For>
        <button class="link" onClick={() => copy("all", css())}>
          {copied() === "all" ? "copied" : "copy as css"}
        </button>
      </div>
      <table class="m-table">
        <thead>
          <tr>
            <th />
            <th>accents</th>
            <th>{as()}</th>
            <th>ink, and how strong</th>
          </tr>
        </thead>
        <tbody>{rows(ACCENTS)}</tbody>
        <thead>
          <tr>
            <th />
            <th>neutrals</th>
            <th />
            <th>in the cast of</th>
          </tr>
        </thead>
        <tbody>{rows(NEUTRALS)}</tbody>
      </table>
    </main>
  );
}
