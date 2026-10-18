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
  /** Shell commands that install it: from the files the page offers, and from the repository. */
  command?: { download: string; repo: string };
}

export const PORTS: Port[] = [
  {
    id: "ghostty",
    name: "Ghostty",
    group: "terminals",
    dir: "ghostty",
    file: (f) => `ghostty/madoromi-${f.id}`,
    install: ["Put the theme file in `~/.config/ghostty/themes/`.", "Add this line to your Ghostty config: `theme = light:madoromi-{hiru},dark:madoromi-{yoru}`."],
    command: {
      download: "mkdir -p ~/.config/ghostty/themes && mv ~/Downloads/madoromi-{id} ~/.config/ghostty/themes/",
      repo: "mkdir -p ~/.config/ghostty/themes && cp palettes/ghostty/madoromi-* ~/.config/ghostty/themes/",
    },
  },
  {
    id: "kitty",
    name: "Kitty",
    group: "terminals",
    dir: "kitty",
    file: (f) => `kitty/madoromi-${f.id}.conf`,
    install: ["Put the theme file in `~/.config/kitty/themes/`.", "Run `kitten themes` and choose it, or add `include themes/madoromi-{id}.conf` to `kitty.conf`."],
    command: {
      download: "mkdir -p ~/.config/kitty/themes && mv ~/Downloads/madoromi-{id}.conf ~/.config/kitty/themes/",
      repo: "mkdir -p ~/.config/kitty/themes && cp palettes/kitty/madoromi-*.conf ~/.config/kitty/themes/",
    },
  },
  {
    id: "wezterm",
    name: "WezTerm",
    group: "terminals",
    dir: "wezterm",
    file: (f) => `wezterm/madoromi-${f.id}.toml`,
    install: ["Put the theme file in `~/.config/wezterm/colors/`.", 'Add this to your WezTerm config: `config.color_scheme = "{name}"`.'],
    command: {
      download: "mkdir -p ~/.config/wezterm/colors && mv ~/Downloads/madoromi-{id}.toml ~/.config/wezterm/colors/",
      repo: "mkdir -p ~/.config/wezterm/colors && cp palettes/wezterm/madoromi-*.toml ~/.config/wezterm/colors/",
    },
  },
  {
    id: "alacritty",
    name: "Alacritty",
    group: "terminals",
    dir: "alacritty",
    file: (f) => `alacritty/madoromi-${f.id}.toml`,
    install: ["Put the theme file in `~/.config/alacritty/themes/`.", 'In `alacritty.toml`, under `[general]`, add: `import = ["~/.config/alacritty/themes/madoromi-{id}.toml"]`.'],
    command: {
      download: "mkdir -p ~/.config/alacritty/themes && mv ~/Downloads/madoromi-{id}.toml ~/.config/alacritty/themes/",
      repo: "mkdir -p ~/.config/alacritty/themes && cp palettes/alacritty/madoromi-*.toml ~/.config/alacritty/themes/",
    },
  },
  {
    id: "iterm2",
    name: "iTerm2",
    group: "terminals",
    dir: "iterm2",
    file: (f) => `iterm2/madoromi-${f.id}.itermcolors`,
    install: ["Open the file; iTerm2 imports it.", "In Settings → Profiles → Colors → Color Presets, choose {name}."],
    command: { download: "open ~/Downloads/madoromi-{id}.itermcolors", repo: "open palettes/iterm2/madoromi-{id}.itermcolors" },
  },
  {
    id: "vscode",
    name: "VS Code",
    group: "editors",
    dir: "vscode",
    install: ["Unzip it into `~/.vscode/extensions/`; it makes a `madoromi` folder.", "Restart VS Code, then run Preferences: Color Theme and choose {name}."],
    command: { download: "unzip ~/Downloads/madoromi-vscode.zip -d ~/.vscode/extensions/", repo: "cp -r palettes/vscode ~/.vscode/extensions/madoromi" },
  },
  {
    id: "zed",
    name: "Zed",
    group: "editors",
    dir: "zed",
    file: () => "zed/madoromi.json",
    install: ["Put `madoromi.json` (it has every theme) in `~/.config/zed/themes/`.", "Run `theme selector: toggle` and choose {name}."],
    command: {
      download: "mkdir -p ~/.config/zed/themes && mv ~/Downloads/madoromi.json ~/.config/zed/themes/",
      repo: "mkdir -p ~/.config/zed/themes && cp palettes/zed/madoromi.json ~/.config/zed/themes/",
    },
  },
  {
    id: "nvim",
    name: "Neovim",
    group: "editors",
    dir: "nvim",
    install: ["Unzip it into `~/.config/nvim/pack/madoromi/start/`; Neovim loads it from there.", "Run `:colorscheme madoromi-{id}`."],
    command: {
      download: "mkdir -p ~/.config/nvim/pack/madoromi/start && unzip ~/Downloads/madoromi-nvim.zip -d ~/.config/nvim/pack/madoromi/start/",
      repo: "mkdir -p ~/.config/nvim/pack/madoromi/start && cp -r palettes/nvim ~/.config/nvim/pack/madoromi/start/madoromi.nvim",
    },
  },
  {
    id: "css",
    name: "CSS",
    group: "tokens",
    dir: "css",
    file: () => "css/madoromi.css",
    install: ['Include `madoromi.css` (it has every theme). Set `data-madoromi="{id}"` on an element, then use `var(--madoromi-sumi)` and the other colours inside it.'],
  },
  {
    id: "json",
    name: "JSON",
    group: "tokens",
    dir: ".",
    file: () => "madoromi.json",
    install: ["`madoromi.json` has every theme's colours (hex, oklch and the ink each comes from), its terminal colours, and which colour each role uses."],
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

/** A port's whole folder, as the files to put in its zip (under one folder named after it). */
export function portFolder(port: Port, files: Files): { name: string; files: Files } {
  const folder = port.id === "vscode" ? "madoromi" : port.id === "nvim" ? "madoromi.nvim" : `madoromi-${port.id}`;
  const prefix = `${port.dir}/`;
  return {
    name: `madoromi-${port.id}.zip`,
    files: Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith(prefix)).map(([p, t]) => [`${folder}/${p.slice(prefix.length)}`, t])),
  };
}

/** An install step with a flavour's names filled in. */
export function step(text: string, f: { id: string; season: Season }): string {
  return text
    .replaceAll("{id}", f.id)
    .replaceAll("{name}", `madoromi ${f.id}`)
    .replaceAll("{hiru}", `${f.season}-hiru`)
    .replaceAll("{yoru}", `${f.season}-yoru`);
}
