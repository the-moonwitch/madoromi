# madoromi 微睡

Colour themes made from fountain pen inks, and the study of the inks behind them.

madoromi has two parts:

- **The inks.** Forty of Pilot's Iroshizuku inks, measured from scans of ink on paper. For each ink there is a colour curve from its darkest stroke to its palest wash, a ramp of colours along that curve, and 2D and 3D views of its colours.
- **The palettes.** Eight colour themes, one for each season by day and by night. Every accent colour is one of the inks at some lightness, chosen by measurement: readable, evenly bright, and within what screens can show. The themes are in [palettes/](palettes/README.md), ready to install for Ghostty, Kitty, WezTerm, Alacritty, iTerm2, VS Code, Zed, Neovim, CSS and JSON. [palettes/style-guide.md](palettes/style-guide.md) says which colour to use where.

## Running it

You need [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Everything the site shows is already computed and committed, so it runs without the original scans.

| command | what it does |
| --- | --- |
| `bun run dev` | runs the site locally |
| `bun run build` | type-checks and builds the site into `dist/` |
| `bun run preprocess` | re-measures the inks from the scans in `samples/` and redraws the brush strokes (needs the scans) |
| `bun run palettes` | rebuilds the eight themes from the measured inks and writes every port under `palettes/` |
| `bun test` | checks the themes (contrast, gamut, hues, variety) and that every port's files parse |

`preprocess` also cuts the kanji font down to the characters the site uses. That step needs fontTools in a local virtualenv: `python3 -m venv .venv && .venv/bin/pip install fonttools brotli`. Without it, the site loads the font in pieces instead.

## The scans

The scans are other people's photos, so neither they nor a list of them are in the repository. What's measured from them (colour points, curves, ramps, brush strokes) is in `public/precomputed/`.

To re-measure, put scans in `samples/`, named `<ink>--<anything>.<ext>` (for example `ajisai--1.jpg`), and run `bun run preprocess`.

## Where things are

| path | what's there |
| --- | --- |
| `src/core/analyze.ts` | measuring an ink: colour points, the curve, the ramp, the gradient |
| `src/core/palette.ts` | building the themes: seasons, colour names, targets and how accents are scored |
| `src/core/guide.ts` | the style guide: which colour is used for what |
| `src/ports/` | the generators for each terminal, editor and token format |
| `src/components/` | the site |
| `scripts/` | `preprocess` and `palettes` |
| `tests/` | the checks `bun test` runs |
| `palettes/` | the generated themes |
| `public/precomputed/` | the generated measurements and brush strokes |

## Licence

The code and the themes are under the [Mozilla Public License 2.0](LICENSE).

The fonts come from Fontsource under the SIL Open Font License: Cormorant Garamond, Yuji Syuku, LINE Seed JP and JetBrains Mono.

Iroshizuku is a trademark of Pilot Corporation. madoromi isn't affiliated with Pilot.

Made by [samhain](https://github.com/the-moonwitch).
