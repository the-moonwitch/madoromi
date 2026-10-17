// A Neovim colour scheme plugin: every flavour's colours in lua/madoromi/palettes.lua, the highlight
// groups (core, Treesitter, LSP, diagnostics, git signs) in lua/madoromi/init.lua, and a
// colors/madoromi-<flavour>.lua for each flavour.
import { ACCENTS, NEUTRALS, ROLES, type Flavour, type Role } from "../core/palette";
import { HEADER, wash, type Files } from "./common";

/** Tints washed over the paper, since highlight groups have no transparency. */
const WASHES: Record<string, [Role | string, number]> = {
  line: ["nijimi0", 0.5],
  search: ["match", 0.3],
  diff_add: ["added", 0.18],
  diff_change: ["function", 0.12],
  diff_delete: ["deleted", 0.18],
  diff_text: ["function", 0.28],
  error_bg: ["error", 0.1],
  warning_bg: ["warning", 0.1],
  info_bg: ["info", 0.1],
  hint_bg: ["hint", 0.1],
  ok_bg: ["success", 0.1],
};

/** A colour: a role, a slot or a wash. */
type C = Role | string;
type Spec = { fg?: C; bg?: C; sp?: C; bold?: true; italic?: true; underline?: true; undercurl?: true; strikethrough?: true; reverse?: true } | { link: string };

