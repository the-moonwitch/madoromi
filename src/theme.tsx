// The flavour every page is shown in: the paper, the ink and the rest of a madoromi palette, as
// custom properties on the page (--paper, --ink, … and --m-<slot>, --m-ansi-<n>). Remembered per
// browser; at first the season it is and the light or dark the system prefers.
import { createEffect, createMemo, createSignal, For, type Accessor } from "solid-js";
import { contrast, type Vec3 } from "./core/color";
import { ACCENTS, MODES, NEUTRALS, SEASONS, type Flavour, type Mode, type Season } from "./core/palette";

const KEY = "madoromi-flavour";

const seasonNow = (): Season => {
  const m = new Date().getMonth();
  return m >= 2 && m <= 4 ? "haru" : m >= 5 && m <= 7 ? "natsu" : m >= 8 && m <= 10 ? "aki" : "fuyu";
};
const modeNow = (): Mode => (matchMedia?.("(prefers-color-scheme: dark)").matches ? "yoru" : "hiru");

function initial(): { season: Season; mode: Mode } {
  try {
    const [season, mode] = (localStorage.getItem(KEY) ?? "").split("-");
    if (SEASONS.some((s) => s.id === season) && MODES.some((m) => m.id === mode)) return { season: season as Season, mode: mode as Mode };
  } catch {}
  return { season: seasonNow(), mode: modeNow() };
}

const [choice, setChoice] = createSignal(initial());
export const flavourChoice = choice;
export const flavourId = () => `${choice().season}-${choice().mode}`;
export function choose(next: Partial<{ season: Season; mode: Mode }>) {
  setChoice({ ...choice(), ...next });
  try {
    localStorage.setItem(KEY, flavourId());
  } catch {}
}

/** Shows the page in the chosen flavour of `family`, once there is one; returns that flavour. */
export function useTheme(family: Accessor<Flavour[]>): Accessor<Flavour | undefined> {
  const flavour = createMemo(() => family().find((f) => f.id === flavourId()));
  createEffect(() => {
    const f = flavour();
    if (f) apply(f);
  });
  return flavour;
}

/** The paper the page is on now (white until a flavour is chosen). */
const [paper, setPaper] = createSignal<Vec3>([1, 0, 0]);
export const paperLab = paper;

function apply(f: Flavour) {
  const root = document.documentElement.style;
  const c = (k: string) => f.colours[k].hex;
  root.setProperty("--paper", c("kami"));
  root.setProperty("--ink", c("sumi"));
  root.setProperty("--dim", c("usuzumi0"));
  root.setProperty("--faint", c("kasure0"));
  root.setProperty("--hair", c("nijimi0"));
  root.setProperty("color-scheme", f.mode === "yoru" ? "dark" : "light");
  for (const s of [...ACCENTS, ...NEUTRALS]) root.setProperty(`--m-${s.key}`, c(s.key));
  f.ansi.forEach((s, i) => root.setProperty(`--m-ansi-${i}`, s.hex));
  setPaper(f.colours.kami.lab);
}

/**
 * An ink as it reads on the paper: its colour at the strength nearest its own that's legible
 * there (`min` contrast), read along its ramp curve. Dark inks on dark paper are read thinner.
 */
export function legibleOn(curve: ArrayLike<number>, main: Vec3, paper: Vec3, min = 3): Vec3 {
  if (contrast(main, paper) >= min) return main;
  let best: Vec3 | undefined;
  for (let i = 0; i < curve.length; i += 3) {
    const c: Vec3 = [curve[i], curve[i + 1], curve[i + 2]];
    if (contrast(c, paper) >= min && (!best || Math.abs(c[0] - main[0]) < Math.abs(best[0] - main[0]))) best = c;
  }
  return best ?? main;
}

/** Season and time of day; each season wears its own paper. */
export function Picker(props: { family: Flavour[] }) {
  const swatchOf = (id: string) => props.family.find((f) => f.id === id);
  return (
    <div class="picker" role="group" aria-label="flavour">
      <For each={SEASONS}>
        {(s) => {
          const f = () => swatchOf(`${s.id}-${choice().mode}`);
          return (
            <button
              classList={{ on: choice().season === s.id }}
              style={f() ? { background: f()!.colours.kami.hex, color: f()!.colours.sumi.hex } : {}}
              title={s.english}
              onClick={() => choose({ season: s.id })}
            >
              <span class="kanji">{s.kanji}</span>
              <span>{s.id}</span>
            </button>
          );
        }}
      </For>
      <span class="picker-gap" />
      <For each={MODES}>
        {(m) => (
          <button classList={{ on: choice().mode === m.id }} title={m.english} onClick={() => choose({ mode: m.id })}>
            <span class="kanji">{m.kanji}</span>
            <span>{m.id}</span>
          </button>
        )}
      </For>
    </div>
  );
}
