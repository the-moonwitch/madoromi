import { Match, Switch } from "solid-js";
import type { Flavour } from "../../core/palette";
import type { Ramp } from "../../core/summary";
import type { Sprite } from "../Palette";
import { Colours } from "./Colours";
import { Guide } from "./Guide";
import { Landing } from "./Landing";
import { Method } from "./Method";
import { Ports } from "./Ports";
import "./palettes.css";

export interface SiteProps {
  page: string;
  flavour: Flavour;
  family: Flavour[];
  sprite: (id: string) => Sprite | undefined;
  ramp: (id: string) => Ramp | undefined;
  strokeUrl: (id: string) => string | undefined;
  go: (page: string) => void;
}

/** The palettes' pages, in the flavour the whole site is shown in (see theme.tsx). */
export function Site(props: SiteProps) {
  return (
    <div class="madoromi">
      <Switch>
        <Match when={props.page === "palettes/colours"}>
          <Colours flavour={props.flavour} family={props.family} sprite={props.sprite} ramp={props.ramp} strokeUrl={props.strokeUrl} go={props.go} />
        </Match>
        <Match when={props.page === "palettes/guide"}>
          <Guide flavour={props.flavour} />
        </Match>
        <Match when={props.page === "palettes/ports"}>
          <Ports flavour={props.flavour} family={props.family} />
        </Match>
        <Match when={props.page === "palettes/method"}>
          <Method flavour={props.flavour} family={props.family} ramp={props.ramp} />
        </Match>
        <Match when={true}>
          <Landing flavour={props.flavour} family={props.family} sprite={props.sprite} ramp={props.ramp} go={props.go} />
        </Match>
      </Switch>
    </div>
  );
}
