// Every port: what it's for, how to install it, and its files. `bun run palettes` writes them all,
// and the readme, under palettes/; a release (see .github/workflows/release.yml) zips each port
// and packages the VS Code extension. Install commands fetch straight from the repository or the
// latest release.
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
  /** One shell command that installs it, fetching from the repository or the latest release. */
  command?: string;
  /** Or, where it's set up in a config file instead, what to put there. */
  snippet?: { lang: string; text: string };
}

export const REPO = "https://github.com/the-moonwitch/madoromi";
/** The generated ports as they are on the main branch. */
export const RAW = "https://raw.githubusercontent.com/the-moonwitch/madoromi/main/palettes";
/** What the latest release built. */
export const RELEASE = `${REPO}/releases/latest/download`;
/** The VS Code extension, as a release builds it. */
export const VSIX = "madoromi.vsix";

export const PORTS: Port[] = [
  {
    id: "ghostty",
    name: "Ghostty",
    group: "terminals",
    dir: "ghostty",
    file: (f) => `ghostty/madoromi-${f.id}`,
    install: ["Run this to fetch the day and night themes for your season.", "Add to your Ghostty config: `theme = light:madoromi-{hiru},dark:madoromi-{yoru}`"],
    command: `curl -fsSL --create-dirs -o ~/.config/ghostty/themes/madoromi-{hiru} ${RAW}/ghostty/madoromi-{hiru} -o ~/.config/ghostty/themes/madoromi-{yoru} ${RAW}/ghostty/madoromi-{yoru}`,
  },
  {
    id: "kitty",
    name: "Kitty",
    group: "terminals",
    dir: "kitty",
    file: (f) => `kitty/madoromi-${f.id}.conf`,
    install: ["Run this to fetch the theme.", "Add to `kitty.conf`: `include themes/madoromi-{id}.conf`"],
    command: `curl -fsSL --create-dirs -o ~/.config/kitty/themes/madoromi-{id}.conf ${RAW}/kitty/madoromi-{id}.conf`,
  },
  {
    id: "wezterm",
    name: "WezTerm",
    group: "terminals",
    dir: "wezterm",
    file: (f) => `wezterm/madoromi-${f.id}.toml`,
    install: ["Run this to fetch the theme.", 'Add to your WezTerm config: `config.color_scheme = "{name}"`'],
    command: `curl -fsSL --create-dirs -o ~/.config/wezterm/colors/madoromi-{id}.toml ${RAW}/wezterm/madoromi-{id}.toml`,
  },
  {
    id: "alacritty",
    name: "Alacritty",
    group: "terminals",
    dir: "alacritty",
    file: (f) => `alacritty/madoromi-${f.id}.toml`,
    install: ["Run this to fetch the theme.", 'Add to `alacritty.toml`, under `[general]`: `import = ["~/.config/alacritty/themes/madoromi-{id}.toml"]`'],
    command: `curl -fsSL --create-dirs -o ~/.config/alacritty/themes/madoromi-{id}.toml ${RAW}/alacritty/madoromi-{id}.toml`,
  },
  {
    id: "iterm2",
    name: "iTerm2",
    group: "terminals",
    dir: "iterm2",
    file: (f) => `iterm2/madoromi-${f.id}.itermcolors`,
    install: ["Run this; iTerm2 opens the theme and adds it to its presets.", "In Settings → Profiles → Colors → Color Presets, choose {name}."],
    command: `curl -fsSL -o /tmp/madoromi-{id}.itermcolors ${RAW}/iterm2/madoromi-{id}.itermcolors && open /tmp/madoromi-{id}.itermcolors`,
  },
  {
    id: "vscode",
    name: "VS Code",
    group: "editors",
    dir: "vscode",
    install: ["Run this to install the extension (it has every theme).", "Run Preferences: Color Theme and choose {name}."],
    command: `curl -fsSL -o /tmp/${VSIX} ${RELEASE}/${VSIX} && code --install-extension /tmp/${VSIX}`,
  },
  {
    id: "zed",
    name: "Zed",
    group: "editors",
    dir: "zed",
    file: () => "zed/madoromi.json",
    install: ["Run this to fetch the themes (one file has them all).", "Run `theme selector: toggle` and choose {name}."],
    command: `curl -fsSL --create-dirs -o ~/.config/zed/themes/madoromi.json ${RAW}/zed/madoromi.json`,
  },
  {
    id: "nvim",
    name: "Neovim",
    group: "editors",
    dir: "nvim",
    install: ["With lazy.nvim, add this to your plugins. It loads the theme from this repository."],
    snippet: {
      lang: "lua",
      text: `{
  "the-moonwitch/madoromi",
  lazy = false,
  priority = 1000,
  config = function(plugin)
    vim.opt.rtp:append(plugin.dir .. "/palettes/nvim")
    vim.cmd.colorscheme("madoromi-{id}")
  end,
}`,
    },
  },
  {
    id: "css",
    name: "CSS",
    group: "tokens",
    dir: "css",
    file: () => "css/madoromi.css",
    install: ['Add this to your page. Then set `data-madoromi="{id}"` on an element and use `var(--madoromi-sumi)` and the other colours inside it.'],
    snippet: { lang: "html", text: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/the-moonwitch/madoromi@main/palettes/css/madoromi.css">` },
  },
  {
    id: "json",
    name: "JSON",
    group: "tokens",
    dir: ".",
    file: () => "madoromi.json",
    install: ["Every theme's colours (hex, oklch and the ink each comes from), terminal colours, and which colour each role uses."],
    command: `curl -fsSL -O ${RAW}/madoromi.json`,
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
