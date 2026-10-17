import { render } from "solid-js/web";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import { App } from "./App";
import "./kanji-font.css";
import "./styles.css";

render(() => <App />, document.getElementById("root")!);
