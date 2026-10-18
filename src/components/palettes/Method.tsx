import { For } from "solid-js";
import { apparentLightness, contrast, oklabToOklch } from "../../core/color";
import { ACCENT_CONTRAST, ACCENTS, APPARENT_BAND, CONTRAST_GIVE, COST, HARMONY, MAX_HUE_SHIFT, MODES, MOODS, SEASONS, type Flavour } from "../../core/palette";
import { slotOf } from "../../core/guide";

const W = 560;
const H = 150;
const PAD = { l: 34, r: 8, t: 10, b: 26 };
const x = (i: number) => PAD.l + ((i + 0.5) * (W - PAD.l - PAD.r)) / ACCENTS.length;
const scale = (lo: number, hi: number) => (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

/** A chart over the 14 accents: a value per accent, drawn in its colour, against a target. */
function AccentChart(props: {
  flavour: Flavour;
  value: (key: string) => number;
  lo: number;
  hi: number;
  ticks: number[];
  format: (v: number) => string;
  bars?: boolean;
  band?: (key: string) => [number, number];
  /** A mark per accent drawn over its bar or dot, e.g. its minimum. */
  mark?: (key: string) => number;
  line?: { at: number; label: string };
  label: string;
}) {
  const y = () => scale(props.lo, props.hi);
  return (
    <svg class="m-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={props.label}>
      <For each={props.ticks}>
        {(t) => (
          <>
            <line x1={PAD.l} x2={W - PAD.r} y1={y()(t)} y2={y()(t)} class="grid" />
            <text x={PAD.l - 6} y={y()(t) + 3} class="tick" text-anchor="end">
              {props.format(t)}
            </text>
          </>
        )}
      </For>
      {props.line && (
        <>
          <line x1={PAD.l} x2={W - PAD.r} y1={y()(props.line.at)} y2={y()(props.line.at)} class="target" />
          <text x={PAD.l + 4} y={y()(props.line.at) - 5} class="tick" text-anchor="start">
            {props.line.label}
          </text>
        </>
      )}
      <For each={ACCENTS}>
        {(a, i) => {
          const c = () => props.flavour.colours[a.key].hex;
          const v = () => Math.min(props.hi, Math.max(props.lo, props.value(a.key)));
          const band = () => props.band?.(a.key);
          return (
            <g>
              {band() && <rect x={x(i()) - 9} width={18} y={y()(band()![1])} height={Math.max(1, y()(band()![0]) - y()(band()![1]))} class="band" />}
              {props.bars ? (
                <rect x={x(i()) - 7} width={14} y={y()(v())} height={y()(props.lo) - y()(v())} rx={2} fill={c()} />
              ) : (
                <circle cx={x(i())} cy={y()(v())} r={6} fill={c()} />
              )}
              {props.mark && <line x1={x(i()) - 10} x2={x(i()) + 10} y1={y()(props.mark(a.key))} y2={y()(props.mark(a.key))} class="mark" />}
              <text x={x(i())} y={H - 8} class="label" text-anchor="middle">
                {a.kanji[0]}
              </text>
            </g>
          );
        }}
      </For>
    </svg>
  );
}

/** How the palettes are made, shown on the chosen flavour: the measures, and the knobs behind them. */
export function Method(props: { flavour: Flavour; family: Flavour[] }) {
  const f = () => props.flavour;
  const paper = () => f().colours.kami.lab;
  const mood = () => MOODS[f().season];
  const harmony = () => HARMONY[f().mode];
  const minContrast = (key: string) => ACCENTS.find((a) => a.key === key)!.contrast?.[f().mode] ?? ACCENT_CONTRAST[f().mode];
  const target = (key: string) => harmony().apparent + mood().apparent + ACCENTS.find((a) => a.key === key)!.dL[f().mode] * 1.16;
  const distance = (a: Flavour, b: Flavour) =>
    ACCENTS.reduce((t, s) => t + Math.hypot(...([0, 1, 2].map((k) => a.colours[s.key].lab[k] - b.colours[s.key].lab[k]) as [number, number, number])), 0) /
    ACCENTS.length;

  return (
    <main class="m-page m-method">
      <header class="m-title">
        <span class="deco kanji">作り方</span>
        <div>
          <h2>method</h2>
          <p>How every colour is chosen, measured on {f().id}.</p>
        </div>
      </header>

      <section>
        <h3>
          <span class="kanji">墨</span> from ink to ramp
        </h3>
        <ol class="m-steps">
          <li>Each ink is scanned on paper; its pixels become a cloud of colours in oklab.</li>
          <li>A plane is fitted through the cloud, and a gradient across it.</li>
          <li>A curve runs through the cloud from the densest stroke to the palest wash: in each band of lightness, the hue the scans agree on and the chroma of the more vivid half.</li>
          <li>Read along that curve, the ink gives one colour for every strength. Each accent is one ink, at one strength.</li>
        </ol>
      </section>

      <section>
        <h3>
          <span class="kanji">選</span> choosing an accent
        </h3>
        <p class="m-lede">
          Every ink is read at every strength near the accent's that is legible on the paper. Each reading is scored on how far it strays from what the
          flavour asks, and the lowest score wins. These are the knobs.
        </p>
        <table class="m-table m-knobs">
          <tbody>
            <tr>
              <td>legible</td>
              <td>
                {ACCENT_CONTRAST.hiru}:1 by day, {ACCENT_CONTRAST.yoru}:1 by night; an accent that would lose its colour may give up to {Math.round((1 - CONTRAST_GIVE) * 100)}%
              </td>
            </tr>
            <tr>
              <td>evenly bright</td>
              <td>
                apparent lightness (L**) aimed at {harmony().apparent.toFixed(2)} {f().mode === "hiru" ? "by day" : "by night"}, within ±{APPARENT_BAND}; costs {COST.apparent} per unit off
              </td>
            </tr>
            <tr>
              <td>as colourful as the rest</td>
              <td>
                chroma aimed at {harmony().chroma.toFixed(2)}; {COST.loud} per unit over, {COST.chroma} under, {COST.shortfall} under the accent's own minimum
              </td>
            </tr>
            <tr>
              <td>not glowing</td>
              <td>
                colourfulness may lift L** over L* by {harmony().glow}; {COST.glow} per unit more
              </td>
            </tr>
            <tr>
              <td>clear of sRGB's edge</td>
              <td>
                up to {Math.round(harmony().gamut * 100)}% of the chroma sRGB allows there; {COST.gamut} per unit more
              </td>
            </tr>
            <tr>
              <td>its name's hue</td>
              <td>
                within {MAX_HUE_SHIFT}°; {COST.hue} per degree, {COST.hueFar} more past 15°
              </td>
            </tr>
            <tr>
              <td>its season</td>
              <td>
                {f().season}: lightness {mood().apparent >= 0 ? "+" : ""}
                {mood().apparent}, chroma {mood().chroma >= 0 ? "+" : ""}
                {mood().chroma}, hues leaning {mood().lean}° towards {mood().pole}°; its own inks {COST.season} cheaper, another season's choice {COST.echo} dearer
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>
          <span class="kanji">測</span> the measures
        </h3>
        <div class="m-charts">
          <figure>
            <AccentChart
              flavour={f()}
              label="contrast with the paper"
              value={(k) => contrast(f().colours[k].lab, paper())}
              lo={1}
              hi={12}
              ticks={[1, 3, 6, 9, 12]}
              format={(v) => `${v}:1`}
              bars
              mark={(k) => minContrast(k) * CONTRAST_GIVE}
            />
            <figcaption>contrast with the paper; the line is the least each accent may have</figcaption>
          </figure>
          <figure>
            <AccentChart
              flavour={f()}
              label="apparent lightness"
              value={(k) => apparentLightness(f().colours[k].lab)}
              lo={f().mode === "hiru" ? 0.35 : 0.6}
              hi={f().mode === "hiru" ? 0.85 : 0.95}
              ticks={f().mode === "hiru" ? [0.4, 0.5, 0.6, 0.7, 0.8] : [0.6, 0.7, 0.8, 0.9]}
              format={(v) => v.toFixed(1)}
              band={(k) => [target(k) - APPARENT_BAND, target(k) + APPARENT_BAND]}
            />
            <figcaption>apparent lightness (L**), with the band each accent aims for</figcaption>
          </figure>
          <figure>
            <AccentChart
              flavour={f()}
              label="chroma"
              value={(k) => oklabToOklch(f().colours[k].lab)[1]}
              lo={0}
              hi={0.25}
              ticks={[0, 0.1, 0.2]}
              format={(v) => v.toFixed(1)}
              line={{ at: harmony().chroma + mood().chroma, label: "the flavour's chroma" }}
            />
            <figcaption>chroma, against what the flavour aims for</figcaption>
          </figure>
          <figure class="m-distances">
            <For each={MODES}>
              {(m) => {
                const fs = () => props.family.filter((x) => x.mode === m.id);
                return (
                  <table aria-label={`how far apart the seasons are by ${m.english}`}>
                    <thead>
                      <tr>
                        <th>{m.kanji}</th>
                        <For each={SEASONS}>{(s) => <th>{s.kanji}</th>}</For>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={fs()}>
                        {(a) => (
                          <tr>
                            <th>{SEASONS.find((s) => s.id === a.season)!.kanji}</th>
                            <For each={fs()}>
                              {(b) => {
                                const d = distance(a, b);
                                return (
                                  <td style={{ background: a === b ? "transparent" : `color-mix(in srgb, var(--m-${slotOf("accent")}) ${Math.round(Math.min(1, d / 0.08) * 60)}%, transparent)` }}>
                                    {a === b ? "" : d.toFixed(3)}
                                  </td>
                                );
                              }}
                            </For>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                );
              }}
            </For>
            <figcaption>how far apart the seasons are: the mean difference (ΔE in oklab) of their accents</figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}
