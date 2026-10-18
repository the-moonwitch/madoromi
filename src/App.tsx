import { createEffect, createMemo, createSignal, For, lazy, onMount, Show, Suspense } from "solid-js";
import { Chart2D } from "./components/Chart2D";
import { HueHistogram } from "./components/HueHistogram";
import { Palette, type Sprite } from "./components/Palette";
import { Ramp1D } from "./components/Ramp1D";
import { WhenNear } from "./components/WhenNear";
import { PAGES } from "./components/palettes/pages";
import { decodeFamily, type FamilyJSON } from "./core/palette";
import flavours from "./flavours.json";

// JSON imports type tuples as arrays.
const FAMILY = decodeFamily(flavours as unknown as FamilyJSON);
import { legibleOn, onDarkPaper, paperLab, Picker, useTheme } from "./theme";
import { analyze, combineScans, defaultAnalysisOptions, type Analysis, type Cloud } from "./core/analyze";
import { oklabToHex } from "./core/color";
import { viewOf, type InkView } from "./core/inkview";
import { loopOrder } from "./core/order";
import { inkHistogram, type InkHistogram } from "./core/shared";
import { sampleSignature, strokeFile, strokeSheet, type Ramp, type Summary } from "./core/summary";
import { inks } from "./inks";
import { loadInks, loadPoints, loadSummary, precomputed, prefetchInk, type InkScans } from "./load";
import { nextTask } from "./tasks";
import type { SampleResult } from "./worker";

// three.js is only fetched once a 3D view is near the screen (and warmed up when idle).
const loadView3D = () => import("./components/View3D").then((m) => ({ default: m.View3D }));
const View3D = lazy(loadView3D);
const Site = lazy(() => import("./components/palettes/Site").then((m) => ({ default: m.Site })));
const SharedSpace3D = lazy(() => import("./components/SharedSpace3D").then((m) => ({ default: m.SharedSpace3D })));

const PALETTES = "palettes";

/** Min px / bin and the margin are fixed: every ink is analysed the same way, ahead of time. */
const opts = defaultAnalysisOptions;

