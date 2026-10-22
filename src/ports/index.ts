// Every port: what it's for, how to install it, and its files. `bun run palettes` writes them all,
// and the readme, under palettes/; a release (see .github/workflows/release.yml) zips each port
// and packages the VS Code extension. Install commands fetch straight from the repository or the
// latest release.
import type { Flavour } from "../core/palette";
import type { Files } from "./common";
import { emacs } from "./emacs";
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
  /** The one file that holds a flavour, where there is one (named `name` where it holds them all). */
  file?: (f: { id: string }, name?: string) => string;
  /**
   * How to install it, step by step; `code` in backticks, and {id}, {name}, {hiru} and {yoru}
   * stand for a flavour, its theme name and its season's day and night flavours.
   */
  install: string[];
  /** One shell command that installs it, fetching from the repository or the latest release. */
  command?: string;
  /** Or, where it's set up in a config file instead, what to put there. */
  snippet?: { lang: string; text: string };
  /** How to install its files once downloaded (as from the mixer), step by step. */
  manual: string[];
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
    manual: ["Save both files in `~/.config/ghostty/themes/`.", "Add to your Ghostty config: `theme = light:madoromi-{hiru},dark:madoromi-{yoru}`"],
  },
  {
    id: "kitty",
    name: "Kitty",
    group: "terminals",
    dir: "kitty",
    file: (f) => `kitty/madoromi-${f.id}.conf`,
    install: ["Run this to fetch the theme.", "Add to `kitty.conf`: `include themes/madoromi-{id}.conf`"],
    command: `curl -fsSL --create-dirs -o ~/.config/kitty/themes/madoromi-{id}.conf ${RAW}/kitty/madoromi-{id}.conf`,
    manual: ["Save the files in `~/.config/kitty/themes/`.", "Add to `kitty.conf`: `include themes/madoromi-{id}.conf`"],
  },
  {
    id: "wezterm",
    name: "WezTerm",
    group: "terminals",
    dir: "wezterm",
    file: (f) => `wezterm/madoromi-${f.id}.toml`,
    install: ["Run this to fetch the theme.", 'Add to your WezTerm config: `config.color_scheme = "{name}"`'],
    command: `curl -fsSL --create-dirs -o ~/.config/wezterm/colors/madoromi-{id}.toml ${RAW}/wezterm/madoromi-{id}.toml`,
    manual: ["Save the files in `~/.config/wezterm/colors/`.", 'Add to your WezTerm config: `config.color_scheme = "{name}"`'],
  },
  {
    id: "alacritty",
    name: "Alacritty",
    group: "terminals",
    dir: "alacritty",
    file: (f) => `alacritty/madoromi-${f.id}.toml`,
    install: ["Run this to fetch the theme.", 'Add to `alacritty.toml`, under `[general]`: `import = ["~/.config/alacritty/themes/madoromi-{id}.toml"]`'],
    command: `curl -fsSL --create-dirs -o ~/.config/alacritty/themes/madoromi-{id}.toml ${RAW}/alacritty/madoromi-{id}.toml`,
    manual: ["Save the files in `~/.config/alacritty/themes/`.", 'Add to `alacritty.toml`, under `[general]`: `import = ["~/.config/alacritty/themes/madoromi-{id}.toml"]`'],
  },
  {
    id: "iterm2",
    name: "iTerm2",
    group: "terminals",
    dir: "iterm2",
    file: (f) => `iterm2/madoromi-${f.id}.itermcolors`,
    install: ["Run this; iTerm2 opens the theme and adds it to its presets.", "In Settings → Profiles → Colors → Color Presets, choose {name}."],
    command: `curl -fsSL -o /tmp/madoromi-{id}.itermcolors ${RAW}/iterm2/madoromi-{id}.itermcolors && open /tmp/madoromi-{id}.itermcolors`,
    manual: ["Open the files; iTerm2 adds them to its presets.", "In Settings → Profiles → Colors → Color Presets, choose {name}."],
  },
  {
    id: "vscode",
    name: "VS Code",
    group: "editors",
    dir: "vscode",
    install: ["Run this to install the extension (it has every theme).", "Run Preferences: Color Theme and choose {name}."],
    command: `curl -fsSL -o /tmp/${VSIX} ${RELEASE}/${VSIX} && code --install-extension /tmp/${VSIX}`,
    manual: ["Install the extension: run `code --install-extension` with the file, or run Extensions: Install from VSIX.", "Run Preferences: Color Theme and choose {name}."],
  },
  {
    id: "zed",
    name: "Zed",
    group: "editors",
    dir: "zed",
    file: (_, name = "madoromi") => `zed/${name}.json`,
    install: ["Run this to fetch the themes (one file has them all).", "Run `theme selector: toggle` and choose {name}."],
    command: `curl -fsSL --create-dirs -o ~/.config/zed/themes/madoromi.json ${RAW}/zed/madoromi.json`,
    manual: ["Save the file in `~/.config/zed/themes/`.", "Run `theme selector: toggle` and choose {name}."],
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
    manual: ["Unzip it, and add its folder to your plugins (with lazy.nvim: `{ dir = \"<the folder>\" }`).", "Run `:colorscheme madoromi-{id}`."],
  },
  {
    id: "emacs",
    name: "Emacs",
    group: "editors",
    dir: "emacs",
    file: (f) => `emacs/madoromi-${f.id}-theme.el`,
    install: [
      "Run this to fetch the day and night themes for your season.",
      "Add to your init file: `(add-to-list 'custom-theme-load-path \"~/.emacs.d/themes/\")`, then `(load-theme 'madoromi-{id} t)`.",
      "To try another, `M-x load-theme`; Emacs stacks themes, so `M-x disable-theme` the old one first.",
      "To follow the system's light and dark setting (builds with `ns-system-appearance-change-functions`), swap madoromi-{hiru} and madoromi-{yoru} from that hook.",
    ],
    command: `curl -fsSL --create-dirs -o ~/.emacs.d/themes/madoromi-{hiru}-theme.el ${RAW}/emacs/madoromi-{hiru}-theme.el -o ~/.emacs.d/themes/madoromi-{yoru}-theme.el ${RAW}/emacs/madoromi-{yoru}-theme.el`,
    manual: [
      "Save the files in `~/.emacs.d/themes/`.",
      "Add to your init file: `(add-to-list 'custom-theme-load-path \"~/.emacs.d/themes/\")`, then `(load-theme 'madoromi-{id} t)`.",
      "To try another, `M-x load-theme`; Emacs stacks themes, so `M-x disable-theme` the old one first.",
    ],
  },
  {
    id: "css",
    name: "CSS",
    group: "tokens",
    dir: "css",
    file: (_, name = "madoromi") => `css/${name}.css`,
    install: ['Add this to your page. Then set `data-madoromi="{id}"` on an element and use `var(--madoromi-sumi)` and the other colours inside it.'],
    snippet: { lang: "html", text: `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/the-moonwitch/madoromi@main/palettes/css/madoromi.css">` },
    manual: ['Link the file from your page. Then set `data-madoromi="{id}"` on an element and use `var(--madoromi-sumi)` and the other colours inside it.'],
  },
  {
    id: "json",
    name: "JSON",
    group: "tokens",
    dir: ".",
    file: (_, name = "madoromi") => `${name}.json`,
    install: ["Every theme's colours (hex, oklch and the ink each comes from), terminal colours, and which colour each role uses."],
    command: `curl -fsSL -O ${RAW}/madoromi.json`,
    manual: ["Every colour (hex, oklch and the ink each comes from), terminal colours, and which colour each role uses."],
  },
];

