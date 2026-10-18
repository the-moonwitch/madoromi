// The style guide: which colour each part of an interface or a piece of code is drawn in. The
// ports follow it; the page and palettes/style-guide.md show it.
import { ACCENTS, NEUTRALS, ROLES, type Flavour, type Mode } from "./palette";

export interface GuideRow {
  use: string;
  /** Slots or roles (see ROLES), in order. */
  colours: string[];
  note?: string;
  /**
   * How the page shows it in use: as text (`sample`, the default), a filled tile, a wash behind
   * text at `alpha`, a wavy underline, a caret, a gutter mark or a run of brackets.
   */
  preview?: "text" | "fill" | "wash" | "squiggle" | "caret" | "gutter" | "rainbow" | "onAccent";
  sample?: string;
  alpha?: number;
  /** What a wash is drawn in, where that isn't the row's colour. */
  ground?: string;
}

export interface GuideSection {
  id: string;
  title: string;
  kanji: string;
  rows: GuideRow[];
}

/** A role's or slot's slot. */
export const slotOf = (key: string): string => (ROLES as Record<string, string>)[key] ?? key;

export const GUIDE: GuideSection[] = [
  {
    id: "paper",
    title: "paper",
    kanji: "紙",
    rows: [
      { use: "background", colours: ["kami"], preview: "fill" },
      { use: "secondary panes: sidebars, panels, floating windows", colours: ["hyoshi"], preview: "fill" },
      { use: "outer panes: title bar, status bar, tab strip", colours: ["chitsu"], preview: "fill" },
      { use: "surfaces: hovered and selected items, inputs, borders", colours: ["nijimi0", "nijimi1", "nijimi2"], preview: "fill" },
      { use: "overlays: placeholders, disabled text, scrollbars", colours: ["kasure0", "kasure1", "kasure2"], preview: "fill" },
    ],
  },
  {
    id: "ink",
    title: "ink",
    kanji: "墨",
    rows: [
      { use: "body text, headlines", colours: ["sumi"], sample: "The strokes of one ink" },
      { use: "sub-headlines, labels, secondary text", colours: ["usuzumi1", "usuzumi0"], sample: "palest last" },
      { use: "subtle text", colours: ["kasure2"], sample: "updated a moment ago" },
      { use: "text on an accent", colours: ["kami"], preview: "onAccent", sample: "install" },
      { use: "accent: focus, active items, tags, pills", colours: ["accent"], sample: "aki" },
      { use: "links, urls", colours: ["link"], sample: "madoromi.json" },
      { use: "success", colours: ["success"], sample: "✓ written" },
      { use: "warnings", colours: ["warning"], sample: "! glows by day" },
      { use: "errors", colours: ["error"], sample: "✗ no ink fits" },
      { use: "information", colours: ["info"], sample: "i 8 flavours" },
      { use: "hints", colours: ["hint"], sample: "· try yoru" },
      { use: "selection", colours: ["nijimi2"], note: "at 55–60% opacity", preview: "wash", sample: "dilute", alpha: 0.55 },
      { use: "cursor", colours: ["cursor"], note: "kami under it", preview: "caret", sample: "ink" },
    ],
  },
  {
    id: "code",
    title: "code",
    kanji: "符",
    rows: [
      { use: "keywords, storage", colours: ["keyword"], sample: "const" },
      { use: "strings", colours: ["string"], sample: '"ink"' },
      { use: "escape sequences, regular expressions", colours: ["escape"], sample: "\\n /^ink$/" },
      { use: "characters", colours: ["character"], sample: "'a'" },
      { use: "numbers, constants, booleans", colours: ["number"], sample: "0.24 true" },
      { use: "comments", colours: ["comment"], note: "italic", sample: "// palest last" },
      { use: "operators", colours: ["operator"], sample: "=> + =" },
      { use: "braces, delimiters", colours: ["punctuation"], sample: "{ ( ; ) }" },
      { use: "functions, methods", colours: ["function"], sample: "dilute()" },
      { use: "built-ins", colours: ["builtin"], sample: "console" },
      { use: "self, this", colours: ["self"], note: "italic", sample: "this" },
      { use: "parameters", colours: ["parameter"], note: "italic", sample: "ink, steps" },
      { use: "properties, fields, keys", colours: ["property"], sample: ".ramp" },
      { use: "types, classes, interfaces, enums", colours: ["type"], sample: "Ink" },
      { use: "enum members", colours: ["enumMember"], sample: "Kind.Brush" },
      { use: "namespaces, modules", colours: ["namespace"], sample: "madoromi::" },
      { use: "macros, preprocessor", colours: ["macro"], sample: "println!" },
      { use: "decorators, annotations", colours: ["decorator"], sample: "@memo" },
      { use: "tags", colours: ["tag"], sample: "<div>" },
      { use: "attributes", colours: ["attribute"], sample: "class=" },
      { use: "labels", colours: ["label"], sample: "outer:" },
      { use: "variables, plain text", colours: ["text"], sample: "ramp" },
    ],
  },
  {
    id: "prose",
    title: "prose",
    kanji: "文",
    rows: [
      { use: "headings", colours: ["heading"], note: "bold", sample: "# Seasons" },
      { use: "links", colours: ["link"], note: "underlined", sample: "the inks" },
      { use: "inline code, code blocks", colours: ["code"], sample: "`dilute`" },
      { use: "quotes", colours: ["quote"], note: "italic", sample: "> a light doze" },
      { use: "list markers", colours: ["list"], sample: "- haru" },
    ],
  },
  {
    id: "editor",
    title: "editor",
    kanji: "筆",
    rows: [
      { use: "cursor", colours: ["cursor"], preview: "caret", sample: "ink" },
      { use: "cursor line", colours: ["nijimi0"], note: "at 45% opacity", preview: "wash", sample: "  const ramp = dilute(ink);", alpha: 0.45 },
      { use: "line numbers", colours: ["nijimi2"], sample: "12" },
      { use: "active line number", colours: ["accent"], sample: "13" },
      { use: "search matches", colours: ["match"], note: "35% for the current one, 18% for the rest", preview: "wash", sample: "ink", alpha: 0.35 },
      { use: "matching bracket", colours: ["nijimi2", "kasure0"], note: "30% fill, solid border", preview: "wash", sample: "( )", alpha: 0.3 },
      { use: "indent guides, active", colours: ["nijimi0", "nijimi2"], preview: "gutter" },
      { use: "whitespace", colours: ["nijimi1"], sample: "·· →" },
      { use: "inlay hints", colours: ["kasure1"], note: "on nijimi 0 at 50%", preview: "wash", sample: ": Ink", alpha: 0.5, ground: "nijimi0" },
      { use: "rainbow brackets", colours: ["keyword", "function", "type", "string", "tag", "operator"], preview: "rainbow", sample: "((((((  ))))))" },
    ],
  },
  {
    id: "diff",
    title: "diff",
    kanji: "差",
    rows: [
      { use: "added", colours: ["added"], note: "10% on lines, 18% on text", preview: "wash", sample: "+ palette.ts", alpha: 0.18 },
      { use: "changed", colours: ["function"], note: "12% on lines, 28% on text", preview: "wash", sample: "~ brush.ts", alpha: 0.28 },
      { use: "modified (gutter)", colours: ["modified"], preview: "gutter" },
      { use: "deleted", colours: ["deleted"], note: "10% on lines, 18% on text", preview: "wash", sample: "− grey.ts", alpha: 0.18 },
      { use: "conflicts", colours: ["keyword"], sample: "<<<<<<< HEAD" },
    ],
  },
  {
    id: "terminal",
    title: "terminal",
    kanji: "端",
    rows: [
      { use: "background", colours: ["kami"], preview: "fill" },
      { use: "foreground", colours: ["sumi"], sample: "~/madoromi ❯ ls" },
      { use: "cursor, cursor text", colours: ["cursor", "kami"], preview: "caret", sample: "ls" },
      { use: "selection", colours: ["nijimi2"], preview: "wash", sample: "dilute", alpha: 0.55 },
      { use: "active border, active tab", colours: ["accent"], preview: "fill" },
      { use: "inactive border", colours: ["nijimi1"], preview: "fill" },
      { use: "bell", colours: ["warning"], sample: "🔔" },
      { use: "tab bar", colours: ["chitsu"], preview: "fill" },
    ],
  },
];

