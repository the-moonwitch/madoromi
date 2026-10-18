import { For, Show } from "solid-js";
import { contrast } from "../../core/color";
import { ACCENTS, MODES, NEUTRALS, SEASONS, harmonyOf, type Flavour } from "../../core/palette";
import type { Ramp } from "../../core/summary";
import { inks } from "../../inks";
import { choose } from "../../theme";
import { spriteStyle, type Sprite } from "../Palette";
import { Story } from "./Colours";
import { EditorDemo, InterfaceDemo, TerminalDemo } from "./Demo";

const LADDER = ["chitsu", "hyoshi", "kami", "nijimi0", "nijimi1", "nijimi2", "kasure0", "kasure1", "kasure2", "usuzumi0", "usuzumi1", "sumi"];
const kanjiOf = (ink: string) => inks.find((i) => i.id === ink)?.kanji;

export interface LandingProps {
  flavour: Flavour;
  family: Flavour[];
  sprite: (id: string) => Sprite | undefined;
  ramp: (id: string) => Ramp | undefined;
  go: (page: string) => void;
}

/** What madoromi is: choose a flavour, see it at work, then how it's made. */
export function Landing(props: LandingProps) {
  const link = (page: string, text: string) => (
    <a class="m-cta" href={`#${page}`} onClick={(e) => (e.preventDefault(), props.go(page))}>
      {text}
    </a>
  );
  const accentInks = () => [...new Set(ACCENTS.map((a) => props.flavour.colours[a.key].ink))];
  const harmony = () => harmonyOf(props.flavour);
  const legibility = () => Math.min(...ACCENTS.map((a) => contrast(props.flavour.colours[a.key].lab, props.flavour.colours.kami.lab)));
  const fuji = () => props.flavour.colours.fuji;

  return (
    <main class="m-landing">
      <header class="m-hero">
        <span class="deco kanji">微睡</span>
        <div>
          <h2>Colour themes made from fountain pen inks</h2>
          <p>Eight themes: each season, by day and by night. For terminals, code editors and the web.</p>
          <div class="m-ctas">
            {link("palettes/ports", "install")}
            {link("palettes/colours", "colours")}
            {link("palettes/guide", "style guide")}
          </div>
        </div>
      </header>

      <section class="m-family" aria-label="flavours">
        <ul>
          <For each={props.family}>
            {(f) => {
              const s = SEASONS.find((x) => x.id === f.season)!;
              const m = MODES.find((x) => x.id === f.mode)!;
              return (
                <li>
                  <button
                    classList={{ on: f.id === props.flavour.id }}
                    aria-pressed={f.id === props.flavour.id}
                    aria-label={`${f.id} (${s.english} ${m.english})`}
                    style={{ background: f.colours.kami.hex, color: f.colours.sumi.hex }}
                    onClick={() => choose({ season: f.season, mode: f.mode })}
                  >
                    <span class="kanji">{s.kanji + m.kanji}</span>
                    <span class="name">{f.id}</span>
                    <span class="dots" aria-hidden="true">
                      <For each={ACCENTS}>{(a) => <i style={{ background: f.colours[a.key].hex }} />}</For>
                    </span>
                    <span class="dots ladder" aria-hidden="true">
                      <For each={LADDER.filter((k) => NEUTRALS.some((n) => n.key === k))}>{(k) => <i style={{ background: f.colours[k].hex }} />}</For>
                    </span>
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
      </section>

      <section class="m-demo">
        <EditorDemo />
        <div class="m-demo-row">
          <TerminalDemo />
          <InterfaceDemo season={props.flavour.season} mode={props.flavour.mode} />
        </div>
      </section>

      <section class="m-about">
        <article>
          <figure class="m-strokes">
            <For each={accentInks().slice(0, 8)}>{(id) => <Show when={props.sprite(id)}>{(sp) => <span class="stroke" style={spriteStyle(sp())} />}</Show>}</For>
          </figure>
          <h3>iroshizuku 色雫</h3>
          <p>
            Forty Pilot Iroshizuku inks were scanned on paper and measured, from the darkest stroke to the palest wash.{" "}
            <a href="#" onClick={(e) => (e.preventDefault(), props.go(""))}>
              See the inks
            </a>
          </p>
        </article>
        <article>
          <figure class="m-dilution">
            <Story ramp={props.ramp(fuji().ink)} L={fuji().L} stroke={undefined} />
          </figure>
          <h3>usume 薄め</h3>
          <p>
            Every accent colour is one of those inks, diluted. In {props.flavour.id}, fuji is {fuji().ink} ({kanjiOf(fuji().ink)}) at lightness{" "}
            {fuji().L.toFixed(2)}.
          </p>
        </article>
        <article>
          <figure class="m-papers">
            <For each={SEASONS}>
              {(s) => {
                const f = () => props.family.find((x) => x.id === `${s.id}-${props.flavour.mode}`)!;
                return (
                  <span style={{ background: f().colours.kami.hex, color: f().colours.sumi.hex }} classList={{ on: s.id === props.flavour.season }}>
                    {s.kanji}
                  </span>
                );
              }}
            </For>
          </figure>
          <h3>shiki 四季</h3>
          <p>Each season has its own character: spring is soft, summer clear, autumn deep, winter muted. Each one's background is tinted by a grey ink.</p>
        </article>
        <article>
          <figure class="m-measures">
            <span>
              <b>{legibility().toFixed(1)}:1</b> lowest contrast
            </span>
            <span>
              <b>±{harmony().apparent.sd.toFixed(2)}</b> spread in brightness
            </span>
            <span>
              <b>{Math.round(harmony().gamut * 100)}%</b> of screen colour
            </span>
          </figure>
          <h3>hakaru 測る</h3>
          <p>
            Colours are picked by measurement: readable on the background, evenly bright, and within what screens can show.{" "}
            <a href="#palettes/method" onClick={(e) => (e.preventDefault(), props.go("palettes/method"))}>
              How it works
            </a>
          </p>
        </article>
      </section>
    </main>
  );
}
