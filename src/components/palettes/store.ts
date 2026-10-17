// The flavour the palettes' pages are shown in: remembered per browser, else the season it is and
// the light or dark the system prefers.
import { createSignal } from "solid-js";
import { MODES, SEASONS, type Mode, type Season } from "../../core/palette";

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