export function App() {
  const [summary, setSummary] = createSignal<Summary | null>();
  const [results, setResults] = createSignal(new Map<string, InkScans>());
  const [selected, setSelected] = createSignal(location.hash.slice(1));
  const [hovered, setHovered] = createSignal("");

  onMount(() => {
    loadSummary().then((s) => setSummary(s ?? null));
    // Back and forward move between the inks opened (and the table).
    const follow = () => {
      const next = location.hash.slice(1);
      if (next === selected()) return;
      if (!next !== !selected()) window.scrollTo({ top: 0 });
      setHovered("");
      setSelected(next);
    };
    window.addEventListener("popstate", follow);
    window.addEventListener("hashchange", follow);
    (window.requestIdleCallback ?? setTimeout)(() => void loadView3D());
  });
  /** Opens an ink or a page; "" is the table of inks. */
  const go = (next: string) => {
    if (next === selected()) return;
    if (!next !== !selected() || next.startsWith(PALETTES) || selected().startsWith(PALETTES)) window.scrollTo({ top: 0 });
    history.pushState(null, "", next ? `#${next}` : location.pathname);
    setHovered("");
    setSelected(next);
  };
  /** Selecting the open ink again closes it. */
  const select = (id: string) => go(selected() === id ? "" : id);
  const hover = (id: string) => {
    setHovered(id);
    if (id && precomputedFor(id)) prefetchInk(id);
  };
  const current = createMemo(() => inks.find((i) => i.id === selected()));
  // The tab says where you are.
  createEffect(() => {
    const ink = current();
    const page = PAGES.find((p) => p.id === selected());
    document.title = ink ? `${ink.name} ${ink.kanji ?? ""} · madoromi` : page ? `${page.name} · madoromi` : "madoromi 微睡";
  });
  /** The palettes page, at #palettes. */
  const palettes = () => selected() === PALETTES || selected().startsWith(`${PALETTES}/`);

  // --- What the summary covers: inks whose scans haven't changed since preprocessing.
  // Anything else is analysed here from the ink's scans.
  const signatures = new Map(inks.map((i) => [i.id, sampleSignature(i.samples)]));
  const precomputedFor = (id: string): InkView | undefined => {
    const s = summary();
    if (!s || s.minCount !== opts.minCount || s.files.get(id) !== signatures.get(id)) return;
    return s.views.get(id);
  };

  // --- Scans are loaded only for inks the summary doesn't cover.
  const requested = new Set<string>();
  createEffect(() => {
    if (summary() === undefined) return; // still loading
    const todo = inks.filter((i) => !precomputedFor(i.id) && !requested.has(i.id));
    if (!todo.length) return;
    for (const i of todo) requested.add(i.id);
    loadInks(todo, (r) => setResults(new Map(results()).set(r.id, r)));
  });
  const cloudCache = new Map<string, { loaded: InkScans; cloud: Cloud }>();
  const clouds = createMemo(() => {
    const out = new Map<string, Cloud>();
    for (const [id, loaded] of results()) {
      const hit = cloudCache.get(id);
      if (hit?.loaded === loaded) {
        out.set(id, hit.cloud);
        continue;
      }
      const parts = loaded.samples.filter((s): s is SampleResult => s !== null);
      if (!parts.length) continue;
      const cloud = combineScans(parts);
      cloudCache.set(id, { loaded, cloud });
      out.set(id, cloud);
    }
    return out;
  });
  // Analysed in the background, one ink per task.
  const [computed, setComputed] = createSignal(new Map<string, Analysis>());
  const analysed = new Map<string, { c: Cloud; a: Analysis }>();
  createEffect(() => {
    const cs = clouds();
    const todo = [...cs.keys()].filter((id) => analysed.get(id)?.c !== cs.get(id));
    const step = () => {
      const id = todo.shift();
      if (!id) return setComputed(new Map([...analysed].map(([k, v]) => [k, v.a])));
      analysed.set(id, { c: cs.get(id)!, a: analyze(cs.get(id)!, opts) });
      nextTask(step);
    };
    if (todo.length) nextTask(step);
  });

  const ramp = (id: string): Ramp | undefined => precomputedFor(id) ?? computed().get(id);
  const ramps = createMemo(() => new Map(inks.flatMap((i) => (ramp(i.id) ? [[i.id, ramp(i.id)!] as const] : []))));
  // Every page is shown in a madoromi flavour, as `bun run palettes` built them from the inks.
  const family = () => FAMILY;
  const flavour = useTheme(family);
  /** An ink's colour for its name: itself, read thinner where the paper is too dark for it. */
  const inkColour = (id: string) => {
    const r = ramp(id);
    return r ? oklabToHex(legibleOn(r.curve.lab, r.main, paperLab(), 4.5)) : "#dddbd6";
  };
  const hists = createMemo(() => {
    const out = new Map<string, InkHistogram>();
    for (const ink of inks) {
      const c = clouds().get(ink.id);
      const h = precomputedFor(ink.id) ? summary()!.hists.get(ink.id) : c && inkHistogram(c, opts.minCount);
      if (h) out.set(ink.id, h);
    }
    return out;
  });
  // The loop order and stroke sheet hold while every ink is as preprocessed.
  const allPrecomputed = createMemo(() => !!summary() && inks.every((i) => precomputedFor(i.id)));
  const order = createMemo(() => (allPrecomputed() ? summary()!.order : loopOrder(inks.map((i) => i.id), ramp)));
  const sprite = (id: string): Sprite | undefined => {
    const s = summary();
    if (!s || !precomputedFor(id)) return;
    return { url: precomputed(strokeSheet(onDarkPaper())), index: s.strokes.get(id)!, rows: s.sheetRows };
  };

  // --- The open ink: its view and points, from the summary and its point file, or analysed here.
  const inkView = createMemo<InkView | undefined>(() => {
    const ink = current();
    if (!ink) return;
    const pre = precomputedFor(ink.id);
    if (pre) return pre;
    const a = computed().get(ink.id);
    return a && viewOf(a);
  });
  const [points, setPoints] = createSignal<{ id: string; points: Float32Array }>();
  createEffect(() => {
    const ink = current();
    if (!ink) return;
    if (precomputedFor(ink.id)) loadPoints(ink.id).then((p) => p && setPoints({ id: ink.id, points: p }));
    else {
      const a = computed().get(ink.id);
      if (a) setPoints({ id: ink.id, points: a.points });
    }
  });
  const inkPoints = () => {
    const p = points();
    return p && p.id === current()?.id ? p.points : undefined;
  };

  return (
    <div class="page" classList={{ open: !!current() }}>
      <header class="masthead">
        <span class="deco kanji" aria-hidden="true">
          微睡
        </span>
        <h1>
          <a href="#" onClick={(e) => (e.preventDefault(), go(""))}>
            madoromi
          </a>
        </h1>
        <nav>
          <For each={[{ id: "", name: "inks" }, ...PAGES]}>
            {(p) => (
              <a
                class="link"
                classList={{ on: p.id ? selected() === p.id : !palettes() }}
                href={`#${p.id}`}
                onClick={(e) => (e.preventDefault(), go(p.id))}
              >
                {p.name}
              </a>
            )}
          </For>
        </nav>
        <Picker family={family()} />
      </header>

      <Show when={palettes()}>
        <Suspense>
          <Show when={flavour()}>{(f) => <Site page={selected()} flavour={f()} family={family()} sprite={sprite} ramp={ramp} strokeUrl={(id) => (precomputedFor(id) ? precomputed(strokeFile(id, onDarkPaper())) : undefined)} go={go} />}</Show>
        </Suspense>
      </Show>

      <div class="body" hidden={palettes()}>
        <Palette
          inks={inks}
          order={order()}
          ramp={ramp}
          colour={inkColour}
          sprite={sprite}
          mode={current() ? "list" : "grid"}
          selected={selected()}
          hovered={hovered()}
          onHover={hover}
          onSelect={select}
        />
        <Show when={current()} keyed>
          {(ink) => {
            const color = () => inkColour(ink.id);
            return (
              <main class="detail">
                <button class="close" onClick={() => select("")} title="all inks">
                  ×
                </button>
                <div class="detail-top">
                  <header class="detail-name">
                    <span class="deco kanji" style={{ color: color() }} aria-hidden="true">
                      {ink.kanji}
                    </span>
                    <h2 style={{ color: color() }}>{ink.name}</h2>
                    <em>{ink.english}</em>
                  </header>
                  <Show when={ramp(ink.id)}>
                    {(r) => <Ramp1D ramp={r()} name={ink.id} image={precomputedFor(ink.id) && precomputed(strokeFile(ink.id, onDarkPaper()))} />}
                  </Show>
                </div>
                <Show when={inkView()}>
                  {(v) => (
                    <div class="figures">
                      <Chart2D view={v()} />
                      <Show when={inkPoints()} fallback={<div class="view3d" />}>
                        {(p) => (
                          <Suspense fallback={<div class="view3d" />}>
                            <View3D view={v()} points={p()} inkId={ink.id} />
                          </Suspense>
                        )}
                      </Show>
                    </div>
                  )}
                </Show>
              </main>
            );
          }}
        </Show>
      </div>

      <Show when={!current() && !palettes()}>
        <section class="overview">
          <WhenNear class="view3d shared">
            <Suspense fallback={<div class="view3d shared" />}>
              <SharedSpace3D ramps={ramps()} hovered={hovered()} onHover={hover} onPick={select} />
            </Suspense>
          </WhenNear>
        </section>
        <div class="hist-bar">
          <HueHistogram hists={hists()} hovered={hovered()} />
        </div>
      </Show>

      <footer class="site-foot">
        <span>
          <span class="kanji">微睡</span> madoromi
        </span>
        <span>colours read from scans of Pilot's iroshizuku inks; iroshizuku is Pilot's</span>
        <span>code and palettes under MPL-2.0; every port is in the repository's palettes/</span>
      </footer>
    </div>
  );
}
