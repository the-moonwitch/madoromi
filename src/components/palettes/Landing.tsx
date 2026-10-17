import { For } from "solid-js";
import { ACCENT_CONTRAST, ACCENTS, MODES, NEUTRALS, SEASONS, type Flavour } from "../../core/palette";
import { inks } from "../../inks";
import { EditorDemo, InterfaceDemo, TerminalDemo } from "./Demo";
import { choose } from "./store";

const LADDER = ["chitsu", "hyoshi", "kami", "nijimi0", "nijimi1", "nijimi2", "kasure0", "kasure1", "kasure2", "usuzumi0", "usuzumi1", "sumi"];
const kanjiOf = (ink: string) => inks.find((i) => i.id === ink)?.kanji;

/** What madoromi is, in the flavour chosen: a working editor and terminal, then how it's made. */
export function Landing(props: { flavour: Flavour; family: Flavour[]; go: (page: string) => void }) {
  const season = () => SEASONS.find((s) => s.id === props.flavour.season)!;
  const link = (page: string, text: string) => (
    <a class="m-cta" href={`#${page}`} onClick={(e) => (e.preventDefault(), props.go(page))}>
      {text}
    </a>
  );
  return (
    <main class="m-landing">
      <header class="m-hero">
        <span class="deco kanji">微睡</span>
        <div>
          <h2>colour themes made of fountain pen inks</h2>
          <p>four seasons, by day and by night; for terminals, editors and the web</p>
          <div class="m-ctas">
            {link("palettes/ports", "install")}
            {link("palettes/colours", "colours")}
            {link("palettes/guide", "style guide")}
          </div>
        </div>
      </header>

      <section class="m-demo">
        <EditorDemo />
        <div class="m-demo-row">
          <TerminalDemo />
          <InterfaceDemo />
        </div>
      </section>

      <section class="m-about">
        <article>
          <h3>
            <span class="kanji">色雫</span> iroshizuku
          </h3>
          <p>
            Forty of Pilot's iroshizuku inks, scanned on paper. Each is traced from its densest stroke to its palest wash: a ramp of every strength the
            ink can take.{" "}
            <a href="#" onClick={(e) => (e.preventDefault(), props.go(""))}>
              the inks
            </a>
          </p>
        </article>
        <article>
          <h3>
            <span class="kanji">薄め</span> usume
          </h3>
          <p>
            Every accent is one ink, diluted to the strength its role needs: {props.flavour.id}'s{" "}
            <For each={["fuji", "wakaba", "ai"]}>
              {(k, i) => (
                <>
                  {i() ? (i() === 2 ? " and " : ", ") : ""}
                  <span style={{ color: `var(--m-${k})` }}>{ACCENTS.find((a) => a.key === k)!.name}</span> is {props.flavour.colours[k].ink}{" "}
                  <span class="kanji">{kanjiOf(props.flavour.colours[k].ink)}</span>
                </>
              )}
            </For>
            . The neutrals are greys in the cast of the season's grey ink, {season().grey} <span class="kanji">{kanjiOf(season().grey)}</span>.
          </p>
        </article>
        <article>
          <h3>
            <span class="kanji">四季</span> shiki
          </h3>
          <p>
            Four seasons, each by day (hiru <span class="kanji">昼</span>) and by night (yoru <span class="kanji">夜</span>). Each prefers its own inks and
            reads them at its own strength: spring softer, summer clear, autumn deep, winter muted.
          </p>
        </article>
        <article>
          <h3>
            <span class="kanji">測る</span> hakaru
          </h3>
          <p>
            Accents are chosen by measure: legible on the paper ({ACCENT_CONTRAST.hiru}:1 by day, {ACCENT_CONTRAST.yoru}:1 by night), equally bright to
            the eye once their colour is counted, and clear of the edge of sRGB.
          </p>
        </article>
      </section>

      <section class="m-family">
        <h3>
          <span class="kanji">八</span> eight flavours
        </h3>
        <ul>
          <For each={props.family}>
            {(f) => {
              const s = SEASONS.find((x) => x.id === f.season)!;
              const m = MODES.find((x) => x.id === f.mode)!;
              return (
                <li>
                  <button
                    classList={{ on: f.id === props.flavour.id }}
                    style={{ background: f.colours.kami.hex, color: f.colours.sumi.hex }}
                    onClick={() => choose({ season: f.season, mode: f.mode })}
                  >
                    <span class="kanji">{s.kanji + m.kanji}</span>
                    <span class="name">{f.id}</span>
                    <span class="dots">
                      <For each={ACCENTS}>{(a) => <i style={{ background: f.colours[a.key].hex }} />}</For>
                    </span>
                    <span class="dots ladder">
                      <For each={LADDER.filter((k) => NEUTRALS.some((n) => n.key === k))}>{(k) => <i style={{ background: f.colours[k].hex }} />}</For>
                    </span>
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
      </section>
    </main>
  );
}
