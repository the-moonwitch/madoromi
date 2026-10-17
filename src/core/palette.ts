// The madoromi palettes: four seasons, each with a light (hiru, day) and a dark (yoru, night)
// flavour. Every colour in them is one of the inks at some dilution: a point on that ink's ramp
// curve, read at the lightness the colour needs.

import { contrast, oklabToHex, oklabToOklch, toSrgbGamut, type Vec3 } from "./color";
import type { InkView } from "./inkview";

/** All a palette needs of an ink: its ramp curve. */
type Curve = Pick<InkView, "curve">;

export type Season = "haru" | "natsu" | "aki" | "fuyu";
export type Mode = "hiru" | "yoru";

export const SEASONS: { id: Season; kanji: string; english: string; inks: string[]; grey: string }[] = [
  {
    id: "haru",
    kanji: "春",
    english: "spring",
    inks: ["hana-ikada", "tsutsuji", "syun-gyo", "tsukushi", "chiku-rin", "benzaiten", "ama-iro", "shin-ryoku"],
    grey: "kiri-same",
  },
  {
    id: "natsu",
    kanji: "夏",
    english: "summer",
    inks: ["ajisai", "asa-gao", "tsuyu-kusa", "hotaru-bi", "ama-iro", "kon-peki", "shin-kai", "ku-jaku", "sui-gyoku", "shimbashi-iro", "yu-yake"],
    grey: "fukagawa-nezu",
  },
  {
    id: "aki",
    kanji: "秋",
    english: "autumn",
    inks: ["momiji", "kosumosu", "yama-budo", "yama-guri", "ina-ho", "murasaki-shikibu", "tsuki-yo", "to-ro", "fuyu-gaki", "kiri-same"],
    grey: "yama-guri",
  },
  {
    id: "fuyu",
    kanji: "冬",
    english: "winter",
    // The seven lucky gods belong to the New Year.
    inks: ["fuyu-syogun", "rikka", "take-sumi", "fuyu-gaki", "edo-murasaki", "fukagawa-nezu", "ebisu", "daikokuten", "bishamonten", "benzaiten", "fukurokuju", "jurojin", "hoteison"],
    grey: "fuyu-syogun",
  },
];

export const MODES: { id: Mode; kanji: string; english: string }[] = [
  { id: "hiru", kanji: "昼", english: "day" },
  { id: "yoru", kanji: "夜", english: "night" },
];

export interface Accent {
  key: string;
  name: string;
  kanji: string;
  english: string;
  /** Target oklch hue, degrees. */
  hue: number;
  /** Lightness relative to the mode's accent lightness. */
  dL: Record<Mode, number>;
  minChroma: number;
  /** Prefer more chroma, or (for the pale ones) this chroma per mode. */
  vivid: boolean;
  chroma?: Record<Mode, number>;
  /** Contrast against the paper, where it differs from the mode's (gold can't be dark and gold). */
  contrast?: Partial<Record<Mode, number>>;
}

