import { createMemo, createSignal, For, Show } from "solid-js";
import type { Flavour } from "../../core/palette";
import { GROUPS, PORTS, portFiles, portFolder, step, type Port } from "../../ports";
import { zip } from "../../ports/zip";

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
  const [copied, setCopied] = createSignal(false);
  const copyCommand = (text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  const path = () => props.port.file?.(props.flavour);
  const text = () => (path() ? props.files[path()!] : undefined);
  const name = () => path()?.split("/").pop();
  const save = (name: string, data: BlobPart, type: string) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const download = () => save(name()!, text()!.endsWith("\n") ? text()! : text() + "\n", "text/plain");
  /** Every flavour at once, where each has its own file; the whole folder where it's more than one. */
  const folder = () => {
    if (props.port.dir === "." || (props.port.file && props.port.file({ id: "a" }) === props.port.file({ id: "b" }))) return;
    return portFolder(props.port, props.files);
  };
  const downloadFolder = () => {
    const f = folder()!;
    save(f.name, zip(f.files) as BlobPart, "application/zip");
  };
  return (
    <article class="m-card">
      <h4>{props.port.name}</h4>
      <ol>
        <For each={props.port.install}>{(s) => <li>{rich(step(s, props.flavour))}</li>}</For>
      </ol>
      <Show when={props.port.command}>
        {(c) => (
          <div class="m-command">
            <code>{step(c(), props.flavour)}</code>
            <button class="link" onClick={() => copyCommand(step(c(), props.flavour))} aria-label={`copy the ${props.port.name} install command`}>
              {copied() ? "copied" : "copy"}
            </button>
          </div>
        )}
      </Show>
      <div class="m-card-actions">
        <Show when={text()}>
          <button class="m-cta" onClick={download}>
            {name()}
          </button>
        </Show>
        <Show when={folder()}>
          {(f) => (
            <button class={text() ? "link" : "m-cta"} onClick={downloadFolder}>
              {text() ? "every flavour (.zip)" : f().name}
            </button>
          )}
        </Show>
        <Show when={text()}>
          <button class="link" onClick={() => setOpen(!open())}>
            {open() ? "hide" : "show"}
          </button>
        </Show>
      </div>
      <Show when={open() && text()}>
        <pre class="m-file">{text()!.length > 6000 ? text()!.slice(0, 6000) + "\n…" : text()}</pre>
      </Show>
    </article>
  );
}
