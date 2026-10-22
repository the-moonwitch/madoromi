// Emacs themes: a standalone madoromi-<flavour>-theme.el per flavour, each with its colours
// let-bound and the faces (built-in, font-lock, diff, org, and the near-universal packages) set
// through custom-theme-set-faces.
import { ACCENTS, NEUTRALS, ROLES, type Flavour, type Role } from "../core/palette";
import { HEADER, wash, type Files } from "./common";

/** Tints washed over the paper, since faces have no transparency. */
const WASHES: Record<string, [Role | string, number]> = {
  line: ["nijimi0", 0.5],
  match1: ["match", 0.35],
  match0: ["match", 0.18],
  diff_add: ["added", 0.1],
  diff_add_text: ["added", 0.18],
  diff_change: ["function", 0.12],
  diff_change_text: ["function", 0.28],
  diff_delete: ["deleted", 0.1],
  diff_delete_text: ["deleted", 0.18],
  diff_base: ["modified", 0.1],
  error_bg: ["error", 0.1],
  warning_bg: ["warning", 0.1],
};

/** A colour: a role, a slot or a wash. */
type C = Role | string;
type Spec = {
  fg?: C;
  bg?: C;
  bold?: true;
  italic?: true;
  /** Plain, in a colour, or a wavy line in a colour. */
  underline?: true | { c: C; wave?: true };
  strikethrough?: true;
  extend?: true;
  /** A one-pixel border in a colour, or none where Emacs would draw one. */
  box?: C | false;
} | { inherit: string };

