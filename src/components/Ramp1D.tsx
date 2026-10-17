import { createSignal, For } from "solid-js";
import { oklabToCss, oklabToHex } from "../core/color";
import { DETAIL_STROKE, type Ramp } from "../core/summary";
import { Stroke } from "./Stroke";

/** The ink's ramp as a swatch card: its brush stroke over the gradient, beside the steps and their codes. */
export function Ramp1D(props: { ramp: Ramp; name: string; /** The prerendered stroke, if there is one. */ image?: string }) {
  const [copied, setCopied] = createSignal(false);
  const copy = () => {
    const css = props.ramp.ramp.map((lab, i) => `  --${props.name}-${i}: ${oklabToCss(lab)};`).join("\n");
    navigator.clipboard.writeText(`:root {\n${css}\n}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div class="ramp">
      {props.image ? (
        <img class="stroke" src={props.image} width={DETAIL_STROKE.size} height={DETAIL_STROKE.size} alt="" decoding="async" />
      ) : (
        <Stroke ramp={props.ramp} seed={props.name} width={DETAIL_STROKE.size} height={DETAIL_STROKE.size} thickness={DETAIL_STROKE.thickness} />
      )}
      <ol class="ramp-steps">
        <For each={props.ramp.ramp}>
          {(lab) => (
            <li>
              <span class="ramp-swatch" style={{ background: oklabToHex(lab) }} />
              <span class="code">{oklabToHex(lab)}</span>
            </li>
          )}
        </For>
      </ol>
      <button class="link" onClick={copy}>
        {copied() ? "copied" : "copy as css"}
      </button>
    </div>
  );
}
