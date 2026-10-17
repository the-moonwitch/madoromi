import { For } from "solid-js";
import { ANSI_NAMES, BRIGHT_STEP, GUIDE, ansiSlots, slotKanji, slotName, slotOf } from "../../core/guide";
import type { Flavour } from "../../core/palette";

/** Which colour each thing is drawn in, shown in the chosen flavour. */
export function Guide(props: { flavour: Flavour }) {
  const chip = (key: string) => {
    const slot = slotOf(key);
    return (
      <span class="m-chip">
        <span class="m-swatch" style={{ background: props.flavour.colours[slot].hex }} />
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
          <p>Which colour each thing is drawn in. The names are the same in every flavour; the ports follow this.</p>
        </div>
      </header>
      <nav class="m-toc">
        <For each={GUIDE}>{(s) => <a href={`#palettes/guide`} onClick={(e) => (e.preventDefault(), document.getElementById(`g-${s.id}`)?.scrollIntoView({ behavior: "smooth" }))}>{s.title}</a>}</For>
        <a href="#palettes/guide" onClick={(e) => (e.preventDefault(), document.getElementById("g-ansi")?.scrollIntoView({ behavior: "smooth" }))}>
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
        <p class="m-note">Bright colours are the same ink as their normal colour, read {BRIGHT_STEP} further from the paper.</p>
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
