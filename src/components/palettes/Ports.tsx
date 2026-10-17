import { createMemo, createSignal, For, Show } from "solid-js";
import type { Flavour } from "../../core/palette";
import { GROUPS, PORTS, portFiles, step, type Port } from "../../ports";

/** Backticks as code. */
const rich = (text: string) => text.split("`").map((part, i) => (i % 2 ? <code>{part}</code> : part));

/** Every port, with how to install it and its file for the chosen flavour. */
export function Ports(props: { flavour: Flavour; family: Flavour[] }) {
  const files = createMemo(() => portFiles(props.family));
  return (
    <main class="m-page m-ports">
      <header class="m-title">
        <span class="deco kanji">移植</span>
        <div>
          <h2>ports</h2>
          <p>Shown for {props.flavour.id}; choose another flavour above. Every port also lives under palettes/ in the repository.</p>
        </div>
      </header>
      <For each={GROUPS}>
        {(g) => (
          <section>
            <h3>{g.name}</h3>
            <div class="m-cards">
              <For each={PORTS.filter((p) => p.group === g.id)}>{(p) => <PortCard port={p} flavour={props.flavour} files={files()} />}</For>
            </div>
          </section>
        )}
      </For>
    </main>
  );
}

function PortCard(props: { port: Port; flavour: Flavour; files: Record<string, string> }) {
  const [open, setOpen] = createSignal(false);
  const path = () => props.port.file?.(props.flavour);
  const text = () => (path() ? props.files[path()!] : undefined);
  const name = () => path()?.split("/").pop();
  const download = () => {
    const url = URL.createObjectURL(new Blob([text()!.endsWith("\n") ? text()! : text() + "\n"], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name()!;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <article class="m-card">
      <h4>{props.port.name}</h4>
      <ol>
        <For each={props.port.install}>{(s) => <li>{rich(step(s, props.flavour))}</li>}</For>
      </ol>
      <Show when={text()} fallback={<p class="m-note">palettes/{props.port.dir}/</p>}>
        <div class="m-card-actions">
          <button class="m-cta" onClick={download}>
            {name()}
          </button>
          <button class="link" onClick={() => setOpen(!open())}>
            {open() ? "hide" : "show"}
          </button>
        </div>
        <Show when={open()}>
          <pre class="m-file">{text()!.length > 6000 ? text()!.slice(0, 6000) + "\n…" : text()}</pre>
        </Show>
      </Show>
    </article>
  );
}
