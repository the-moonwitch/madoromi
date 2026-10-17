// Every port: what it's for, how to install it, and its files. The page offers each flavour's file
// for download; `bun run palettes` writes them all, and the readme, under palettes/.
import type { Flavour, Season } from "../core/palette";
import type { Files } from "./common";
import { nvim } from "./nvim";
import { terminals } from "./terminals";
import { tokens } from "./tokens";
import { vscode } from "./vscode";
import { zed } from "./zed";

export type { Files } from "./common";

export interface Port {
  id: string;
  name: string;
  group: "terminals" | "editors" | "tokens";
  /** Where its files are under palettes/. */
  dir: string;
  /** The one file that holds a flavour, where there is one. */
  file?: (f: { id: string }) => string;
  /**
   * How to install it, step by step; `code` in backticks, and {id}, {name}, {hiru} and {yoru}
   * stand for a flavour, its theme name and its season's day and night flavours.
   */
  install: string[];
}

export const PORTS: Port[] = [
  {
    id: "ghostty",
    name: "Ghostty",
    group: "terminals",
    dir: "ghostty",
    file: (f) => `ghostty/madoromi-${f.id}`,
    install: ["Copy the theme to `~/.config/ghostty/themes/`.", "In your config: `theme = light:madoromi-{hiru},dark:madoromi-{yoru}`."],
  },
  {
    id: "kitty",
    name: "Kitty",
    group: "terminals",
    dir: "kitty",
    file: (f) => `kitty/madoromi-${f.id}.conf`,
    install: ["Copy the theme to `~/.config/kitty/themes/`.", "Run `kitten themes` and pick it, or add `include themes/madoromi-{id}.conf` to `kitty.conf`."],
  },
  {
    id: "wezterm",
    name: "WezTerm",
    group: "terminals",
    dir: "wezterm",
    file: (f) => `wezterm/madoromi-${f.id}.toml`,
    install: ["Copy the theme to `~/.config/wezterm/colors/`.", 'In your config: `config.color_scheme = "{name}"`.'],
  },
  {
    id: "alacritty",
    name: "Alacritty",
    group: "terminals",
    dir: "alacritty",
    file: (f) => `alacritty/madoromi-${f.id}.toml`,
    install: ["Copy the theme to `~/.config/alacritty/themes/`.", 'Under `[general]` in `alacritty.toml`: `import = ["~/.config/alacritty/themes/madoromi-{id}.toml"]`.'],
  },
  {
    id: "iterm2",
    name: "iTerm2",
    group: "terminals",
    dir: "iterm2",
    file: (f) => `iterm2/madoromi-${f.id}.itermcolors`,
    install: ["Settings → Profiles → Colors → Color Presets… → Import…, and pick the theme.", "Choose {name} from Color Presets."],
  },
  {
    id: "vscode",
    name: "VS Code",
    group: "editors",
    dir: "vscode",
    install: ["Copy `palettes/vscode` to `~/.vscode/extensions/madoromi`.", "Restart, then Preferences: Color Theme → {name}."],
  },
  {
    id: "zed",
    name: "Zed",
    group: "editors",
    dir: "zed",
    file: () => "zed/madoromi.json",
    install: ["Copy `madoromi.json` (every flavour) to `~/.config/zed/themes/`.", "Pick {name} with `theme selector: toggle`."],
  },
  {
    id: "nvim",
    name: "Neovim",
    group: "editors",
    dir: "nvim",
    install: ['Add `palettes/nvim` to your runtime path, e.g. with lazy.nvim: `{ dir = "…/palettes/nvim" }`.', "`:colorscheme madoromi-{id}`"],
  },
  {
    id: "css",
    name: "CSS",
    group: "tokens",
    dir: "css",
    file: () => "css/madoromi.css",
    install: ['Include `madoromi.css` (every flavour), set `data-madoromi="{id}"` on an element, and use `var(--madoromi-sumi)` and the rest inside it.'],
  },
  {
    id: "json",
    name: "JSON",
    group: "tokens",
    dir: ".",
    file: () => "madoromi.json",
    install: ["`madoromi.json` has every flavour's colours (hex, oklch and the ink behind each), its ANSI colours, and the role each port gives each colour."],
  },
];

export const GROUPS: { id: Port["group"]; name: string }[] = [
  { id: "terminals", name: "terminals" },
  { id: "editors", name: "editors" },
  { id: "tokens", name: "tokens" },
];

/** Every port's files, by path under palettes/. */
export function portFiles(family: Flavour[]): Files {
  return { ...tokens(family), ...terminals(family), ...vscode(family), ...zed(family), ...nvim(family) };
}

/** An install step with a flavour's names filled in. */
export function step(text: string, f: { id: string; season: Season }): string {
  return text
    .replaceAll("{id}", f.id)
    .replaceAll("{name}", `madoromi ${f.id}`)
    .replaceAll("{hiru}", `${f.season}-hiru`)
    .replaceAll("{yoru}", `${f.season}-yoru`);
}