const FACES: [string, Spec][] = [
  // Editor.
  ["default", { fg: "text", bg: "kami" }],
  ["cursor", { bg: "cursor" }],
  ["region", { bg: "nijimi1", extend: true }],
  ["secondary-selection", { bg: "nijimi0", extend: true }],
  ["highlight", { bg: "nijimi0" }],
  ["hl-line", { bg: "line", extend: true }],
  ["fringe", { fg: "nijimi2", bg: "kami" }],
  ["shadow", { fg: "kasure1" }],
  ["link", { fg: "link", underline: true }],
  ["link-visited", { fg: "keyword", underline: true }],
  ["match", { bg: "match0" }],
  ["isearch", { fg: "kami", bg: "match" }],
  ["lazy-highlight", { bg: "match0" }],
  ["isearch-fail", { bg: "error_bg" }],
  ["query-replace", { inherit: "isearch" }],
  ["minibuffer-prompt", { fg: "function" }],
  ["completions-common-part", { fg: "accent", bold: true }],
  ["completions-first-difference", { bold: true }],
  ["vertical-border", { fg: "nijimi1" }],
  ["window-divider", { fg: "nijimi1" }],
  ["window-divider-first-pixel", { fg: "nijimi0" }],
  ["window-divider-last-pixel", { fg: "nijimi0" }],
  ["tooltip", { fg: "text", bg: "hyoshi" }],
  ["error", { fg: "error", bold: true }],
  ["warning", { fg: "warning" }],
  ["success", { fg: "success" }],
  ["escape-glyph", { fg: "escape" }],
  ["homoglyph", { fg: "escape" }],
  ["trailing-whitespace", { bg: "error_bg" }],
  ["widget-field", { bg: "nijimi0" }],
  ["line-number", { fg: "nijimi2" }],
  ["line-number-current-line", { fg: "accent", bold: true }],
  ["fill-column-indicator", { fg: "nijimi1" }],
  ["show-paren-match", { fg: "match", bg: "nijimi1", bold: true }],
  ["show-paren-mismatch", { fg: "kami", bg: "error" }],
  ["whitespace-space", { fg: "nijimi1" }],
  ["whitespace-tab", { fg: "nijimi1" }],
  ["whitespace-newline", { fg: "nijimi1" }],
  ["whitespace-trailing", { fg: "error", bg: "error_bg" }],
  ["whitespace-line", { bg: "warning_bg" }],

  // Mode line, header line, tabs.
  ["mode-line", { fg: "text", bg: "chitsu", box: false }],
  ["mode-line-active", { inherit: "mode-line" }],
  ["mode-line-inactive", { fg: "kasure0", bg: "chitsu", box: false }],
  ["mode-line-emphasis", { bold: true }],
  ["mode-line-buffer-id", { bold: true }],
  ["mode-line-highlight", { bg: "nijimi0" }],
  ["header-line", { fg: "usuzumi0", bg: "hyoshi", box: false }],
  ["tab-bar", { fg: "kasure1", bg: "chitsu" }],
  ["tab-bar-tab", { fg: "text", bg: "kami", bold: true, box: false }],
  ["tab-bar-tab-inactive", { fg: "kasure1", bg: "chitsu", box: false }],
  ["tab-line", { fg: "kasure1", bg: "chitsu" }],
  ["tab-line-tab", { inherit: "tab-bar-tab" }],
  ["tab-line-tab-current", { inherit: "tab-bar-tab" }],
  ["tab-line-tab-inactive", { inherit: "tab-bar-tab-inactive" }],

  // Syntax (font-lock, which tree-sitter modes use too).
  ["font-lock-builtin-face", { fg: "builtin" }],
  ["font-lock-comment-face", { fg: "comment", italic: true }],
  ["font-lock-comment-delimiter-face", { fg: "comment", italic: true }],
  ["font-lock-doc-face", { fg: "comment", italic: true }],
  ["font-lock-doc-markup-face", { fg: "decorator" }],
  ["font-lock-constant-face", { fg: "constant" }],
  ["font-lock-function-name-face", { fg: "function" }],
  ["font-lock-function-call-face", { fg: "function" }],
  ["font-lock-keyword-face", { fg: "keyword" }],
  ["font-lock-negation-char-face", { fg: "operator" }],
  ["font-lock-number-face", { fg: "number" }],
  ["font-lock-operator-face", { fg: "operator" }],
  ["font-lock-preprocessor-face", { fg: "macro" }],
  ["font-lock-property-name-face", { fg: "property" }],
  ["font-lock-property-use-face", { fg: "property" }],
  ["font-lock-punctuation-face", { fg: "punctuation" }],
  ["font-lock-bracket-face", { fg: "punctuation" }],
  ["font-lock-delimiter-face", { fg: "punctuation" }],
  ["font-lock-misc-punctuation-face", { fg: "punctuation" }],
  ["font-lock-regexp-face", { fg: "regexp" }],
  ["font-lock-regexp-grouping-backslash", { fg: "escape" }],
  ["font-lock-regexp-grouping-construct", { fg: "escape" }],
  ["font-lock-string-face", { fg: "string" }],
  ["font-lock-escape-face", { fg: "escape" }],
  ["font-lock-type-face", { fg: "type" }],
  ["font-lock-variable-name-face", { fg: "text" }],
  ["font-lock-variable-use-face", { fg: "text" }],
  ["font-lock-warning-face", { fg: "warning", bold: true }],

  // Diff and merge.
  ["diff-added", { bg: "diff_add", extend: true }],
  ["diff-refine-added", { bg: "diff_add_text" }],
  ["diff-changed", { bg: "diff_change", extend: true }],
  ["diff-refine-changed", { bg: "diff_change_text" }],
  ["diff-removed", { bg: "diff_delete", extend: true }],
  ["diff-refine-removed", { bg: "diff_delete_text" }],
  ["diff-indicator-added", { fg: "added" }],
  ["diff-indicator-changed", { fg: "modified" }],
  ["diff-indicator-removed", { fg: "deleted" }],
  ["diff-header", { fg: "usuzumi0", bg: "hyoshi" }],
  ["diff-file-header", { fg: "text", bg: "hyoshi", bold: true }],
  ["diff-hunk-header", { fg: "function", bg: "hyoshi" }],
  ["smerge-upper", { bg: "diff_delete", extend: true }],
  ["smerge-lower", { bg: "diff_add", extend: true }],
  ["smerge-base", { bg: "diff_base", extend: true }],
  ["smerge-markers", { fg: "usuzumi0", bg: "nijimi0" }],
  ["smerge-refined-added", { bg: "diff_add_text" }],
  ["smerge-refined-removed", { bg: "diff_delete_text" }],
  ["diff-hl-insert", { fg: "added", bg: "diff_add" }],
  ["diff-hl-change", { fg: "modified", bg: "diff_change" }],
  ["diff-hl-delete", { fg: "deleted", bg: "diff_delete" }],

  // Compilation and diagnostics.
  ["compilation-error", { fg: "error", bold: true }],
  ["compilation-warning", { fg: "warning" }],
  ["compilation-info", { fg: "info" }],
  ["compilation-line-number", { fg: "usuzumi0" }],
  ["compilation-column-number", { fg: "kasure1" }],
  ["compilation-mode-line-exit", { fg: "success", bold: true }],
  ["compilation-mode-line-fail", { fg: "error", bold: true }],
  ["compilation-mode-line-run", { fg: "warning" }],
  ["flymake-error", { underline: { c: "error", wave: true } }],
  ["flymake-warning", { underline: { c: "warning", wave: true } }],
  ["flymake-note", { underline: { c: "info", wave: true } }],
  ["flycheck-error", { underline: { c: "error", wave: true } }],
  ["flycheck-warning", { underline: { c: "warning", wave: true } }],
  ["flycheck-info", { underline: { c: "info", wave: true } }],
  ["flyspell-incorrect", { underline: { c: "error", wave: true } }],
  ["flyspell-duplicate", { underline: { c: "warning", wave: true } }],
  ["eglot-highlight-symbol-face", { bg: "nijimi0" }],
  ["eglot-inlay-hint-face", { fg: "kasure1", bg: "line" }],

  // Dired and eshell.
  ["dired-directory", { fg: "function" }],
  ["dired-header", { fg: "heading", bold: true }],
  ["dired-symlink", { fg: "link" }],
  ["dired-broken-symlink", { fg: "error" }],
  ["dired-ignored", { fg: "kasure1" }],
  ["dired-marked", { fg: "accent", bold: true }],
  ["dired-flagged", { fg: "deleted", bold: true }],
  ["eshell-prompt", { fg: "accent", bold: true }],
  ["eshell-ls-directory", { fg: "function", bold: true }],
  ["eshell-ls-executable", { fg: "success" }],
  ["eshell-ls-symlink", { fg: "link" }],

  // Org.
  ["org-document-title", { fg: "heading", bold: true }],
  ["org-document-info", { fg: "usuzumi0" }],
  ["org-document-info-keyword", { fg: "comment" }],
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n): [string, Spec] => [`org-level-${n}`, { fg: "heading", bold: true }]),
  ["org-todo", { fg: "warning", bold: true }],
  ["org-done", { fg: "success", bold: true }],
  ["org-headline-done", { fg: "kasure1" }],
  ["org-link", { fg: "link", underline: true }],
  ["org-code", { fg: "code" }],
  ["org-verbatim", { fg: "code" }],
  ["org-block", { bg: "hyoshi", extend: true }],
  ["org-block-begin-line", { fg: "kasure1", bg: "hyoshi", extend: true }],
  ["org-block-end-line", { fg: "kasure1", bg: "hyoshi", extend: true }],
  ["org-quote", { fg: "quote", italic: true }],
  ["org-table", { fg: "usuzumi1" }],
  ["org-date", { fg: "info", underline: true }],
  ["org-tag", { fg: "accent" }],
  ["org-checkbox", { fg: "list" }],
  ["org-priority", { fg: "label" }],
  ["org-special-keyword", { fg: "comment" }],
  ["org-drawer", { fg: "kasure1" }],
  ["org-ellipsis", { fg: "kasure0" }],
  ["org-agenda-structure", { fg: "heading", bold: true }],
  ["org-agenda-date", { fg: "function" }],
  ["org-agenda-date-today", { fg: "accent", bold: true }],

  // Markdown.
  ["markdown-header-face", { fg: "heading", bold: true }],
  ...[1, 2, 3, 4, 5, 6].map((n): [string, Spec] => [`markdown-header-face-${n}`, { inherit: "markdown-header-face" }]),
  ["markdown-markup-face", { fg: "punctuation" }],
  ["markdown-code-face", { fg: "code" }],
  ["markdown-inline-code-face", { fg: "code" }],
  ["markdown-pre-face", { fg: "code" }],
  ["markdown-url-face", { fg: "link" }],
  ["markdown-link-face", { fg: "link", underline: true }],
  ["markdown-blockquote-face", { fg: "quote", italic: true }],
  ["markdown-list-face", { fg: "list" }],

  // Magit.
  ["magit-section-heading", { fg: "heading", bold: true }],
  ["magit-section-highlight", { bg: "line", extend: true }],
  ["magit-branch-local", { fg: "function" }],
  ["magit-branch-remote", { fg: "success" }],
  ["magit-branch-current", { fg: "function", bold: true }],
  ["magit-hash", { fg: "kasure1" }],
  ["magit-tag", { fg: "type" }],
  ["magit-log-author", { fg: "parameter" }],
  ["magit-log-date", { fg: "kasure1" }],
  ["magit-diff-file-heading", { bold: true }],
  ["magit-diff-file-heading-highlight", { bg: "line", bold: true, extend: true }],
  ["magit-diff-hunk-heading", { fg: "usuzumi0", bg: "nijimi0", extend: true }],
  ["magit-diff-hunk-heading-highlight", { fg: "text", bg: "nijimi1", extend: true }],
  ["magit-diff-added", { bg: "diff_add", extend: true }],
  ["magit-diff-added-highlight", { bg: "diff_add_text", extend: true }],
  ["magit-diff-removed", { bg: "diff_delete", extend: true }],
  ["magit-diff-removed-highlight", { bg: "diff_delete_text", extend: true }],
  ["magit-diff-context", { fg: "kasure1", extend: true }],
  ["magit-diff-context-highlight", { bg: "line", extend: true }],
];

