import { createMemo, createSignal, For, Show } from "solid-js";
import type { Flavour } from "../../core/palette";
import { GROUPS, PORTS, RELEASE, VSIX, portFiles, portFolder, step, type Port } from "../../ports";
import { zip } from "../../ports/zip";

/** Backticks as code. */
export const rich = (text: string) => text.split("`").map((part, i) => (i % 2 ? <code>{part}</code> : part));

/** Hands the browser a file to save. */
export function save(filename: string, data: BlobPart, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Every port: how to install it for the chosen theme, and its files. */
export function Ports(props: { flavour: Flavour; family: Flavour[] }) {
  const files = createMemo(() => portFiles(props.family));
  return (
    <main class="m-page m-ports">
      <header class="m-title">
        <span class="deco kanji">移植</span>
        <div>
          <h2>ports</h2>
          <p>How to install {props.flavour.id}. To get another theme, pick it at the top of the page.</p>
        </div>
      </header>
      <For each={GROUPS}>
        {(g) => (
          <section>
            <h3>{g.name}</h3>
            <ul class="m-port-list">
              <For each={PORTS.filter((p) => p.group === g.id)}>{(p) => <PortRow port={p} flavour={props.flavour} files={files()} />}</For>
            </ul>
          </section>
        )}
      </For>
    </main>
  );
}

function PortRow(props: { port: Port; flavour: Flavour; files: Record<string, string> }) {
  const [open, setOpen] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const code = () => {
    const c = props.port.command ?? props.port.snippet?.text;
    return c ? step(c, props.flavour) : undefined;
  };
  const copy = () =>
    navigator.clipboard?.writeText(code()!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  const path = () => props.port.file?.(props.flavour);
  const text = () => (path() ? props.files[path()!] : undefined);
  const name = () => path()?.split("/").pop();
  /** Every theme at once, where each has its own file; the whole folder where it's several. */
  const folder = () => {
    if (props.port.dir === "." || (props.port.file && props.port.file({ id: "a" }) === props.port.file({ id: "b" }))) return;
    return portFolder(props.port, props.files);
  };

  return (
    <li class="m-port">
      <h4>{props.port.name}</h4>
      <div class="m-port-body">
        <ol>
          <For each={props.port.install}>{(s) => <li>{rich(step(s, props.flavour))}</li>}</For>
        </ol>
        <Show when={code()}>
          {(c) => (
            <div class="m-command">
              <pre>
                <code>{c()}</code>
              </pre>
              <button class="link" onClick={copy} aria-label={`copy the ${props.port.name} ${props.port.command ? "command" : "snippet"}`}>
                {copied() ? "copied" : "copy"}
              </button>
            </div>
          )}
        </Show>
        <p class="m-port-files">
          <Show when={text()}>
            <button class="link" onClick={() => save(name()!, text()!.endsWith("\n") ? text()! : text() + "\n", "text/plain")}>
              {name()}
            </button>
          </Show>
          <Show when={props.port.id === "vscode"}>
            <a class="link" href={`${RELEASE}/${VSIX}`}>
              {VSIX}
            </a>
          </Show>
          <Show when={folder()}>
            {(f) => (
              <button class="link" onClick={() => save(f().name, zip(f().files) as BlobPart, "application/zip")}>
                {text() ? "all themes (.zip)" : f().name}
              </button>
            )}
          </Show>
          <Show when={text()}>
            <button class="link" onClick={() => setOpen(!open())} aria-expanded={open()}>
              {open() ? "hide file" : "show file"}
            </button>
          </Show>
        </p>
        <Show when={open() && text()}>
          <pre class="m-file">{text()!.length > 6000 ? text()!.slice(0, 6000) + "\n…" : text()}</pre>
        </Show>
      </div>
    </li>
  );
}
