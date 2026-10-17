// The style guide: which colour each part of an interface or a piece of code is drawn in. The
// ports follow it; the page and palettes/style-guide.md show it.
import { ACCENTS, NEUTRALS, ROLES, type Flavour, type Mode } from "./palette";

export interface GuideRow {
  use: string;
  /** Slots or roles (see ROLES), in order. */
  colours: string[];
  note?: string;
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
      { use: "background", colours: ["kami"] },
      { use: "secondary panes: sidebars, panels, floating windows", colours: ["hyoshi"] },
      { use: "outer panes: title bar, status bar, tab strip", colours: ["chitsu"] },
      { use: "surfaces: hovered and selected items, inputs, borders", colours: ["nijimi0", "nijimi1", "nijimi2"] },
      { use: "overlays: placeholders, disabled text, scrollbars", colours: ["kasure0", "kasure1", "kasure2"] },
    ],
  },
  {
    id: "ink",
    title: "ink",
    kanji: "墨",
    rows: [
      { use: "body text, headlines", colours: ["sumi"] },
      { use: "sub-headlines, labels, secondary text", colours: ["usuzumi1", "usuzumi0"] },
      { use: "subtle text", colours: ["kasure2"] },
      { use: "text on an accent", colours: ["kami"] },
      { use: "accent: focus, active items, tags, pills", colours: ["accent"] },
      { use: "links, urls", colours: ["link"] },
      { use: "success", colours: ["success"] },
      { use: "warnings", colours: ["warning"] },
      { use: "errors", colours: ["error"] },
      { use: "information", colours: ["info"] },
      { use: "hints", colours: ["hint"] },
      { use: "selection", colours: ["nijimi2"], note: "at 55–60% opacity" },
      { use: "cursor", colours: ["cursor"], note: "kami under it" },
    ],
  },
  {
    id: "code",
    title: "code",
    kanji: "符",
    rows: [
      { use: "keywords, storage", colours: ["keyword"] },
      { use: "strings", colours: ["string"] },
      { use: "escape sequences, regular expressions", colours: ["escape"] },
      { use: "characters", colours: ["character"] },
      { use: "numbers, constants, booleans", colours: ["number"] },
      { use: "comments", colours: ["comment"], note: "italic" },
      { use: "operators", colours: ["operator"] },
      { use: "braces, delimiters", colours: ["punctuation"] },
      { use: "functions, methods", colours: ["function"] },
      { use: "built-ins", colours: ["builtin"] },
      { use: "self, this", colours: ["self"], note: "italic" },
      { use: "parameters", colours: ["parameter"], note: "italic" },
      { use: "properties, fields, keys", colours: ["property"] },
      { use: "types, classes, interfaces, enums", colours: ["type"] },
      { use: "enum members", colours: ["enumMember"] },
      { use: "namespaces, modules", colours: ["namespace"] },
      { use: "macros, preprocessor", colours: ["macro"] },
      { use: "decorators, annotations", colours: ["decorator"] },
      { use: "tags", colours: ["tag"] },
      { use: "attributes", colours: ["attribute"] },
      { use: "labels", colours: ["label"] },
      { use: "variables, plain text", colours: ["text"] },
    ],
  },
  {
    id: "prose",
    title: "prose",
    kanji: "文",
    rows: [
      { use: "headings", colours: ["heading"], note: "bold" },
      { use: "links", colours: ["link"], note: "underlined" },
      { use: "inline code, code blocks", colours: ["code"] },
      { use: "quotes", colours: ["quote"], note: "italic" },
      { use: "list markers", colours: ["list"] },
    ],
  },
  {
    id: "editor",
    title: "editor",
    kanji: "筆",
    rows: [
      { use: "cursor", colours: ["cursor"] },
      { use: "cursor line", colours: ["nijimi0"], note: "at 45% opacity" },
      { use: "line numbers", colours: ["nijimi2"] },
      { use: "active line number", colours: ["accent"] },
      { use: "search matches", colours: ["match"], note: "35% for the current one, 18% for the rest" },
      { use: "matching bracket", colours: ["nijimi2", "kasure0"], note: "30% fill, solid border" },
      { use: "indent guides, active", colours: ["nijimi0", "nijimi2"] },
      { use: "whitespace", colours: ["nijimi1"] },
      { use: "inlay hints", colours: ["kasure1"], note: "on nijimi 0 at 50%" },
      { use: "rainbow brackets", colours: ["keyword", "function", "type", "string", "tag", "operator"] },
    ],
  },
  {
    id: "diff",
    title: "diff",
    kanji: "差",
    rows: [
      { use: "added", colours: ["added"], note: "10% on lines, 18% on text" },
      { use: "changed", colours: ["function"], note: "12% on lines, 28% on text" },
      { use: "modified (gutter)", colours: ["modified"] },
      { use: "deleted", colours: ["deleted"], note: "10% on lines, 18% on text" },
      { use: "conflicts", colours: ["keyword"] },
    ],
  },
  {
    id: "terminal",
    title: "terminal",
    kanji: "端",
    rows: [
      { use: "background", colours: ["kami"] },
      { use: "foreground", colours: ["sumi"] },
      { use: "cursor, cursor text", colours: ["cursor", "kami"] },
      { use: "selection", colours: ["nijimi2"] },
      { use: "active border, active tab", colours: ["accent"] },
      { use: "inactive border", colours: ["nijimi1"] },
      { use: "bell", colours: ["warning"] },
      { use: "tab bar", colours: ["chitsu"] },
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
