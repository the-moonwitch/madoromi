import { createEffect, createMemo, For, Match, onCleanup, Show, Switch } from "solid-js";
import { Portal } from "solid-js/web";
import { ACCENTS, MODES, NEUTRALS, SEASONS, buildFamily, type Flavour } from "../../core/palette";
import type { Ramp } from "../../core/summary";
import type { Sprite } from "../Palette";
import { Colours } from "./Colours";
import { Guide } from "./Guide";
import { Landing } from "./Landing";
import { Ports } from "./Ports";
import { choose, flavourChoice, flavourId } from "./store";
import "./palettes.css";

export interface SiteProps {
  page: string;
  ramps: Map<string, Ramp>;
  ready: boolean;
  sprite: (id: string) => Sprite | undefined;
  go: (page: string) => void;
}

/**
 * The palettes' pages, shown in the chosen flavour: the whole page takes its paper and ink, and
 * every colour is a custom property (--m-<slot>, --m-ansi-<n>).
 */
export function Site(props: SiteProps) {
  const family = createMemo(() => (props.ready ? buildFamily(props.ramps) : []));
  const flavour = createMemo(() => family().find((f) => f.id === flavourId()));
  createEffect(() => {
    const f = flavour();
    if (f) theme(f);
  });
  onCleanup(untheme);

  return (
    <div class="madoromi">
      <Show when={document.getElementById("masthead-tools")}>
        {(at) => (
          <Portal mount={at()}>
            <Picker family={family()} />
          </Portal>
        )}
      </Show>
      <Show when={flavour()}>
        {(f) => (
          <Switch>
            <Match when={props.page === "palettes/colours"}>
              <Colours flavour={f()} family={family()} sprite={props.sprite} go={props.go} />
            </Match>
            <Match when={props.page === "palettes/guide"}>
              <Guide flavour={f()} />
            </Match>
            <Match when={props.page === "palettes/ports"}>
              <Ports flavour={f()} family={family()} />
            </Match>
            <Match when={true}>
              <Landing flavour={f()} family={family()} go={props.go} />
            </Match>
          </Switch>
        )}
      </Show>
    </div>
  );
}

/** Season and time of day; each button wears its own flavour. */
function Picker(props: { family: Flavour[] }) {
  const swatchOf = (id: string) => props.family.find((f) => f.id === id);
  return (
    <div class="picker" role="group" aria-label="flavour">
      <For each={SEASONS}>
        {(s) => {
          const f = () => swatchOf(`${s.id}-${flavourChoice().mode}`);
          return (
            <button
              classList={{ on: flavourChoice().season === s.id }}
              style={f() ? { background: f()!.colours.kami.hex, color: f()!.colours.sumi.hex } : {}}
              title={s.english}
              onClick={() => choose({ season: s.id })}
            >
              <span class="kanji">{s.kanji}</span>
              <span>{s.id}</span>
            </button>
          );
        }}
      </For>
      <span class="picker-gap" />
      <For each={MODES}>
        {(m) => (
          <button classList={{ on: flavourChoice().mode === m.id }} title={m.english} onClick={() => choose({ mode: m.id })}>
            <span class="kanji">{m.kanji}</span>
            <span>{m.id}</span>
          </button>
        )}
      </For>
    </div>
  );
}

const SITE_VARS = ["--paper", "--ink", "--dim", "--faint", "--hair"];
const slotVars = () => [...ACCENTS, ...NEUTRALS].map((s) => `--m-${s.key}`).concat(Array.from({ length: 16 }, (_, i) => `--m-ansi-${i}`));

function theme(f: Flavour) {
  const root = document.documentElement.style;
  const c = (k: string) => f.colours[k].hex;
  // The site's own colours, so the masthead and everything else follow.
  root.setProperty("--paper", c("kami"));
  root.setProperty("--ink", c("sumi"));
  root.setProperty("--dim", c("usuzumi0"));
  root.setProperty("--faint", c("kasure0"));
  root.setProperty("--hair", c("nijimi0"));
  root.setProperty("color-scheme", f.mode === "yoru" ? "dark" : "light");
  for (const s of [...ACCENTS, ...NEUTRALS]) root.setProperty(`--m-${s.key}`, c(s.key));
  f.ansi.forEach((s, i) => root.setProperty(`--m-ansi-${i}`, s.hex));
}

function untheme() {
  const root = document.documentElement.style;
  for (const v of [...SITE_VARS, ...slotVars(), "color-scheme"]) root.removeProperty(v);
}