const ANSI = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
const SLOTS = [...ACCENTS, ...NEUTRALS].map((s) => s.key);
const resolve = (c: C) => {
  const key = (ROLES as Record<string, string>)[c] ?? c;
  if (!SLOTS.includes(key) && !(key in WASHES)) throw new Error(`emacs: no colour ${c}`);
  return key;
};
/** The let binding a colour reads from (washes take lisp-friendly names). */
const binding = (c: C) => resolve(c).replaceAll("_", "-");

function attrs(spec: Spec): string {
  if ("inherit" in spec) return `:inherit ${spec.inherit}`;
  const out: string[] = [];
  if (spec.fg) out.push(`:foreground ,${binding(spec.fg)}`);
  if (spec.bg) out.push(`:background ,${binding(spec.bg)}`);
  if (spec.bold) out.push(":weight bold");
  if (spec.italic) out.push(":slant italic");
  if (spec.underline === true) out.push(":underline t");
  else if (spec.underline) out.push(spec.underline.wave ? `:underline (:style wave :color ,${binding(spec.underline.c)})` : `:underline ,${binding(spec.underline.c)}`);
  if (spec.strikethrough) out.push(":strike-through t");
  if (spec.box === false) out.push(":box nil");
  else if (spec.box) out.push(`:box (:line-width 1 :color ,${binding(spec.box)})`);
  if (spec.extend) out.push(":extend t");
  return out.join(" ");
}

