import { For } from "solid-js";
import { ANSI_NAMES, BRIGHT_STEP, GUIDE, ansiSlots, slotKanji, slotName, slotOf, type GuideRow } from "../../core/guide";
import type { Flavour } from "../../core/palette";

/** Scrolls to a section, gently unless motion is to be kept down. */
const jump = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

/** Which colour each thing is drawn in, shown in the chosen flavour. */
export function Guide(props: { flavour: Flavour }) {
  const chip = (key: string) => {
    const slot = slotOf(key);
    return (
      <span class="m-chip">
        <span class="m-swatch" aria-hidden="true" style={{ background: props.flavour.colours[slot].hex }} />
        <b>{slotName(slot)}</b> <span class="kanji">{slotKanji(slot)}</span>
      </span>
    );
  };
  return (
    <main class="m-page m-guide">
      <header class="m-title">
        <span class="deco kanji">手引</span>
        <div>
          <h2>style guide</h2>
          <p>Which colour to use for each part of an interface or of code. The names are the same in every theme.</p>
        </div>
      </header>
      <nav class="m-toc">
        <For each={GUIDE}>{(s) => <a href={`#palettes/guide`} onClick={(e) => (e.preventDefault(), jump(`g-${s.id}`))}>{s.title}</a>}</For>
        <a href="#palettes/guide" onClick={(e) => (e.preventDefault(), jump("g-ansi"))}>
          ansi
        </a>
      </nav>
      <For each={GUIDE}>
        {(s) => (
          <section id={`g-${s.id}`}>
            <h3>
              <span class="kanji">{s.kanji}</span> {s.title}
            </h3>
            <table class="m-table">
              <tbody>
                <For each={s.rows}>
                  {(r) => (
                    <tr>
                      <td class="m-use">{r.use}</td>
                      <td class="m-chips">
                        <For each={r.colours}>{chip}</For>
                      </td>
                      <td class="m-preview">
                        <Preview row={r} flavour={props.flavour} />
                      </td>
                      <td class="m-note">{r.note}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </section>
        )}
      </For>
      <section id="g-ansi">
        <h3>
          <span class="kanji">色</span> ansi
        </h3>
        <p class="m-note">Bright colours use the same ink as the normal colour, {BRIGHT_STEP} further from the background in lightness.</p>
        <table class="m-table">
          <tbody>
            <For each={ansiSlots(props.flavour)}>
              {(a, i) => (
                <tr>
                  <td class="m-use">
                    {i()} {i() < 8 ? ANSI_NAMES[i()] : `bright ${ANSI_NAMES[i() - 8]}`}
                  </td>
                  <td class="m-chips">
                    <span class="m-chip">
                      <span class="m-swatch" style={{ background: props.flavour.ansi[i()].hex }} />
                      <b>{slotName(a.key)}</b> <span class="kanji">{slotKanji(a.key)}</span>
                    </span>
                  </td>
                  <td class="m-note">{a.brighter ? "stronger" : ""}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </section>
    </main>
  );
}

/** A guide row's colour in use. */
function Preview(props: { row: GuideRow; flavour: Flavour }) {
  const hex = (key: string) => props.flavour.colours[slotOf(key)].hex;
  const r = () => props.row;
  const first = () => hex(r().colours[0]);
  const wash = (key: string, a: number) => `color-mix(in srgb, ${hex(key)} ${Math.round(a * 100)}%, transparent)`;
  switch (r().preview) {
    case "fill":
      return (
        <span class="pv-fills">
          <For each={r().colours}>{(k) => <span class="pv-fill" style={{ background: hex(k) }} />}</For>
        </span>
      );
    case "onAccent":
      return (
        <span class="pv-pill" style={{ background: hex("accent"), color: first() }}>
          {r().sample}
        </span>
      );
    case "wash": {
      const ground = r().ground ?? r().colours[0];
      const text = r().ground || ["added", "deleted"].includes(r().colours[0]) ? first() : hex("sumi");
      return (
        <span class="pv-wash" style={{ background: wash(ground, r().alpha ?? 0.2), color: text, "box-shadow": r().colours[1] ? `inset 0 0 0 1px ${hex(r().colours[1])}` : undefined }}>
          {r().sample}
        </span>
      );
    }
    case "caret":
      return (
        <span class="pv-text" style={{ color: hex("sumi") }}>
          {r().sample}
          <span class="pv-caret" style={{ background: hex("cursor") }} />
        </span>
      );
    case "gutter":
      return (
        <span class="pv-gutter">
          <For each={r().colours}>{(k) => <i style={{ background: hex(k) }} />}</For>
          <span style={{ color: hex("sumi") }}>ramp</span>
        </span>
      );
    case "rainbow": {
      const chars = [...(r().sample ?? "")];
      const open = chars.filter((c) => c === "(").length;
      return (
        <span class="pv-text">
          <For each={chars}>
            {(c, i) => {
              const depth = c === "(" ? i() : c === ")" ? chars.length - 1 - i() : 0;
              return <span style={{ color: c.trim() ? hex(r().colours[Math.min(depth, open - 1) % r().colours.length]) : undefined }}>{c}</span>;
            }}
          </For>
        </span>
      );
    }
    default:
      return (
        <span class="pv-texts">
          <For each={r().colours}>
            {(k) => (
              <span class="pv-text" style={{ color: hex(k), "font-style": r().note === "italic" ? "italic" : undefined, "font-weight": r().note === "bold" ? 700 : undefined }}>
                {r().sample}
              </span>
            )}
          </For>
        </span>
      );
  }
}