/** The accents, roughly Catppuccin's: rosewater … blue. */
export const ACCENTS: Accent[] = [
  { key: "sakura", name: "sakura", kanji: "桜", english: "cherry blossom", hue: 0, dL: { hiru: 0.08, yoru: 0.1 }, minChroma: 0.03, vivid: false, chroma: { hiru: 0.09, yoru: 0.09 } },
  { key: "nadeshiko", name: "nadeshiko", kanji: "撫子", english: "pink", hue: 352, dL: { hiru: 0.05, yoru: 0.04 }, minChroma: 0.08, vivid: true },
  { key: "botan", name: "botan", kanji: "牡丹", english: "peony", hue: 340, dL: { hiru: 0, yoru: 0 }, minChroma: 0.12, vivid: true },
  { key: "fuji", name: "fuji", kanji: "藤", english: "wisteria", hue: 305, dL: { hiru: 0, yoru: 0 }, minChroma: 0.1, vivid: true },
  { key: "kikyo", name: "kikyō", kanji: "桔梗", english: "bellflower", hue: 285, dL: { hiru: -0.02, yoru: 0 }, minChroma: 0.1, vivid: true },
  { key: "beni", name: "beni", kanji: "紅", english: "crimson", hue: 22, dL: { hiru: -0.02, yoru: -0.03 }, minChroma: 0.14, vivid: true },
  { key: "akane", name: "akane", kanji: "茜", english: "madder", hue: 8, dL: { hiru: 0.04, yoru: 0.04 }, minChroma: 0.1, vivid: true },
  { key: "kaki", name: "kaki", kanji: "柿", english: "persimmon", hue: 50, dL: { hiru: 0.17, yoru: 0.03 }, minChroma: 0.12, vivid: true, contrast: { hiru: 2.6 } },
  { key: "yamabuki", name: "yamabuki", kanji: "山吹", english: "kerria gold", hue: 85, dL: { hiru: 0.21, yoru: 0.08 }, minChroma: 0.15, vivid: true, contrast: { hiru: 2.2 } },
  { key: "wakaba", name: "wakaba", kanji: "若葉", english: "young leaves", hue: 135, dL: { hiru: 0.06, yoru: 0.05 }, minChroma: 0.1, vivid: true },
  { key: "tokiwa", name: "tokiwa", kanji: "常磐", english: "evergreen", hue: 175, dL: { hiru: 0.02, yoru: 0.02 }, minChroma: 0.08, vivid: true },
  { key: "sora", name: "sora", kanji: "空", english: "sky", hue: 220, dL: { hiru: 0.04, yoru: 0.04 }, minChroma: 0.08, vivid: true },
  { key: "ruri", name: "ruri", kanji: "瑠璃", english: "lapis", hue: 240, dL: { hiru: 0, yoru: 0 }, minChroma: 0.1, vivid: true },
  { key: "ai", name: "ai", kanji: "藍", english: "indigo", hue: 262, dL: { hiru: -0.02, yoru: -0.02 }, minChroma: 0.12, vivid: true },
];

export interface Neutral {
  key: string;
  name: string;
  kanji: string;
  english: string;
  /** Target lightness per mode. */
  L: Record<Mode, number>;
  /** The text tiers may carry a little more of the grey ink's colour. */
  text: boolean;
}

/** Writing on paper: the text is always the ink and the base always the paper, light or dark. */
export const NEUTRALS: Neutral[] = [
  { key: "sumi", name: "sumi", kanji: "墨", english: "ink", L: { hiru: 0.44, yoru: 0.88 }, text: true },
  { key: "usuzumi1", name: "usuzumi 1", kanji: "薄墨", english: "thinned ink", L: { hiru: 0.5, yoru: 0.82 }, text: true },
  { key: "usuzumi0", name: "usuzumi 0", kanji: "薄墨", english: "thinned ink", L: { hiru: 0.55, yoru: 0.75 }, text: true },
  { key: "kasure2", name: "kasure 2", kanji: "掠れ", english: "dry brush", L: { hiru: 0.6, yoru: 0.68 }, text: false },
  { key: "kasure1", name: "kasure 1", kanji: "掠れ", english: "dry brush", L: { hiru: 0.66, yoru: 0.61 }, text: false },
  { key: "kasure0", name: "kasure 0", kanji: "掠れ", english: "dry brush", L: { hiru: 0.71, yoru: 0.54 }, text: false },
  { key: "nijimi2", name: "nijimi 2", kanji: "滲み", english: "bleed", L: { hiru: 0.76, yoru: 0.47 }, text: false },
  { key: "nijimi1", name: "nijimi 1", kanji: "滲み", english: "bleed", L: { hiru: 0.81, yoru: 0.4 }, text: false },
  { key: "nijimi0", name: "nijimi 0", kanji: "滲み", english: "bleed", L: { hiru: 0.86, yoru: 0.32 }, text: false },
  { key: "kami", name: "kami", kanji: "紙", english: "paper", L: { hiru: 0.96, yoru: 0.24 }, text: false },
  { key: "hyoshi", name: "hyōshi", kanji: "表紙", english: "cover", L: { hiru: 0.93, yoru: 0.21 }, text: false },
  { key: "chitsu", name: "chitsu", kanji: "帙", english: "book case", L: { hiru: 0.9, yoru: 0.18 }, text: false },
];

