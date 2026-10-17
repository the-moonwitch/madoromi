import { createEffect, createMemo, For } from "solid-js";
import { oklabToHex } from "../core/color";
import { SHEET_COLUMNS, TABLE_STROKE, type Ramp } from "../core/summary";
import type { Ink } from "../inks";
import { Stroke } from "./Stroke";

/** Where an ink's prerendered stroke sits on the stroke sheet. */
export interface Sprite {
  url: string;
  index: number;
  rows: number;
}

/**
 * Every ink as a brush stroke, in the order of the shortest loop through their ramps: a centred
 * flowing sheet when browsing, a one-wide list beside an open ink.
 */
export function Palette(props: {
  inks: Ink[];
  order: string[];
  ramp: (id: string) => Ramp | undefined;
  sprite: (id: string) => Sprite | undefined;
  mode: "grid" | "list";
  selected: string;
  hovered: string;
  onHover: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(props.inks.map((i) => [i.id, i]));
  const cells = new Map<string, HTMLLIElement>();
  let host!: HTMLOListElement;
  // In the list, keep the open ink in view: centred down the column, or across the row on narrow
  // screens. Only the list itself scrolls, never the page.
  createEffect(() => {
    void props.order.length; // and again once the inks have arrived
    const el = props.mode === "list" ? cells.get(props.selected) : undefined;
    if (el) requestAnimationFrame(() => centre(el));
  });
  const centre = (el: HTMLElement) => {
    const box = host.getBoundingClientRect();
    const at = el.getBoundingClientRect();
    if (host.scrollWidth > host.clientWidth) host.scrollTo({ left: host.scrollLeft + at.left - box.left - (box.width - at.width) / 2 });
    else host.scrollTo({ top: host.scrollTop + at.top - box.top - (box.height - at.height) / 2 });
  };

  return (
    <ol class={`palette ${props.mode}`} ref={host}>
      <For each={props.order}>
        {(id) => {
          const ink = byId.get(id)!;
          const ramp = createMemo(() => props.ramp(id));
          const color = () => {
            const r = ramp();
            return r ? oklabToHex(r.main) : "#dddbd6";
          };
          return (
            <li
              ref={(el) => cells.set(id, el)}
              classList={{ on: props.selected === id, hot: props.hovered === id }}
              onPointerEnter={() => props.onHover(id)}
              onPointerLeave={() => props.onHover("")}
            >
              <button onClick={() => props.onSelect(id)} title={ink.english}>
                <StrokeCell sprite={props.sprite(id)} ramp={ramp()} seed={id} />
                <span class="deco kanji" style={{ color: color() }} aria-hidden="true">
                  {ink.kanji}
                </span>
                <span class="romaji" style={{ color: color() }}>
                  {ink.name}
                </span>
              </button>
            </li>
          );
        }}
      </For>
    </ol>
  );
}

/** The prerendered stroke from the sheet, or one painted here for an ink that changed since. */
function StrokeCell(props: { sprite: Sprite | undefined; ramp: Ramp | undefined; seed: string }) {
  return (
    <>
      {props.sprite ? (
        <span
          class="stroke"
          style={{
            width: `${TABLE_STROKE.size}px`,
            height: `${TABLE_STROKE.size}px`,
            "background-image": `url(${props.sprite.url})`,
            "background-size": `${SHEET_COLUMNS * 100}% ${props.sprite.rows * 100}%`,
            "background-position": `${((props.sprite.index % SHEET_COLUMNS) / (SHEET_COLUMNS - 1)) * 100}% ${
              props.sprite.rows > 1 ? (Math.floor(props.sprite.index / SHEET_COLUMNS) / (props.sprite.rows - 1)) * 100 : 0
            }%`,
          }}
        />
      ) : (
        <Stroke ramp={props.ramp} seed={props.seed} width={TABLE_STROKE.size} height={TABLE_STROKE.size} thickness={TABLE_STROKE.thickness} />
      )}
    </>
  );
}
