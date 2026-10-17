// The ink lineup and its sample scans. Samples live in samples/ as `[NN_]<slug>[--anything].<ext>`,
// so one ink can have several scans (e.g. `ku-jaku--2.jpg` next to `ku-jaku.webp`).
// Each scan's crop (`[x0, y0, x1, y1]`, fractions of width and height) is the part of it that's
// ink on paper.
//
// The images themselves aren't part of the app or the repository: preprocessing lists them (with
// their crops) in samples.json, and the app works from what was derived from them. Only the dev
// server, run where the images are, can fetch one to extract it in the browser.

import { SAMPLE_FILE } from "./core/cloudfile";
import listed from "./samples.json";

/**
 * Pilot iroshizuku, in the order Pilot lists them, then the limited editions: romanised name, kanji,
 * English name.
 * Syun-gyo's and rikka's kanji (春暁, 六花) are read from their names rather than a Pilot source.
 */
const LINEUP: [slug: string, kanji: string, english: string][] = [
  ["yu-yake", "夕焼け", "sunset"],
  ["fuyu-gaki", "冬柿", "winter persimmon"],
  ["momiji", "紅葉", "autumn leaves"],
  ["tsutsuji", "躑躅", "azalea"],
  ["kosumosu", "秋桜", "cosmos"],
  ["hana-ikada", "花筏", "cherry blossom petals"],
  ["yama-budo", "山葡萄", "crimson glory vine"],
  ["murasaki-shikibu", "紫式部", "japanese beautyberry"],
  ["asa-gao", "朝顔", "morning glory"],
  ["ajisai", "紫陽花", "hydrangea"],
  ["tsuyu-kusa", "露草", "asiatic dayflower"],
  ["kon-peki", "紺碧", "deep cerulean blue"],
  ["ama-iro", "天色", "sky blue"],
  ["shin-kai", "深海", "deep sea"],
  ["tsuki-yo", "月夜", "moonlight"],
  ["ku-jaku", "孔雀", "peacock"],
  ["syo-ro", "松露", "dew on pine tree"],
  ["sui-gyoku", "翠玉", "emerald"],
  ["shin-ryoku", "深緑", "forest green"],
  ["chiku-rin", "竹林", "bamboo forest"],
  ["hotaru-bi", "蛍火", "light of fireflies"],
  ["ina-ho", "稲穂", "rice ear"],
  ["to-ro", "燈路", "warm lantern"],
  ["syun-gyo", "春暁", "spring dawn"],
  ["rikka", "六花", "snow crystal"],
  ["yama-guri", "山栗", "wild chestnut"],
  ["tsukushi", "土筆", "field horsetail"],
  ["take-sumi", "竹炭", "bamboo charcoal"],
  ["kiri-same", "霧雨", "autumn shower"],
  ["fuyu-syogun", "冬将軍", "rigor of winter"],
  // Pilot's 100th anniversary set, the seven lucky gods (七福神).
  ["ebisu", "恵比寿", "god of fishermen"],
  ["daikokuten", "大黒天", "god of wealth"],
  ["bishamonten", "毘沙門天", "god of warriors"],
  ["benzaiten", "弁財天", "goddess of the arts"],
  ["fukurokuju", "福禄寿", "god of fortune"],
  ["jurojin", "寿老人", "god of longevity"],
  ["hoteison", "布袋尊", "god of contentment"],
  // Tokyo limited editions (江戸の粋).
  ["fukagawa-nezu", "深川鼠", "fukagawa grey"],
  ["shimbashi-iro", "新橋色", "shimbashi blue"],
  ["edo-murasaki", "江戸紫", "edo purple"],
];

export interface SampleSource {
  /** Where the image itself was downloaded from. */
  image?: string;
  /** The page it appeared on. */
  page?: string;
  /** Region of the image that is ink on paper, as fractions: [x0, y0, x1, y1]. */
  crop?: [number, number, number, number];
}

export interface Sample extends SampleSource {
  file: string;
  url: string;
}

export interface Ink {
  id: string;
  name: string;
  kanji?: string;
  english?: string;
  /** Every sample scan of this ink. */
  samples: Sample[];
}

// JSON imports type crops as number[], not as the 4-tuple.
const samplesBySlug = new Map<string, Sample[]>();
for (const [file, crop] of Object.entries(listed as Record<string, number[] | null>).sort(([a], [b]) => a.localeCompare(b))) {
  const m = file.match(SAMPLE_FILE);
  if (!m) continue;
  const sample: Sample = { file, url: `${import.meta.env.BASE_URL}samples/${file}`, ...(crop ? { crop: crop as SampleSource["crop"] } : {}) };
  samplesBySlug.set(m[1], [...(samplesBySlug.get(m[1]) ?? []), sample]);
}

const known = new Set(LINEUP.map(([slug]) => slug));
export const inks: Ink[] = [
  ...LINEUP.filter(([slug]) => samplesBySlug.has(slug)).map(([slug, kanji, english]) => ({
    id: slug,
    name: slug,
    kanji,
    english,
    samples: samplesBySlug.get(slug)!,
  })),
  ...[...samplesBySlug]
    .filter(([slug]) => !known.has(slug))
    .map(([slug, samples]) => ({ id: slug, name: slug, samples })),
];