/** Accents' lightness before contrast, and the contrast they must reach against the paper. */
const ACCENT_L: Record<Mode, number> = { hiru: 0.54, yoru: 0.76 };
const ACCENT_CONTRAST: Record<Mode, number> = { hiru: 4, yoru: 6 };
/** Accents past this chroma are harder to look at side by side, and lose out. */
const SOFT_CHROMA: Record<Mode, number> = { hiru: 0.19, yoru: 0.15 };
/** How far contrast may push an accent from its target lightness. */
const ACCENT_REACH = 0.14;
/** Accents in one flavour are at least this far apart (ΔE in oklab). */
const MIN_DELTA = 0.05;
/** How far an accent's hue may stray from its name's. */
const MAX_HUE_SHIFT = 40;
const accentContrast = (a: Accent, mode: Mode) => a.contrast?.[mode] ?? ACCENT_CONTRAST[mode];
/** The most chroma the neutrals take from their grey ink. */
const GREY_CHROMA = { text: 0.055, rest: 0.04 };
/** The text tiers' minimum contrast against the paper. */
const TEXT_CONTRAST: Record<string, number> = { sumi: 7, usuzumi0: 4.5, kasure2: 3 };

export interface Swatch {
  lab: Vec3;
  hex: string;
  /** The ink it is, and the lightness it's read at along that ink's ramp. */
  ink: string;
  L: number;
}

export interface Flavour {
  id: string;
  season: Season;
  mode: Mode;
  colours: Record<string, Swatch>;
  /** The 16 terminal colours, 0–15. */
  ansi: Swatch[];
}

const swatch = (lab: Vec3, ink: string, L: number): Swatch => {
  const c = toSrgbGamut(lab);
  return { lab: c, hex: oklabToHex(c), ink, L };
};

/** An ink's colour at a lightness, read along its ramp curve; undefined outside the ramp. */
export function colourAt(v: Curve, L: number): Vec3 | undefined {
  const lab = v.curve.lab;
  const n = lab.length / 3;
  if (L < lab[0] || L > lab[(n - 1) * 3]) return;
  let i = 0;
  while (i < n - 2 && lab[(i + 1) * 3] < L) i++;
  const f = Math.min(1, Math.max(0, (L - lab[i * 3]) / (lab[(i + 1) * 3] - lab[i * 3] || 1)));
  return [L, lab[i * 3 + 1] + (lab[(i + 1) * 3 + 1] - lab[i * 3 + 1]) * f, lab[i * 3 + 2] + (lab[(i + 1) * 3 + 2] - lab[i * 3 + 2]) * f];
}

/**
 * A grey ink's cast: its hue where it's dense (the darker half of its ramp), weighted by chroma.
 * Thinned out, the greys all drift towards the same blue; dense, each has its own colour.
 */
function castOf(v: Curve): number {
  const lab = v.curve.lab;
  const n = lab.length / 3;
  const mid = (lab[0] + lab[(n - 1) * 3]) / 2;
  let a = 0;
  let b = 0;
  for (let i = 0; i < n && lab[i * 3] <= mid; i++) {
    a += lab[i * 3 + 1];
    b += lab[i * 3 + 2];
  }
  return (Math.atan2(b, a) * 180) / Math.PI;
}

/**
 * A grey ink's colour at a lightness, in its cast and kept nearly neutral: as much chroma as the
 * ink has there, up to `cap`. Past the ends of its ramp the chroma tapers away.
 */
function greyAt(v: Curve, L: number, cast: number, cap: number): Vec3 {
  const lab = v.curve.lab;
  const n = lab.length / 3;
  let c = colourAt(v, L);
  let taper = 1;
  if (!c) {
    const e = L < lab[0] ? 0 : n - 1;
    c = [L, lab[e * 3 + 1], lab[e * 3 + 2]];
    taper = Math.max(0, 1 - Math.abs(L - lab[e * 3]) * 2);
  }
  const [, C] = oklabToOklch(c);
  const k = Math.min(C, cap) * taper;
  return [L, k * Math.cos((cast * Math.PI) / 180), k * Math.sin((cast * Math.PI) / 180)];
}

