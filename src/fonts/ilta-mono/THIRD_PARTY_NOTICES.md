# third-party notices

my body has a lineage. this is where every borrowed bone keeps its name.

Ilta Mono contains and modifies third-party font software. names appear here for attribution and source identification only. nobody named below endorses Ilta Mono merely because their work entered its ancestry.

## Valley Sans - the skeleton beneath my skin

- source: <https://github.com/HelsinkiTypeStudio/valley-sans>
- pinned commit: `932cfad79399ed06430ace86af05127224d245b3`
- license: SIL Open Font License 1.1 ([`LICENSE`](LICENSE))

original copyright notice, retained verbatim:

> Copyright 2026 The Valley Sans Project Authors (https://github.com/HelsinkiTypeStudio/valley-sans)

Ilta Mono begins with Valley Sans and leaves carrying its own family names, mono metrics, programming forms, ligatures, clean outputs, and symbol-patched outputs. exact compiled donors live under `upstream/fonts/`. [`upstream/README.md`](upstream/README.md) gives their hashes, pinned revision, and source-recovery commands. no inference is needed; follow the blood back yourself.

## Nerd Fonts symbols - what entered the terminal body

- project: Nerd Fonts
- release: `v3.4.0`
- pinned commit: `fa7b859994228a9c8759f99c55a8d31ee92a1b5e`
- official source asset: `patched-fonts/NerdFontsSymbolsOnly/SymbolsNerdFontMono-Regular.ttf`
- official source SHA-256: `f0f624d9b474bea1662cf7e862d44aebe1ae1f6c7f9cb7a0ca5d0e5ac9561c60`
- distributed sanitized asset: `vendor/nerd-fonts/SymbolsNerdFontMono-v3.4.0-NoFontLogos.ttf`
- sanitized SHA-256: `abd6258264a7b79ed06fde4a834522b973e05527c4e73bbb0d1efdb6194faaf2`

Nerd Fonts marks Font Logos as unlicensed. its complete pinned block - U+F300 through U+F381, 130 codepoints and their glyphs - is cut out before the derivative enters this repository. the builder checks the wound again before merging. the unfiltered official TTF is never distributed.

Nerd Fonts licenses its original source code under MIT. its symbols-only font is identified as MIT-licensed and carries this notice:

> Copyright (c) 2014 Ryan L McIntyre

Nerd Fonts collects glyphs from several projects. each keeps its own terms:

| glyph source | upstream | pinned identity | license identified upstream |
| --- | --- | --- | --- |
| Codicons | <https://github.com/microsoft/vscode-codicons> | 0.0.35 | CC BY 4.0 |
| Devicons | <https://github.com/devicons/devicon> | 2.16.0.custom | MIT |
| extraglyphs | <https://github.com/source-foundry/Hack> | not stated by Nerd Fonts | MIT |
| Font Awesome | <https://github.com/FortAwesome/Font-Awesome> | 6.5.1.custom | CC BY 4.0 |
| Font Awesome Extension | <https://github.com/AndreLZGava/font-awesome-extension> | 0.0.3 | MIT |
| Font Logos | <https://github.com/lukas-w/font-logos> | 1.3.0 | **excluded - unlicensed in the Nerd Fonts audit** |
| MaterialDesign | <https://github.com/Templarian/MaterialDesign-Font> | 2022-10-06 snapshot | Apache 2.0 |
| Octicons | <https://github.com/primer/octicons> | 18.3.0 | MIT |
| Seti and original | <https://github.com/jesseweed/seti-ui> | 0.8.1 | MIT |
| Pomicons | <https://github.com/gabrielelana/pomicons> | 1.001 | OFL 1.1 with Reserved Font Name |
| Powerline Extra | <https://github.com/ryanoasis/powerline-extra-symbols> | 1.200 | MIT |
| Powerline Symbols | <https://github.com/powerline/powerline> | 1.000, circa 2013 | MIT |
| Power Symbols IEC | <https://github.com/jloughry/Unicode> | 2015-02 snapshot | MIT |
| Weather Icons | <https://github.com/erikflowers/weather-icons> | 2.0.10, font 1.100 | OFL 1.1 |

## evidence, still attached

nothing below is decorative. ship it with the Nerd family.

| material | bundled evidence |
| --- | --- |
| Nerd Fonts glyph-source inventory | `licenses/nerd-fonts/GLYPH-SOURCES-README.md` |
| Nerd Fonts license audit | `licenses/nerd-fonts/LICENSE-AUDIT.md` |
| Nerd Fonts root license | `licenses/nerd-fonts/NERD-FONTS-LICENSE.txt` |
| symbols-only font license | `licenses/nerd-fonts/SYMBOLS-FONT-LICENSE.txt` |
| exact project provenance | `licenses/nerd-fonts/PROVENANCE.md` |
| Codicons | `licenses/nerd-fonts/glyph-sources/codicons-LICENSE.txt` |
| Devicons | `licenses/nerd-fonts/glyph-sources/devicons-LICENSE.txt` |
| legacy Devicons | `licenses/nerd-fonts/glyph-sources/devicons-legacy-LICENSE.txt` |
| extraglyphs / Hack | `licenses/nerd-fonts/glyph-sources/extraglyphs-Hack-LICENSE.md` |
| Font Awesome | `licenses/nerd-fonts/glyph-sources/font-awesome-LICENSE.txt` |
| Font Awesome Extension | `licenses/nerd-fonts/glyph-sources/font-awesome-extension-LICENSE.txt` |
| Material Design Icons | `licenses/nerd-fonts/glyph-sources/materialdesign-LICENSE.txt` |
| full Apache License 2.0 | `licenses/nerd-fonts/glyph-sources/APACHE-2.0.txt` |
| Octicons | `licenses/nerd-fonts/glyph-sources/octicons-LICENSE.txt` |
| Seti UI | `licenses/nerd-fonts/glyph-sources/seti-ui-LICENSE.md` |
| Pomicons | `licenses/nerd-fonts/glyph-sources/pomicons-LICENSE.txt` |
| Powerline Extra Symbols | `licenses/nerd-fonts/glyph-sources/powerline-extra-LICENSE.txt` |
| Powerline Symbols | `licenses/nerd-fonts/glyph-sources/powerline-symbols-LICENSE.txt` |
| Power Symbols IEC | `licenses/nerd-fonts/glyph-sources/power-symbols-iec-LICENSE.txt` |
| Weather Icons | `licenses/nerd-fonts/glyph-sources/weather-icons-OFL.txt` |
| Weather Icons attribution | `licenses/nerd-fonts/glyph-sources/weather-icons-NOTICE.md` |
| Weather Icons OFL FAQ | `licenses/nerd-fonts/glyph-sources/weather-icons-OFL-FAQ.txt` |

`GLYPH-SOURCES-README.md`, `LICENSE-AUDIT.md`, and the upstream license texts remain in their authors’ words. my voice names the boundary; it does not impersonate the witness.

## what the merge changes

symbol output uses the separate family name **Ilta Mono Nerd Font**. the build does not run Nerd Fonts’ `font-patcher`. it merges the pinned sanitized symbols-only font through this project’s own pipeline.

outlines and metrics may be scaled and centered to enter Ilta Mono’s fixed cell. those are modifications. icon identity and meaning are not intentionally changed. every copied or modified part remains governed by the license attached to its source.
