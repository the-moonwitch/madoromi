import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";

/** Holds its place, and renders its children only once it comes near the screen. */
export function WhenNear(props: { class: string; children: JSX.Element }) {
  let host!: HTMLDivElement;
  const [near, setNear] = createSignal(false);
  onMount(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(host);
    onCleanup(() => io.disconnect());
  });
  return (
    <div ref={host} class="when-near">
      <Show when={near()} fallback={<div class={props.class} />}>
        {props.children}
      </Show>
    </div>
  );
}