export const ANSI_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
/** Bright colours are the same ink as their normal one, this much further from the paper. */
export const BRIGHT_STEP = 0.06;

const SLOTS = new Map([...ACCENTS, ...NEUTRALS].map((s) => [s.key, s]));
export const slotName = (key: string) => SLOTS.get(slotOf(key))!.name;
export const slotKanji = (key: string) => SLOTS.get(slotOf(key))!.kanji;

/** The ANSI colours' slots for a mode: 0–7 then 8–15. */
export function ansiSlots(f: Flavour): { key: string; brighter: boolean }[] {
  const slot = (hex: string) => Object.keys(f.colours).find((k) => f.colours[k].hex === hex);
  return f.ansi.map((sw, i) => {
    const key = slot(sw.hex);
    return key ? { key, brighter: false } : { key: slot(f.ansi[i - 8].hex)!, brighter: true };
  });
}

/** The style guide as markdown, for palettes/style-guide.md. */
export function guideMarkdown(family: Flavour[]): string {
  const name = (key: string) => `${slotName(key)} ${slotKanji(key)}`;
  const out = [
    "# madoromi style guide",
    "",
    "Which colour each thing is drawn in. The names are the same in every flavour; see `madoromi.json` for their values.",
    "",
  ];
  for (const s of GUIDE) {
    out.push(`## ${s.title} ${s.kanji}`, "", "| use | colour | |", "| --- | --- | --- |");
    for (const r of s.rows) out.push(`| ${r.use} | ${r.colours.map(name).join(", ")} | ${r.note ?? ""} |`);
    out.push("");
  }
  const byMode = (m: Mode) => family.find((f) => f.mode === m)!;
  out.push(
    "## ANSI colours",
    "",
    `Bright colours are the same ink as their normal colour, read ${BRIGHT_STEP} further from the paper.`,
    "",
    "| | day (hiru) | night (yoru) |",
    "| --- | --- | --- |",
  );
  const [hiru, yoru] = [ansiSlots(byMode("hiru")), ansiSlots(byMode("yoru"))];
  for (let i = 0; i < 16; i++) {
    const label = (a: { key: string; brighter: boolean }) => name(a.key) + (a.brighter ? ", stronger" : "");
    out.push(`| ${i} ${i < 8 ? ANSI_NAMES[i] : `bright ${ANSI_NAMES[i - 8]}`} | ${label(hiru[i])} | ${label(yoru[i])} |`);
  }
  return out.join("\n");
}
