import { For } from "solid-js";
import { apparentLightness, contrast, oklabToOklch } from "../../core/color";
import { ACCENT_CONTRAST, ACCENTS, APPARENT_BAND, CONTRAST_GIVE, HARMONY, MAX_HUE_SHIFT, MODES, MOODS, SEASONS, type Flavour } from "../../core/palette";
import { slotOf } from "../../core/guide";
import type { Ramp } from "../../core/summary";
import { InkSteps } from "./InkSteps";

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
export function Method(props: { flavour: Flavour; family: Flavour[]; ramp: (id: string) => Ramp | undefined }) {
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
          <p>How each colour is chosen, shown for {f().id}.</p>
        </div>
      </header>

      <section>
        <h3>
          <span class="kanji">墨</span> From ink to colour
        </h3>
        <ol class="m-steps">
          <li>Each ink is scanned on paper. Every pixel's colour becomes a point in a colour space (oklab).</li>
          <li>The points are split into bands by lightness. In each band, the most colourful points give that band's colour.</li>
          <li>A smooth curve joins the bands, from the darkest ink to the palest. It gives one colour for every lightness.</li>
          <li>A flat gradient is fitted through all the points, to show how the ink varies around the curve.</li>
          <li>An accent colour is one point on one ink's curve.</li>
        </ol>
        <InkSteps ramp={props.ramp} start={f().colours.fuji.ink} />
      </section>

      <section>
        <h3>
          <span class="kanji">選</span> Choosing an accent
        </h3>
        <p class="m-lede">
          For each accent, every ink is tried at every lightness that is readable on the background. Each option is scored by how far it is from
          the targets below, and the lowest score wins.
        </p>
        <table class="m-table m-knobs">
          <tbody>
            <tr>
              <td>readable</td>
              <td>
                Contrast with the background of at least {ACCENT_CONTRAST.hiru}:1 by day and {ACCENT_CONTRAST.yoru}:1 by night. An accent may go {Math.round((1 - CONTRAST_GIVE) * 100)}% lower if it would otherwise lose its colour.
              </td>
            </tr>
            <tr>
              <td>evenly bright</td>
              <td>
                Apparent lightness (L**, which counts how colour makes things look brighter) close to {harmony().apparent.toFixed(2)}, within ±{APPARENT_BAND}.
              </td>
            </tr>
            <tr>
              <td>colourfulness</td>
              <td>
                Chroma close to {harmony().chroma.toFixed(2)}. Too much is penalised more than too little, and losing the accent's own colour most of all.
              </td>
            </tr>
            <tr>
              <td>no glow</td>
              <td>
                Colour may make an accent look at most {harmony().glow} brighter than a grey of the same lightness.
              </td>
            </tr>
            <tr>
              <td>on screen</td>
              <td>
                At most {Math.round(harmony().gamut * 100)}% of the chroma a screen (sRGB) can show at that lightness and hue.
              </td>
            </tr>
            <tr>
              <td>hue</td>
              <td>
                Within {MAX_HUE_SHIFT}° of the hue its name describes.
              </td>
            </tr>
            <tr>
              <td>season</td>
              <td>
                {f().season}: lightness {mood().apparent >= 0 ? "+" : ""}
                {mood().apparent}, chroma {mood().chroma >= 0 ? "+" : ""}
                {mood().chroma}, hues pulled up to {mood().lean}° towards {mood().pole}°. Prefers the season's own inks, and avoids inks another season already chose for the same accent.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>
          <span class="kanji">測</span> The measurements
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
            <figcaption>Contrast with the background. The line marks each accent's minimum.</figcaption>
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
            <figcaption>Apparent lightness. The grey band is each accent's target range.</figcaption>
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
              line={{ at: harmony().chroma + mood().chroma, label: "target" }}
            />
            <figcaption>Chroma. The dashed line is this theme's target.</figcaption>
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
            <figcaption>How different the seasons are: the average colour difference (ΔE) between their accents.</figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}
