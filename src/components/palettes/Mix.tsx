import { createMemo, createSignal, For, Show } from "solid-js";
import { HARMONIES, harmonyInks, mixFamily, mixName, type Harmony } from "../../core/mix";
import { ACCENTS, NEUTRALS, type Flavour } from "../../core/palette";
import type { Ramp } from "../../core/summary";
import { inks } from "../../inks";
import { PORTS, portFiles, portFolder, step, vsixFiles, type Port } from "../../ports";
import { zip } from "../../ports/zip";
import { spriteStyle, type Sprite } from "../Palette";
import { EditorDemo, InterfaceDemo, TerminalDemo } from "./Demo";
import { rich, save } from "./Ports";

const MAX_CHOSEN = 4;
const INK = new Map(inks.map((i) => [i.id, i]));
/** The mixer's address: #palettes/mix/<ink,ink>/<harmony>. */
const ROUTE = "palettes/mix";
const LADDER = ["chitsu", "hyoshi", "kami", "nijimi0", "nijimi1", "nijimi2", "kasure0", "kasure1", "kasure2", "usuzumi0", "usuzumi1", "sumi"];

/** A palette mixed from inks you choose, in a harmony: shown at work, and ready to install. */
export function Mix(props: {
  page: string;
  flavour: Flavour;
  order: string[];
  ramp: (id: string) => Ramp | undefined;
  sprite: (id: string) => Sprite | undefined;
}) {
  const [, given, givenHarmony] = props.page.slice(ROUTE.length).split("/");
  const [chosen, setChosen] = createSignal<string[]>(given ? given.split(",").filter((id) => INK.has(id)).slice(0, MAX_CHOSEN) : ["tsuki-yo", "hana-ikada"]);
  const [harmony, setHarmony] = createSignal<Harmony>(HARMONIES.some((h) => h.id === givenHarmony) ? (givenHarmony as Harmony) : "complementary");

  // The address follows the choice, so a mix can be shared (without a history entry per click).
  const remember = () => history.replaceState(null, "", `#${ROUTE}/${chosen().join(",")}/${harmony()}`);
  const toggle = (id: string) => {
    const now = chosen();
    setChosen(now.includes(id) ? now.filter((x) => x !== id) : now.length < MAX_CHOSEN ? [...now, id] : now);
    remember();
  };
  const pick = (h: Harmony) => {
    setHarmony(h);
    remember();
  };

  // A harmony looks through every ink, so the mix waits until all their ramps are in.
  const views = createMemo(() => {
    const ramps = props.order.map((id) => [id, props.ramp(id)] as const);
    return ramps.every(([, r]) => r) ? new Map(ramps as [string, Ramp][]) : undefined;
  });
  const family = createMemo(() => (views() && chosen().length ? mixFamily(views()!, chosen(), harmony()) : []));
  const added = createMemo(() => (views() && chosen().length ? harmonyInks(views()!, chosen(), harmony()).slice(chosen().length) : []));
  /** The mix in the site's mode, day or night. */
  const shown = () => family().find((f) => f.mode === props.flavour.mode);
  const distinct = (f: Flavour) => new Set(ACCENTS.map((a) => f.colours[a.key].hex)).size;

  /** The mix's colours as the custom properties the demos draw with, on their own block. */
  const vars = (f: Flavour) => ({
    ...Object.fromEntries([...ACCENTS, ...NEUTRALS].map((s) => [`--m-${s.key}`, f.colours[s.key].hex])),
    ...Object.fromEntries(f.ansi.map((c, i) => [`--m-ansi-${i}`, c.hex])),
  });
  const name = () => `madoromi-${mixName(chosen(), harmony())}`;
  const files = createMemo(() => portFiles(family(), name()));
  const file = (path: string) => ({ label: path.split("/").pop()!, save: () => save(path.split("/").pop()!, files()[path].replace(/\n?$/, "\n")) });
  const archive = (filename: string, contents: Record<string, string>, type = "application/zip") => ({ label: filename, save: () => save(filename, zip(contents) as BlobPart, type) });
  /** What to download for a port: each flavour's file, the one file that has both, or the folder. */
  const downloads = (p: Port) => {
    if (p.id === "vscode") return [archive(`${name()}.vsix`, vsixFiles(files()), "application/vsix")];
    if (!p.file) return [archive(portFolder(p, files(), name()).name, portFolder(p, files(), name()).files)];
    const paths = [...new Set(family().map((m) => p.file!(m, name())))];
    return paths.map(file);
  };

  return (
    <main class="m-page m-mix">
      <header class="m-title">
        <span class="deco kanji">調合</span>
        <div>
          <h2>mix</h2>
          <p>Choose up to four inks and a harmony. You get a palette for day and for night, made by the same rules as the eight madoromi themes, from those inks only.</p>
        </div>
      </header>

      <section>
        <h3>inks</h3>
        <ul class="m-mix-inks">
          <For each={props.order}>
            {(id) => {
              const on = () => chosen().includes(id);
              return (
                <li>
                  <button classList={{ on: on(), added: added().includes(id) }} aria-pressed={on()} onClick={() => toggle(id)} title={INK.get(id)?.english}>
                    <Show when={props.sprite(id)}>{(sp) => <span class="stroke" style={spriteStyle(sp())} />}</Show>
                    <span>{id}</span>
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
        <p class="m-note">Chosen inks are underlined. Inks the harmony adds are marked with a dot.</p>
      </section>

      <section>
        <h3>harmony</h3>
        <div class="m-mix-harmonies" role="group" aria-label="harmony">
          <For each={HARMONIES}>
            {(h) => (
              <button classList={{ on: harmony() === h.id }} aria-pressed={harmony() === h.id} onClick={() => pick(h.id)}>
                {h.name}
              </button>
            )}
          </For>
        </div>
        <p class="m-note">{HARMONIES.find((h) => h.id === harmony())!.text}</p>
      </section>

      <Show when={shown()} fallback={<p class="m-note">{views() ? "Choose an ink to start." : "Loading the inks…"}</p>}>
        {(f) => (
          <>
            <section class="m-demo" style={vars(f())}>
              <EditorDemo />
              <div class="m-demo-row">
                <TerminalDemo />
                <InterfaceDemo season="mix" mode={f().mode} />
              </div>
            </section>

            <section>
              <h3>colours</h3>
              <p class="m-note">
                {props.flavour.mode === "yoru" ? "Night" : "Day"}, as the switch at the top of the page shows. {distinct(f())} distinct accents
                {distinct(f()) < ACCENTS.length ? ": these inks have only so many legible strengths, so some accents share a colour." : "."}
              </p>
              <ul class="m-mix-accents">
                <For each={ACCENTS}>
                  {(a) => (
                    <li>
                      <span class="m-swatch" style={{ background: f().colours[a.key].hex }} />
                      <b>{a.name}</b>
                      <code>{f().colours[a.key].hex}</code>
                      <span class="m-at">
                        {f().colours[a.key].ink} {f().colours[a.key].L.toFixed(2)}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
              <div class="m-mix-ladder" aria-hidden="true">
                <For each={LADDER}>{(k) => <i style={{ background: f().colours[k].hex }} title={k} />}</For>
              </div>
            </section>

            <section>
              <h3>install</h3>
              <p class="m-note">Each download has the mix by day and by night, named {name()}, so it sits beside the madoromi themes rather than replacing them.</p>
              <ul class="m-port-list">
                <For each={PORTS}>
                  {(p) => (
                    <li class="m-port">
                      <h4>{p.name}</h4>
                      <div class="m-port-body">
                        <ol>
                          <For each={p.manual}>{(s) => <li>{rich(step(s, f()))}</li>}</For>
                        </ol>
                        <p class="m-port-files">
                          <For each={downloads(p)}>
                            {(d) => (
                              <button class="link" onClick={d.save}>
                                {d.label}
                              </button>
                            )}
                          </For>
                        </p>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
              <p class="m-note">Or write them all from a copy of the repository:</p>
              <div class="m-command">
                <pre>
                  <code>{`bun run mix ${chosen().join(" ")} --harmony ${harmony()}`}</code>
                </pre>
              </div>
            </section>
          </>
        )}
      </Show>
    </main>
  );
}
