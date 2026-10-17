// Terminal themes: Ghostty, Kitty, WezTerm, Alacritty and iTerm2, one file per flavour.
import type { Flavour } from "../core/palette";
import { AUTHOR, HEADER, hex, role, slug, themeName, type Files } from "./common";

const ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

/** What every terminal is given. */
function scheme(f: Flavour) {
  return {
    bg: hex(f, "kami"),
    fg: hex(f, "sumi"),
    cursor: role(f, "cursor"),
    cursorText: hex(f, "kami"),
    selectionBg: hex(f, "nijimi2"),
    selectionFg: hex(f, "sumi"),
    link: role(f, "link"),
    accent: role(f, "accent"),
    ansi: f.ansi.map((s) => s.hex),
  };
}

const ghostty = (f: Flavour) => {
  const s = scheme(f);
  return [
    `# ${themeName(f)}: ${HEADER}`,
    ...s.ansi.map((c, i) => `palette = ${i}=${c}`),
    `background = ${s.bg}`,
    `foreground = ${s.fg}`,
    `cursor-color = ${s.cursor}`,
    `cursor-text = ${s.cursorText}`,
    `selection-background = ${s.selectionBg}`,
    `selection-foreground = ${s.selectionFg}`,
  ].join("\n");
};

const kitty = (f: Flavour) => {
  const s = scheme(f);
  return [
    `# vim:ft=kitty`,
    `## name: ${themeName(f)}`,
    `## author: ${AUTHOR}`,
    `## blurb: ${HEADER}`,
    ``,
    `foreground ${s.fg}`,
    `background ${s.bg}`,
    `selection_foreground ${s.selectionFg}`,
    `selection_background ${s.selectionBg}`,
    `cursor ${s.cursor}`,
    `cursor_text_color ${s.cursorText}`,
    `url_color ${s.link}`,
    `active_border_color ${s.accent}`,
    `inactive_border_color ${hex(f, "nijimi1")}`,
    `bell_border_color ${role(f, "warning")}`,
    `tab_bar_background ${hex(f, "chitsu")}`,
    `active_tab_foreground ${hex(f, "kami")}`,
    `active_tab_background ${s.accent}`,
    `inactive_tab_foreground ${hex(f, "usuzumi0")}`,
    `inactive_tab_background ${hex(f, "hyoshi")}`,
    ``,
    ...s.ansi.map((c, i) => `color${i} ${c}`),
  ].join("\n");
};

const tomlArray = (xs: string[]) => `[${xs.map((x) => `"${x}"`).join(", ")}]`;

const wezterm = (f: Flavour) => {
  const s = scheme(f);
  return [
    `# ${HEADER}`,
    `[colors]`,
    `foreground = "${s.fg}"`,
    `background = "${s.bg}"`,
    `cursor_bg = "${s.cursor}"`,
    `cursor_fg = "${s.cursorText}"`,
    `cursor_border = "${s.cursor}"`,
    `selection_fg = "${s.selectionFg}"`,
    `selection_bg = "${s.selectionBg}"`,
    `scrollbar_thumb = "${hex(f, "nijimi1")}"`,
    `split = "${hex(f, "nijimi1")}"`,
    `ansi = ${tomlArray(s.ansi.slice(0, 8))}`,
    `brights = ${tomlArray(s.ansi.slice(8))}`,
    ``,
    `[metadata]`,
    `name = "${themeName(f)}"`,
    `author = "${AUTHOR}"`,
  ].join("\n");
};

const alacritty = (f: Flavour) => {
  const s = scheme(f);
  const group = (name: string, from: number) => [`[colors.${name}]`, ...ANSI_NAMES.map((n, i) => `${n} = "${s.ansi[from + i]}"`), ``];
  return [
    `# ${themeName(f)}: ${HEADER}`,
    `[colors.primary]`,
    `background = "${s.bg}"`,
    `foreground = "${s.fg}"`,
    ``,
    `[colors.cursor]`,
    `text = "${s.cursorText}"`,
    `cursor = "${s.cursor}"`,
    ``,
    `[colors.selection]`,
    `text = "${s.selectionFg}"`,
    `background = "${s.selectionBg}"`,
    ``,
    ...group("normal", 0),
    ...group("bright", 8),
  ].join("\n");
};

const iterm2 = (f: Flavour) => {
  const s = scheme(f);
  const colour = (name: string, h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return [
      `\t<key>${name}</key>`,
      `\t<dict>`,
      `\t\t<key>Alpha Component</key>`,
      `\t\t<real>1</real>`,
      `\t\t<key>Blue Component</key>`,
      `\t\t<real>${b}</real>`,
      `\t\t<key>Color Space</key>`,
      `\t\t<string>sRGB</string>`,
      `\t\t<key>Green Component</key>`,
      `\t\t<real>${g}</real>`,
      `\t\t<key>Red Component</key>`,
      `\t\t<real>${r}</real>`,
      `\t</dict>`,
    ];
  };
  const entries: [string, string][] = [
    ...s.ansi.map((c, i): [string, string] => [`Ansi ${i} Color`, c]),
    ["Background Color", s.bg],
    ["Badge Color", s.accent],
    ["Bold Color", s.fg],
    ["Cursor Color", s.cursor],
    ["Cursor Guide Color", hex(f, "nijimi0")],
    ["Cursor Text Color", s.cursorText],
    ["Foreground Color", s.fg],
    ["Link Color", s.link],
    ["Selected Text Color", s.selectionFg],
    ["Selection Color", s.selectionBg],
    ["Tab Color", hex(f, "hyoshi")],
  ];
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`,
    `<!-- ${themeName(f)}: ${HEADER} -->`,
    `<plist version="1.0">`,
    `<dict>`,
    ...entries.sort(([a], [b]) => a.localeCompare(b)).flatMap(([k, c]) => colour(k, c)),
    `</dict>`,
    `</plist>`,
  ].join("\n");
};

export function terminals(family: Flavour[]): Files {
  const out: Files = {};
  for (const f of family) {
    out[`ghostty/${slug(f)}`] = ghostty(f);
    out[`kitty/${slug(f)}.conf`] = kitty(f);
    out[`wezterm/${slug(f)}.toml`] = wezterm(f);
    out[`alacritty/${slug(f)}.toml`] = alacritty(f);
    out[`iterm2/${slug(f)}.itermcolors`] = iterm2(f);
  }
  return out;
}
