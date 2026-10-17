// A small highlighter for the demo's samples: enough of TypeScript, Rust and Python to colour them
// by role the way the editor ports do.
import type { Role } from "../../core/palette";

export type Token = [text: string, role: Role, style?: "italic" | "bold"];

export interface Language {
  name: string;
  file: string;
  keywords: string[];
  constants: string[];
  builtins: string[];
  self: string;
  comment: RegExp;
  /** Names that are parameters in the sample, coloured as such. */
  params: string[];
}

export const LANGUAGES: Record<string, Language> = {
  ts: {
    name: "TypeScript",
    file: "brush.ts",
    keywords: ["import", "from", "export", "function", "const", "let", "return", "if", "throw", "new", "type", "enum", "interface", "for", "of", "class"],
    constants: ["true", "false", "null", "undefined"],
    builtins: ["RangeError", "console", "Math", "Array"],
    self: "this",
    comment: /^(\/\/.*|\/\*.*?\*\/)/,
    params: ["ink", "steps", "colour", "i"],
  },
  rs: {
    name: "Rust",
    file: "brush.rs",
    keywords: ["use", "pub", "fn", "let", "mut", "return", "if", "for", "in", "impl", "struct", "enum", "match", "as", "where", "derive"],
    constants: ["true", "false", "None", "Some", "Ok", "Err"],
    builtins: ["Vec", "println", "panic", "f32", "usize", "String", "Self"],
    self: "self",
    comment: /^(\/\/.*)/,
    params: ["ink", "steps", "colour", "i"],
  },
  py: {
    name: "Python",
    file: "brush.py",
    keywords: ["from", "import", "def", "return", "if", "raise", "for", "in", "class", "lambda", "and", "or", "not", "with", "as"],
    constants: ["True", "False", "None"],
    builtins: ["ValueError", "print", "range", "len", "enumerate", "list", "float", "int"],
    self: "self",
    comment: /^(#.*)/,
    params: ["ink", "steps", "colour", "i"],
  },
};

const PATTERNS: [RegExp, (m: string, lang: Language, prev: string, next: string) => Token | Token[]][] = [
  [/^("""[^]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/, (m) => strings(m)],
  [/^\/(?![/*])(?:\\.|[^/\n])+\/[gimsuy]*/, (m) => [m, "regexp"]],
  [/^(0x[0-9a-f]+|\d+(?:\.\d+)?(?:e-?\d+)?(?:_?[a-z]\d*)?)/i, (m) => [m, "number"]],
  [/^#\[[^\]]*\]|^@[A-Za-z_][\w.]*/, (m) => [m, "decorator"]],
  [/^[A-Za-z_][\w]*!?/, (m, lang, prev, next) => word(m, lang, prev, next)],
  [/^(=>|->|::|\.\.|[=!<>]=|&&|\|\||[-+*/%=<>!&|^?:.]|\bis\b)/, (m) => [m, m === "." || m === "::" ? "operator" : "operator"]],
  [/^[{}()[\];,]/, (m) => [m, "punctuation"]],
  [/^\s+/, (m) => [m, "text"]],
  [/^./, (m) => [m, "text"]],
];

/** A string, with its escapes and interpolations picked out. */
function strings(m: string): Token[] {
  const out: Token[] = [];
  const re = /(\\.|\$\{[^}]*\}|\{[a-z_.]+\})/g;
  let at = 0;
  for (const x of m.matchAll(re)) {
    if (x.index! > at) out.push([m.slice(at, x.index), "string"]);
    out.push([x[0], "escape"]);
    at = x.index! + x[0].length;
  }
  if (at < m.length) out.push([m.slice(at), "string"]);
  return out;
}

function word(m: string, lang: Language, prev: string, next: string): Token {
  if (m === lang.self) return [m, "self", "italic"];
  if (lang.keywords.includes(m)) return [m, "keyword"];
  if (lang.constants.includes(m)) return [m, "constant"];
  if (m.endsWith("!") || lang.builtins.includes(m)) return [m, "builtin"];
  if (prev === "." && next !== "(") return [m, /^[A-Z]/.test(m) ? "enumMember" : "property"];
  if (next === "(") return [m, "function"];
  if (lang.params.includes(m)) return [m, "parameter", "italic"];
  if (/^[A-Z][A-Z0-9_]+$/.test(m)) return [m, "constant"];
  if (/^[A-Z]/.test(m)) return [m, "type"];
  if (next === ":" && prev !== ":") return [m, "property"];
  return [m, "text"];
}

/** Every line of a sample, as tokens. */
export function highlight(source: string, lang: Language): Token[][] {
  return source.split("\n").map((line) => {
    const out: Token[] = [];
    let rest = line;
    let prev = "";
    while (rest) {
      const c = rest.match(lang.comment);
      if (c) {
        out.push([c[0], "comment", "italic"]);
        rest = rest.slice(c[0].length);
        continue;
      }
      for (const [re, as] of PATTERNS) {
        const m = rest.match(re);
        if (!m) continue;
        const after = rest.slice(m[0].length).trimStart()[0] ?? "";
        const t = as(m[0], lang, prev, after);
        if (Array.isArray(t[0])) out.push(...(t as Token[]));
        else out.push(t as Token);
        if (m[0].trim()) prev = m[0];
        rest = rest.slice(m[0].length);
        break;
      }
    }
    return out;
  });
}