function themeEl(f: Flavour): string {
  const theme = `madoromi-${f.id}`;
  const slots = SLOTS.map((k) => [k, f.colours[k].hex]);
  const washes = Object.entries(WASHES).map(([k, [c, t]]) => [k.replaceAll("_", "-"), wash(f, resolve(c), t)]);
  const ansi = f.ansi.map((s, i) => [`ansi${i}`, s.hex]);
  const lets = [...slots, ...washes, ...ansi];
  const ansiFaces = f.ansi.flatMap((_, i) => {
    const name = `${i > 7 ? "bright-" : ""}${ANSI[i % 8]}`;
    return [`ansi-color-${name}`, `term-color-${name}`].map((face) => `   \`(${face} ((t (:foreground ,ansi${i} :background ,ansi${i}))))`);
  });
  return [
    `;;; ${theme}-theme.el --- madoromi ${f.id} -*- lexical-binding: t; -*-`,
    ``,
    `;; ${HEADER}`,
    `;; URL: https://github.com/the-moonwitch/madoromi`,
    ``,
    `;;; Commentary:`,
    ``,
    `;; madoromi ${f.id}, ${f.mode === "yoru" ? "dark" : "light"}: Pilot's iroshizuku inks on paper.`,
    ``,
    `;;; Code:`,
    ``,
    `(deftheme ${theme}`,
    `  "madoromi ${f.id}: iroshizuku inks on ${f.mode === "yoru" ? "dark" : "light"} paper.")`,
    ``,
    `(let (${lets.map(([k, v], i) => `${i ? "      " : ""}(${k} "${v}")`).join("\n")})`,
    `  (custom-theme-set-faces`,
    `   '${theme}`,
    ...FACES.map(([name, spec]) => `   \`(${name} ((t (${attrs(spec)}))))`),
    ...ansiFaces.slice(0, -1),
    `${ansiFaces[ansiFaces.length - 1]}))`,
    ``,
    `;;;###autoload`,
    `(when load-file-name`,
    `  (add-to-list 'custom-theme-load-path (file-name-as-directory (file-name-directory load-file-name))))`,
    ``,
    `(provide-theme '${theme})`,
    `;;; ${theme}-theme.el ends here`,
  ].join("\n");
}

export function emacs(family: Flavour[]): Files {
  return Object.fromEntries(family.map((f) => [`emacs/madoromi-${f.id}-theme.el`, themeEl(f)]));
}
