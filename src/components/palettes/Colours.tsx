import { createSignal, For, Show } from "solid-js";
import { oklabToOklch } from "../../core/color";
import { ACCENTS, MODES, NEUTRALS, SEASONS, type Flavour } from "../../core/palette";
import { oklabToHex } from "../../core/color";
import { SHEET_COLUMNS, type Ramp } from "../../core/summary";
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

/**
 * Every colour of every flavour side by side, then the chosen flavour's in detail: each in the
 * format chosen, with the ink it is.
 */
export function Colours(props: {
  flavour: Flavour;
  family: Flavour[];
  sprite: (id: string) => Sprite | undefined;
  ramp: (id: string) => Ramp | undefined;
  strokeUrl: (id: string) => string | undefined;
  go: (page: string) => void;
}) {
  const [as, setAs] = createSignal<Format>("hex");
  const [copied, setCopied] = createSignal("");
  const copy = (key: string, text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => copied() === key && setCopied(""), 1200);
    });
  const css = () => [...ACCENTS, ...NEUTRALS].map((s) => `--madoromi-${s.key}: ${format(props.flavour, s.key, as())};`).join("\n");
  const json = () => JSON.stringify(Object.fromEntries([...ACCENTS, ...NEUTRALS].map((s) => [s.key, format(props.flavour, s.key, as())])), null, 2);
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
              <span class="m-swatch" aria-hidden="true" style={{ background: c().hex }} />
            </td>
            <td class="m-name">
              <b>{s.name}</b> <span class="kanji">{s.kanji}</span> <em>{s.english}</em>
            </td>
            <td>
              <button class="m-value" onClick={() => copy(s.key, format(props.flavour, s.key, as()))} title="copy" aria-label={`copy ${s.name}, ${format(props.flavour, s.key, as())}`}>
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
              <a href={`#${c().ink}`} onClick={(e) => (e.preventDefault(), props.go(c().ink))}>
                {c().ink} <span class="kanji">{ink()?.kanji}</span>
              </a>{" "}
              <Story ramp={props.ramp(c().ink)} L={c().L} stroke={props.strokeUrl(c().ink)} />
            </td>
          </tr>
        );
      }}
    </For>
  );

  return (
    <main class="m-page m-colours">
      <header class="m-title">
        <span class="deco kanji">色</span>
        <div>
          <h2>colours</h2>
          <p>
            Every flavour's colours, then {props.flavour.id}'s with the ink each one is. Click a colour to copy it.
          </p>
        </div>
      </header>
      <div class="m-formats" role="group" aria-label="format">
        <For each={FORMATS}>
          {(fm) => (
            <button class="link" classList={{ on: as() === fm }} aria-pressed={as() === fm} onClick={() => setAs(fm)}>
              {fm}
            </button>
          )}
        </For>
        <span class="m-copyall">
          <button class="link" onClick={() => copy("css", css())}>
            {copied() === "css" ? "copied" : "copy as css"}
          </button>
          <button class="link" onClick={() => copy("json", json())}>
            {copied() === "json" ? "copied" : "copy as json"}
          </button>
        </span>
      </div>

      <div class="m-matrix-wrap">
        <table class="m-matrix">
          <thead>
            <tr>
              <th />
              <For each={props.family}>
                {(f) => (
                  <th classList={{ on: f.id === props.flavour.id }} style={{ background: f.colours.kami.hex, color: f.colours.sumi.hex }}>
                    <span class="kanji">{SEASONS.find((x) => x.id === f.season)!.kanji + MODES.find((x) => x.id === f.mode)!.kanji}</span>
                    {f.id}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={[...ACCENTS, ...NEUTRALS]}>
              {(sl) => (
                <tr>
                  <th>
                    {sl.name} <span class="kanji">{sl.kanji}</span>
                  </th>
                  <For each={props.family}>
                    {(f) => (
                      <td classList={{ on: f.id === props.flavour.id }} style={{ background: f.colours.kami.hex }}>
                        <button
                          aria-label={`copy ${f.id} ${sl.name}, ${format(f, sl.key, as())}`}
                          style={{ background: f.colours[sl.key].hex }}
                          title={`${f.id} ${sl.name}: ${format(f, sl.key, as())} (${f.colours[sl.key].ink})`}
                          onClick={() => copy(`${f.id}:${sl.key}`, format(f, sl.key, as()))}
                        >
                          {copied() === `${f.id}:${sl.key}` ? "✓" : ""}
                        </button>
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <h3>
        <span class="kanji">{season().kanji + mode().kanji}</span> {props.flavour.id}
      </h3>
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

/**
 * Where on its ink a colour comes from: the ink's ramp from its densest stroke to its palest wash,
 * marked where the colour is read; its brush stroke on hover.
 */
export function Story(props: { ramp: Ramp | undefined; L: number; stroke: string | undefined }) {
  const strip = () => {
    const lab = props.ramp?.curve.lab;
    if (!lab) return;
    const n = lab.length / 3;
    const [L0, L1] = [lab[0], lab[(n - 1) * 3]];
    const stops = Array.from({ length: 12 }, (_, k) => {
      const i = Math.round((k / 11) * (n - 1));
      return `${oklabToHex([lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]])} ${((k / 11) * 100).toFixed(0)}%`;
    });
    const at = Math.min(1, Math.max(0, (props.L - L0) / (L1 - L0 || 1)));
    return { gradient: `linear-gradient(to right, ${stops.join(", ")})`, at, L0, L1 };
  };
  return (
    <Show when={strip()}>
      {(st) => (
        <span class="m-story" tabindex="0" aria-label={`read at ${props.L.toFixed(2)} of ${st().L0.toFixed(2)} to ${st().L1.toFixed(2)}`}>
          <span class="m-strip" style={{ background: st().gradient }}>
            <i style={{ left: `${st().at * 100}%` }} />
          </span>
          <span class="m-at">{props.L.toFixed(2)}</span>
          <span class="m-story-card">
            <Show when={props.stroke}>{(src) => <img src={src()} alt="" width="125" height="125" />}</Show>
            <span class="m-strip big" style={{ background: st().gradient }}>
              <i style={{ left: `${st().at * 100}%` }} />
            </span>
            <span class="m-at">
              read at {props.L.toFixed(2)}, of {st().L0.toFixed(2)} (densest) to {st().L1.toFixed(2)} (palest)
            </span>
          </span>
        </span>
      )}
    </Show>
  );
}