const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const deltaE = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Builds one flavour from every ink's view. */
export function buildFlavour(views: Map<string, Curve>, season: Season, mode: Mode): Flavour {
  const s = SEASONS.find((x) => x.id === season)!;
  const grey = views.get(s.grey)!;
  const cast = castOf(grey);
  const colours: Record<string, Swatch> = {};

  // --- Neutrals: the season's grey ink at each tier's lightness.
  const neutralAt = (L: number, cap: number) => greyAt(grey, L, cast, cap);
  for (const n of NEUTRALS) colours[n.key] = swatch(neutralAt(n.L[mode], n.text ? GREY_CHROMA.text : GREY_CHROMA.rest), s.grey, n.L[mode]);
  const paper = colours.kami.lab;
  // Text tiers move away from the paper until they're legible enough.
  for (const [key, min] of Object.entries(TEXT_CONTRAST)) {
    const n = NEUTRALS.find((x) => x.key === key)!;
    let L = n.L[mode];
    while (contrast(colours[key].lab, paper) < min && L > 0.02 && L < 0.98) {
      L += mode === "yoru" ? 0.01 : -0.01;
      colours[key] = swatch(neutralAt(L, n.text ? GREY_CHROMA.text : GREY_CHROMA.rest), s.grey, L);
    }
  }

  // --- Accents. Every ink is a candidate, read at a few lightnesses around the accent's (each
  // moved only as far as contrast needs). The best is the nearest in hue with the right chroma,
  // preferring the season's inks and inks not used yet, and far enough from the accents already
  // chosen. Accents with the fewest inks near their hue choose first.
  type Candidate = { lab: Vec3; ink: string; L: number; h: number; C: number };
  const candidates = new Map<string, Candidate[]>();
  for (const a of ACCENTS) {
    const L0 = ACCENT_L[mode] + a.dL[mode];
    const min = accentContrast(a, mode);
    const list: Candidate[] = [];
    for (const [ink, v] of views)
      for (let k = -2; k <= 2; k++) {
        const start = L0 + k * 0.03;
        let L = start;
        let c = colourAt(v, L);
        while (c && contrast(c, paper) < min && Math.abs(L - L0) < ACCENT_REACH) {
          L += mode === "yoru" ? 0.005 : -0.005;
          c = colourAt(v, L);
        }
        if (!c || contrast(c, paper) < min) continue;
        const lab = toSrgbGamut(c);
        const [, C, h] = oklabToOklch(lab);
        list.push({ lab, ink, L, h, C });
      }
    candidates.set(a.key, list);
  }
  const near = (key: string) => candidates.get(key)!.filter((c) => hueDistance(c.h, ACCENTS.find((a) => a.key === key)!.hue) < 20 && c.C > 0.05).length;
  // The pale ones first: the vivid ones would otherwise take the few soft inks they need.
  const pale = (key: string) => (ACCENTS.find((a) => a.key === key)!.vivid ? 1 : 0);
  const order = ACCENTS.map((a) => a.key).sort((x, y) => pale(x) - pale(y) || near(x) - near(y));
  const used = new Map<string, number>();
  const chosen: Vec3[] = [];
  for (const key of order) {
    const a = ACCENTS.find((x) => x.key === key)!;
    const L0 = ACCENT_L[mode] + a.dL[mode];
    let best: (Candidate & { score: number }) | undefined;
    for (const c of candidates.get(key)!) {
      if (chosen.some((o) => deltaE(o, c.lab) < MIN_DELTA)) continue;
      const hd = hueDistance(c.h, a.hue);
      if (hd > MAX_HUE_SHIFT) continue;
      const score =
        hd / 8 +
        Math.max(0, hd - 15) / 2 +
        (a.vivid ? Math.max(0, a.minChroma - c.C) * 60 + Math.max(0, c.C - SOFT_CHROMA[mode]) * 60 - c.C * 3 : Math.abs(c.C - a.chroma![mode]) * 60) +
        Math.abs(c.L - L0) * 8 +
        (used.get(c.ink) ?? 0) * 0.6 -
        // The season's own inks, where they're colourful enough for it.
        (s.inks.includes(c.ink) && (!a.vivid || c.C >= a.minChroma) ? 3 : 0);
      if (!best || score < best.score) best = { ...c, score };
    }
    if (!best) throw new Error(`no ink fits ${key} in ${season}-${mode}`);
    colours[key] = swatch(best.lab, best.ink, best.L);
    chosen.push(colours[key].lab);
    used.set(best.ink, (used.get(best.ink) ?? 0) + 1);
  }

  // --- Terminal colours. Bright ones are the same ink a step further from the paper.
  const brighter = (key: string): Swatch => {
    const sw = colours[key];
    const L = sw.L + (mode === "yoru" ? 0.06 : -0.06);
    const c = colourAt(views.get(sw.ink)!, L);
    return c ? swatch(c, sw.ink, L) : sw;
  };
  const hues = ["beni", "wakaba", "yamabuki", "ai", "botan", "tokiwa"];
  const [black, brightBlack, white, brightWhite] =
    mode === "yoru" ? ["nijimi1", "nijimi2", "usuzumi1", "usuzumi0"] : ["usuzumi1", "usuzumi0", "nijimi2", "nijimi1"];
  const ansi = [colours[black], ...hues.map((k) => colours[k]), colours[white], colours[brightBlack], ...hues.map(brighter), colours[brightWhite]];

  return { id: `${season}-${mode}`, season, mode, colours, ansi };
}

