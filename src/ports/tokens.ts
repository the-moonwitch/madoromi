// The tokens: every flavour's colours as JSON, and as CSS custom properties.
import { oklabToOklch } from "../core/color";
import { ACCENTS, MODES, NEUTRALS, ROLES, SEASONS, type Flavour } from "../core/palette";
import { HEADER, type Files } from "./common";

const swatchJSON = (f: Flavour, key: string) => {
  const c = f.colours[key];
  const [L, C, h] = oklabToOklch(c.lab);
  return { hex: c.hex, oklch: [+L.toFixed(4), +C.toFixed(4), +h.toFixed(2)], ink: c.ink, at: +c.L.toFixed(3) };
};

export function tokens(family: Flavour[], name = "madoromi"): Files {
  const json = {
    name,
    about:
      "Every accent is one of Pilot's iroshizuku inks, diluted: `ink` is the ink and `at` the lightness along its ramp. Neutrals are greys in the cast of the season's grey ink.",
    seasons: SEASONS.map(({ id, kanji, english, grey }) => ({ id, kanji, english, grey })),
    modes: MODES,
    accents: ACCENTS.map(({ key, name, kanji, english }) => ({ key, name, kanji, english })),
    neutrals: NEUTRALS.map(({ key, name, kanji, english }) => ({ key, name, kanji, english })),
    roles: ROLES,
    flavours: Object.fromEntries(
      family.map((f) => [
        f.id,
        {
          // A mix only borrows a season's structure, so it doesn't name one.
          season: f.id === `${f.season}-${f.mode}` ? f.season : undefined,
          mode: f.mode,
          dark: f.mode === "yoru",
          colours: Object.fromEntries([...ACCENTS, ...NEUTRALS].map((s) => [s.key, swatchJSON(f, s.key)])),
          ansi: f.ansi.map((s) => s.hex),
        },
      ]),
    ),
  };
  const css = [
    `/* ${name}: ${HEADER}. */`,
    ...family.map((f) =>
      [
        `[data-madoromi="${f.id}"] {`,
        `  color-scheme: ${f.mode === "yoru" ? "dark" : "light"};`,
        ...[...NEUTRALS, ...ACCENTS].map((s) => `  --madoromi-${s.key}: ${f.colours[s.key].hex};`),
        `}`,
      ].join("\n"),
    ),
  ].join("\n\n");
  return { [`${name}.json`]: JSON.stringify(json, null, 2), [`css/${name}.css`]: css };
}