const GROUPS: [string, Spec][] = [
  // Editor.
  ["Normal", { fg: "text", bg: "kami" }],
  ["NormalNC", { fg: "text", bg: "kami" }],
  ["NormalFloat", { fg: "text", bg: "hyoshi" }],
  ["FloatBorder", { fg: "accent", bg: "hyoshi" }],
  ["FloatTitle", { fg: "usuzumi0", bg: "hyoshi", bold: true }],
  ["Cursor", { fg: "kami", bg: "cursor" }],
  ["lCursor", { link: "Cursor" }],
  ["CursorIM", { link: "Cursor" }],
  ["TermCursor", { link: "Cursor" }],
  ["CursorLine", { bg: "line" }],
  ["CursorColumn", { bg: "line" }],
  ["ColorColumn", { bg: "hyoshi" }],
  ["CursorLineNr", { fg: "accent", bold: true }],
  ["LineNr", { fg: "nijimi2" }],
  ["SignColumn", { fg: "nijimi2" }],
  ["FoldColumn", { fg: "kasure0" }],
  ["Folded", { fg: "function", bg: "nijimi0" }],
  ["Visual", { bg: "nijimi1", bold: true }],
  ["VisualNOS", { link: "Visual" }],
  ["Search", { fg: "text", bg: "search" }],
  ["IncSearch", { fg: "kami", bg: "match" }],
  ["CurSearch", { link: "IncSearch" }],
  ["Substitute", { fg: "kami", bg: "deleted" }],
  ["MatchParen", { fg: "match", bg: "nijimi1", bold: true }],
  ["Pmenu", { fg: "usuzumi1", bg: "hyoshi" }],
  ["PmenuSel", { bg: "nijimi0", bold: true }],
  ["PmenuSbar", { bg: "nijimi0" }],
  ["PmenuThumb", { bg: "kasure0" }],
  ["PmenuMatch", { fg: "accent", bold: true }],
  ["WildMenu", { link: "PmenuSel" }],
  ["StatusLine", { fg: "text", bg: "chitsu" }],
  ["StatusLineNC", { fg: "kasure0", bg: "chitsu" }],
  ["TabLine", { fg: "kasure1", bg: "chitsu" }],
  ["TabLineSel", { fg: "text", bg: "kami", bold: true }],
  ["TabLineFill", { bg: "chitsu" }],
  ["WinBar", { fg: "usuzumi0" }],
  ["WinBarNC", { fg: "kasure1" }],
  ["WinSeparator", { fg: "nijimi1" }],
  ["VertSplit", { link: "WinSeparator" }],
  ["NonText", { fg: "nijimi2" }],
  ["Whitespace", { fg: "nijimi1" }],
  ["SpecialKey", { link: "NonText" }],
  ["EndOfBuffer", { fg: "kami" }],
  ["Conceal", { fg: "kasure0" }],
  ["Directory", { fg: "function" }],
  ["Title", { fg: "heading", bold: true }],
  ["ErrorMsg", { fg: "error", bold: true }],
  ["WarningMsg", { fg: "warning" }],
  ["MoreMsg", { fg: "function" }],
  ["ModeMsg", { fg: "text", bold: true }],
  ["Question", { fg: "function" }],
  ["QuickFixLine", { bg: "nijimi0", bold: true }],
  ["DiffAdd", { bg: "diff_add" }],
  ["DiffChange", { bg: "diff_change" }],
  ["DiffDelete", { bg: "diff_delete" }],
  ["DiffText", { bg: "diff_text" }],
  ["Added", { fg: "added" }],
  ["Changed", { fg: "modified" }],
  ["Removed", { fg: "deleted" }],
  ["SpellBad", { sp: "error", undercurl: true }],
  ["SpellCap", { sp: "warning", undercurl: true }],
  ["SpellRare", { sp: "keyword", undercurl: true }],
  ["SpellLocal", { sp: "info", undercurl: true }],

  // Syntax.
  ["Comment", { fg: "comment", italic: true }],
  ["Constant", { fg: "constant" }],
  ["String", { fg: "string" }],
  ["Character", { fg: "character" }],
  ["Number", { fg: "number" }],
  ["Float", { fg: "number" }],
  ["Boolean", { fg: "constant" }],
  ["Identifier", { fg: "text" }],
  ["Function", { fg: "function" }],
  ["Statement", { fg: "keyword" }],
  ["Conditional", { fg: "keyword" }],
  ["Repeat", { fg: "keyword" }],
  ["Label", { fg: "label" }],
  ["Operator", { fg: "operator" }],
  ["Keyword", { fg: "keyword" }],
  ["Exception", { fg: "keyword" }],
  ["PreProc", { fg: "macro" }],
  ["Include", { fg: "keyword" }],
  ["Define", { fg: "macro" }],
  ["Macro", { fg: "macro" }],
  ["PreCondit", { fg: "macro" }],
  ["Type", { fg: "type" }],
  ["StorageClass", { fg: "keyword" }],
  ["Structure", { fg: "type" }],
  ["Typedef", { fg: "type" }],
  ["Special", { fg: "escape" }],
  ["SpecialChar", { fg: "escape" }],
  ["Tag", { fg: "tag" }],
  ["Delimiter", { fg: "punctuation" }],
  ["SpecialComment", { fg: "comment", italic: true }],
  ["Debug", { fg: "error" }],
  ["Underlined", { underline: true }],
  ["Error", { fg: "error" }],
  ["Todo", { fg: "kami", bg: "warning", bold: true }],

  // Treesitter.
  ["@variable", { fg: "text" }],
  ["@variable.builtin", { fg: "self", italic: true }],
  ["@variable.parameter", { fg: "parameter", italic: true }],
  ["@variable.member", { fg: "property" }],
  ["@property", { fg: "property" }],
  ["@constant", { fg: "constant" }],
  ["@constant.builtin", { fg: "constant" }],
  ["@constant.macro", { fg: "macro" }],
  ["@module", { fg: "namespace" }],
  ["@label", { fg: "label" }],
  ["@string", { fg: "string" }],
  ["@string.escape", { fg: "escape" }],
  ["@string.regexp", { fg: "regexp" }],
  ["@string.special", { fg: "escape" }],
  ["@string.special.symbol", { fg: "constant" }],
  ["@string.special.url", { fg: "link", underline: true }],
  ["@character", { fg: "character" }],
  ["@character.special", { fg: "escape" }],
  ["@number", { fg: "number" }],
  ["@number.float", { fg: "number" }],
  ["@boolean", { fg: "constant" }],
  ["@type", { fg: "type" }],
  ["@type.builtin", { fg: "type", italic: true }],
  ["@type.definition", { fg: "type" }],
  ["@attribute", { fg: "decorator" }],
  ["@function", { fg: "function" }],
  ["@function.builtin", { fg: "builtin" }],
  ["@function.call", { fg: "function" }],
  ["@function.macro", { fg: "macro" }],
  ["@function.method", { fg: "function" }],
  ["@function.method.call", { fg: "function" }],
  ["@constructor", { fg: "type" }],
  ["@operator", { fg: "operator" }],
  ["@keyword", { fg: "keyword" }],
  ["@keyword.operator", { fg: "keyword" }],
  ["@keyword.import", { fg: "keyword" }],
  ["@keyword.directive", { fg: "macro" }],
  ["@punctuation.delimiter", { fg: "punctuation" }],
  ["@punctuation.bracket", { fg: "punctuation" }],
  ["@punctuation.special", { fg: "escape" }],
  ["@comment", { link: "Comment" }],
  ["@comment.error", { fg: "kami", bg: "error", bold: true }],
  ["@comment.warning", { fg: "kami", bg: "warning", bold: true }],
  ["@comment.todo", { fg: "kami", bg: "function", bold: true }],
  ["@comment.note", { fg: "kami", bg: "info", bold: true }],
  ["@markup.heading", { fg: "heading", bold: true }],
  ["@markup.strong", { bold: true }],
  ["@markup.italic", { italic: true }],
  ["@markup.strikethrough", { strikethrough: true }],
  ["@markup.underline", { underline: true }],
  ["@markup.link", { fg: "link" }],
  ["@markup.link.url", { fg: "link", underline: true }],
  ["@markup.link.label", { fg: "link" }],
  ["@markup.raw", { fg: "code" }],
  ["@markup.quote", { fg: "quote", italic: true }],
  ["@markup.list", { fg: "list" }],
  ["@tag", { fg: "tag" }],
  ["@tag.attribute", { fg: "attribute" }],
  ["@tag.delimiter", { fg: "punctuation" }],
  ["@diff.plus", { fg: "added" }],
  ["@diff.minus", { fg: "deleted" }],
  ["@diff.delta", { fg: "modified" }],

  // LSP.
  ["@lsp.type.namespace", { link: "@module" }],
  ["@lsp.type.type", { link: "@type" }],
  ["@lsp.type.class", { link: "@type" }],
  ["@lsp.type.enum", { link: "@type" }],
  ["@lsp.type.interface", { link: "@type" }],
  ["@lsp.type.struct", { link: "@type" }],
  ["@lsp.type.typeParameter", { fg: "type", italic: true }],
  ["@lsp.type.parameter", { link: "@variable.parameter" }],
  ["@lsp.type.property", { link: "@property" }],
  ["@lsp.type.enumMember", { fg: "enumMember" }],
  ["@lsp.type.function", { link: "@function" }],
  ["@lsp.type.method", { link: "@function.method" }],
  ["@lsp.type.macro", { link: "@function.macro" }],
  ["@lsp.type.decorator", { fg: "decorator" }],
  ["@lsp.typemod.variable.readonly", { link: "@constant" }],
  ["@lsp.typemod.variable.defaultLibrary", { link: "@variable.builtin" }],
  ["@lsp.typemod.function.defaultLibrary", { link: "@function.builtin" }],
  ["LspReferenceText", { bg: "nijimi0" }],
  ["LspReferenceRead", { bg: "nijimi0" }],
  ["LspReferenceWrite", { bg: "nijimi1" }],
  ["LspInlayHint", { fg: "kasure1", bg: "line" }],
  ["LspCodeLens", { fg: "kasure0" }],
  ["LspSignatureActiveParameter", { bg: "nijimi0", bold: true }],

  // Diagnostics.
  ...(
    [
      ["Error", "error"],
      ["Warn", "warning"],
      ["Info", "info"],
      ["Hint", "hint"],
      ["Ok", "success"],
    ] as const
  ).flatMap(([name, r]): [string, Spec][] => [
    [`Diagnostic${name}`, { fg: r }],
    [`DiagnosticVirtualText${name}`, { fg: r, bg: `${r === "success" ? "ok" : r}_bg` }],
    [`DiagnosticUnderline${name}`, { sp: r, undercurl: true }],
    [`DiagnosticSign${name}`, { fg: r }],
    [`DiagnosticFloating${name}`, { fg: r }],
  ]),
  ["DiagnosticUnnecessary", { fg: "kasure1" }],
  ["DiagnosticDeprecated", { strikethrough: true }],

  // Git signs.
  ["GitSignsAdd", { fg: "added" }],
  ["GitSignsChange", { fg: "modified" }],
  ["GitSignsDelete", { fg: "deleted" }],
];