export function buildFamily(views: Map<string, Curve>): Flavour[] {
  return SEASONS.flatMap((s) => MODES.map((m) => buildFlavour(views, s.id, m.id)));
}

export interface Check {
  flavour: string;
  what: string;
  value: number;
  min: number;
}

/** Everything a flavour must meet: accents' and text tiers' contrast, accents' distinctness. */
export function checkFlavour(f: Flavour): Check[] {
  const paper = f.colours.kami.lab;
  const out: Check[] = [];
  for (const a of ACCENTS) out.push({ flavour: f.id, what: `${a.key} contrast`, value: contrast(f.colours[a.key].lab, paper), min: accentContrast(a, f.mode) });
  for (const [key, min] of Object.entries(TEXT_CONTRAST)) out.push({ flavour: f.id, what: `${key} contrast`, value: contrast(f.colours[key].lab, paper), min });
  for (let i = 0; i < ACCENTS.length; i++)
    for (let j = i + 1; j < ACCENTS.length; j++)
      out.push({
        flavour: f.id,
        what: `${ACCENTS[i].key}/${ACCENTS[j].key} ΔE`,
        value: deltaE(f.colours[ACCENTS[i].key].lab, f.colours[ACCENTS[j].key].lab),
        min: MIN_DELTA,
      });
  return out;
}

/** What every port, and the page's previews, draws each role in. */
export const ROLES = {
  // Code.
  text: "sumi",
  comment: "kasure2",
  punctuation: "usuzumi0",
  keyword: "fuji",
  operator: "sora",
  string: "wakaba",
  escape: "botan",
  regexp: "botan",
  number: "kaki",
  constant: "kaki",
  enumMember: "tokiwa",
  character: "tokiwa",
  function: "ai",
  builtin: "beni",
  macro: "tokiwa",
  decorator: "nadeshiko",
  type: "yamabuki",
  namespace: "kikyo",
  parameter: "akane",
  property: "ruri",
  self: "beni",
  tag: "botan",
  attribute: "yamabuki",
  label: "sakura",
  // Prose.
  heading: "fuji",
  link: "sora",
  code: "wakaba",
  quote: "kasure2",
  list: "kaki",
  // Interface and state.
  accent: "fuji",
  cursor: "sakura",
  match: "kaki",
  error: "beni",
  warning: "yamabuki",
  info: "sora",
  hint: "tokiwa",
  success: "wakaba",
  added: "wakaba",
  modified: "yamabuki",
  deleted: "beni",
} as const;
export type Role = keyof typeof ROLES;