export const GROUPS: { id: Port["group"]; name: string }[] = [
  { id: "terminals", name: "terminals" },
  { id: "editors", name: "editors" },
  { id: "tokens", name: "tokens" },
];

/**
 * Every port's files, by path under palettes/. `name` names what holds every flavour (the VS Code
 * extension, the Zed theme family, the Neovim module, the tokens), so a mix installs beside madoromi.
 */
export function portFiles(family: Flavour[], name = "madoromi"): Files {
  return { ...tokens(family, name), ...terminals(family), ...vscode(family, name), ...zed(family, name), ...nvim(family, name), ...emacs(family) };
}

/** A port's whole folder, as the files to put in its zip (under one folder named after it). */
export function portFolder(port: Port, files: Files, name = "madoromi"): { name: string; files: Files } {
  const folder = port.id === "vscode" ? name : port.id === "nvim" ? `${name}.nvim` : `${name}-${port.id}`;
  const prefix = `${port.dir}/`;
  return {
    name: `${name}-${port.id}.zip`,
    files: Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith(prefix)).map(([p, t]) => [`${folder}/${p.slice(prefix.length)}`, t])),
  };
}

/** The VS Code extension's files as a .vsix holds them (a zip with a manifest), ready for `code --install-extension`. */
export function vsixFiles(files: Files): Files {
  const pkg = JSON.parse(files["vscode/package.json"]);
  const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const manifest = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">`,
    `  <Metadata>`,
    `    <Identity Language="en-US" Id="${esc(pkg.name)}" Version="${esc(pkg.version)}" Publisher="${esc(pkg.publisher)}" />`,
    `    <DisplayName>${esc(pkg.displayName)}</DisplayName>`,
    `    <Description xml:space="preserve">${esc(pkg.description)}</Description>`,
    `    <Tags>theme,color-theme</Tags>`,
    `    <Categories>Themes</Categories>`,
    `    <GalleryFlags>Public</GalleryFlags>`,
    `    <Properties>`,
    `      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${esc(pkg.engines.vscode)}" />`,
    `      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui,workspace,web" />`,
    `    </Properties>`,
    `  </Metadata>`,
    `  <Installation>`,
    `    <InstallationTarget Id="Microsoft.VisualStudio.Code" />`,
    `  </Installation>`,
    `  <Dependencies />`,
    `  <Assets>`,
    `    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />`,
    `    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />`,
    `  </Assets>`,
    `</PackageManifest>`,
  ].join("\n");
  const types = [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension=".json" ContentType="application/json" /><Default Extension=".md" ContentType="text/markdown" /><Default Extension=".vsixmanifest" ContentType="text/xml" /></Types>`,
  ].join("\n");
  return {
    "[Content_Types].xml": types,
    "extension.vsixmanifest": manifest,
    ...Object.fromEntries(Object.entries(files).filter(([p]) => p.startsWith("vscode/")).map(([p, t]) => [`extension/${p.slice("vscode/".length)}`, t])),
  };
}

/**
 * An install step with a flavour's names filled in: {id} the flavour, {name} its theme name, and
 * {hiru} and {yoru} the day and night flavours that go with it.
 */
export function step(text: string, f: { id: string }): string {
  const pair = f.id.replace(/-(hiru|yoru)$/, "");
  return text
    .replaceAll("{id}", f.id)
    .replaceAll("{name}", `madoromi ${f.id}`)
    .replaceAll("{hiru}", `${pair}-hiru`)
    .replaceAll("{yoru}", `${pair}-yoru`);
}