const SLOTS = [...ACCENTS, ...NEUTRALS].map((s) => s.key);
const resolve = (c: C) => {
  const key = (ROLES as Record<string, string>)[c] ?? c;
  if (!SLOTS.includes(key) && !(key in WASHES)) throw new Error(`nvim: no colour ${c}`);
  return key;
};
const luaKey = (k: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `["${k}"]`);

function groupsLua(): string {
  const lines = GROUPS.map(([name, spec]) => {
    const fields =
      "link" in spec
        ? [`link = "${spec.link}"`]
        : Object.entries(spec).map(([k, v]) => (v === true ? `${k} = true` : `${k} = c.${resolve(v as C)}`));
    return `    ${luaKey(name)} = { ${fields.join(", ")} },`;
  });
  return [
    `-- ${HEADER}`,
    `local M = {}`,
    ``,
    `--- The highlight groups, given a flavour's colours.`,
    `function M.groups(c)`,
    `  return {`,
    ...lines,
    `  }`,
    `end`,
    ``,
    `--- Applies a flavour, e.g. require("madoromi").load("haru-yoru").`,
    `function M.load(flavour)`,
    `  local c = require("madoromi.palettes")[flavour]`,
    `  assert(c, "madoromi: no flavour " .. tostring(flavour))`,
    `  if vim.g.colors_name then vim.cmd("hi clear") end`,
    `  vim.g.colors_name = nil`,
    `  vim.o.background = c.dark and "dark" or "light"`,
    `  vim.o.termguicolors = true`,
    `  for group, spec in pairs(M.groups(c)) do`,
    `    vim.api.nvim_set_hl(0, group, spec)`,
    `  end`,
    `  for i, colour in ipairs(c.ansi) do`,
    `    vim.g["terminal_color_" .. (i - 1)] = colour`,
    `  end`,
    `  vim.g.colors_name = "madoromi-" .. flavour`,
    `end`,
    ``,
    `return M`,
  ].join("\n");
}

function palettesLua(family: Flavour[]): string {
  const flavour = (f: Flavour) => {
    const washes = Object.entries(WASHES).map(([k, [c, t]]) => [k, wash(f, resolve(c), t)]);
    const entries = [...SLOTS.map((k) => [k, f.colours[k].hex]), ...washes];
    return [
      `  ["${f.id}"] = {`,
      `    dark = ${f.mode === "yoru"},`,
      ...entries.map(([k, v]) => `    ${k} = "${v}",`),
      `    ansi = { ${f.ansi.map((s) => `"${s.hex}"`).join(", ")} },`,
      `  },`,
    ].join("\n");
  };
  return [`-- ${HEADER}`, `return {`, ...family.map(flavour), `}`].join("\n");
}

export function nvim(family: Flavour[]): Files {
  const out: Files = {
    "nvim/lua/madoromi/init.lua": groupsLua(),
    "nvim/lua/madoromi/palettes.lua": palettesLua(family),
  };
  for (const f of family) out[`nvim/colors/madoromi-${f.id}.lua`] = `-- ${HEADER}\nrequire("madoromi").load("${f.id}")`;
  return out;
}
