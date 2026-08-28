import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ESC = "\x1b[";
const isTTY = process.stdout.isTTY ?? true;

function ansi(code, text) {
  if (!isTTY) return text;
  return `${ESC}${code}m${text}${ESC}0m`;
}

// ── Palette ────────────────────────────────────────────────────────────────────
// Primary brand blue:  #4A6FFF  →  rgb(74, 111, 255)  (from user swatch)
// Bright blue:         #7B9FFF  →  rgb(123, 159, 255)  (lighter variant)
// Dim blue:            #2A45AA  →  rgb(42,  69,  170)  (subdued)
// All greens replaced with this blue family.
export const c = {
  // Brand accents — all blue now, no teal/green
  teal:       (t) => ansi("38;2;74;111;255",  t),  // primary #4A6FFF
  tealBright: (t) => ansi("38;2;123;159;255", t),  // bright  #7B9FFF
  tealDim:    (t) => ansi("38;2;42;69;170",   t),  // dim     #2A45AA
  blue:       (t) => ansi("38;2;74;111;255",  t),  // alias — same as teal
  blueDim:    (t) => ansi("38;2;42;69;170",   t),  // alias — same as tealDim
  steel:      (t) => ansi("38;2;100;140;255", t),  // soft blue for info text

  // Neutrals — unchanged
  cream:      (t) => ansi("38;2;232;220;195", t),  // body text
  gray:       (t) => ansi("38;2;90;90;100",   t),  // muted chrome
  grayMid:    (t) => ansi("38;2;150;148;145", t),  // secondary text
  grayLight:  (t) => ansi("38;2;190;188;185", t),  // primary text / labels
  white:      (t) => ansi("97",               t),  // cursor char

  // Semantic — green replaced with brand blue, others unchanged
  green:      (t) => ansi("38;2;74;111;255",  t),  // ✓ ticks, done states → blue
  yellow:     (t) => ansi("38;2;212;166;74",  t),
  red:        (t) => ansi("38;2;224;92;92",   t),
  orange:     (t) => ansi("38;2;220;130;60",  t),
  cyan:       (t) => ansi("38;2;123;159;255", t),  // inline code → bright blue

  // Typography
  bold:       (t) => ansi("1",               t),
  dim:        (t) => ansi("2",               t),
  italic:     (t) => ansi("3",               t),

  // Backgrounds
  bgDark:     (t) => ansi("48;2;13;14;18",   t),  // main bg
  bgSidebar:  (t) => ansi("48;2;17;18;24",   t),
  bgInput:    (t) => ansi("48;2;22;24;32",   t),  // input area
  bgCode:     (t) => ansi("48;2;18;20;40",   t),  // code block — blue-tinted dark
  bgBar:      (t) => ansi("48;2;13;14;18",   t),  // top/bottom bars
  bgHighlight:(t) => ansi("48;2;30;50;140",  t),  // cursor/selection — deep blue
};

// ── Symbols ────────────────────────────────────────────────────────────────────
export const sym = {
  tick:     c.green("✓"),
  cross:    c.red("✗"),
  dot:      c.teal("◆"),
  warn:     c.yellow("◆"),
  arrow:    c.gray("›"),
  user:     c.tealBright("▸"),
  fabio:    c.teal("◈"),
  dot2:     c.teal("●"),
  spinner:  c.teal("⠋"),
  sep:      c.tealDim("│"),
  hexagon:  c.teal("⬡"),
};

// ── Mascot ─────────────────────────────────────────────────────────────────────
function loadFabioArt() {
  try {
    const path = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../assets/fabio/fabio.ansi",
    );
    return readFileSync(path, "utf8").split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export const FABIO_ART = loadFabioArt();

// ── Activity labels ────────────────────────────────────────────────────────────
export const activityLabel = {
  idle:       c.gray("idle"),
  loading:    c.gray("loading..."),
  thinking:   c.teal("thinking..."),        // blue
  coding:     c.tealBright("coding..."),    // bright blue
  reading:    c.yellow("reading files..."),
  searching:  c.yellow("searching..."),
  running:    c.yellow("running command..."),
  editing:    c.tealBright("editing file..."), // bright blue
  testing:    c.yellow("running tests..."),
  done:       c.teal("completed"),          // blue (was green)
  error:      c.red("error"),
};

// ── Spinner frames ─────────────────────────────────────────────────────────────
export const activityFrames = {
  loading:  ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  thinking: ["◐", "◓", "◑", "◒"],
  coding:   ["▖", "▘", "▝", "▗", "▄", "▖", "▘", "▝", "▗", "▀"],
};

// ── Text utilities ─────────────────────────────────────────────────────────────
export function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, "");
}

export function visibleLength(text) {
  return stripAnsi(text).length;
}

export function truncate(text, width) {
  const value = stripAnsi(text);
  if (value.length <= width) return text;
  return value.slice(0, Math.max(0, width - 1)) + c.gray("…");
}

export function pad(text, width, char = " ") {
  const vl = visibleLength(text);
  return text + char.repeat(Math.max(0, width - vl));
}

// ── Syntax highlighter ─────────────────────────────────────────────────────────
// Regex-based, no dependencies. Processes one language at a time, line by line.
// Order matters: earlier rules win. Each rule: [ regex, colorFn ]

const ESC_RESET = "\x1b[0m";

function _applyRules(line, rules) {
  // We need to apply rules without overlapping matches.
  // Strategy: find ALL matches across all rules, sort by index, apply left-to-right.
  const matches = [];
  for (const [re, colorFn] of rules) {
    const clone = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m;
    while ((m = clone.exec(line)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], colorFn });
    }
  }
  if (!matches.length) return line;

  // Sort by start, then by longest match (greedy) to resolve ties
  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  let out    = "";
  let cursor = 0;
  for (const { start, end, text, colorFn } of matches) {
    if (start < cursor) continue;          // overlaps — skip
    out   += line.slice(cursor, start);    // plain text before match
    out   += colorFn(text) + ESC_RESET;    // coloured match + reset
    cursor = end;
  }
  out += line.slice(cursor);               // tail
  return out;
}

// Shared token sets
const T = {
  // JS/TS/JSX keywords
  jsKeyword: [
    /\b(const|let|var|function|class|extends|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|in|of|try|catch|finally|throw|async|await|import|export|default|from|as|static|get|set|null|undefined|true|false|void|this|super)\b/g,
    c.blue,
  ],
  jsType: [
    /\b(string|number|boolean|object|any|unknown|never|void|Promise|Array|Record|Partial|Required|Readonly|Map|Set|Date|Error|RegExp|Symbol|BigInt|Function|Object|Window|Document|Event|HTMLElement)\b/g,
    c.teal,
  ],
  jsFn:    [ /\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g,  c.tealBright ],
  jsNum:   [ /\b(0x[\da-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?n?)\b/g, c.yellow ],
  jsStr:   [ /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, c.green ],
  jsRe:    [ /\/(?:[^/\\*]|\\.)+\/[gimsuy]*/g, c.orange ],
  jsOp:    [ /(=>|===|!==|==|!=|>=|<=|&&|\|\||[+\-*/%&|^~?:!])/g, c.grayLight ],
  comment: [ /(\/\/.*$)/g, c.gray ],
  mlCom:   [ /(\/\*[\s\S]*?\*\/)/g, c.gray ],
  hashCom: [ /(#.*$)/g, c.gray ],
  // Python
  pyKeyword: [
    /\b(def|class|return|if|elif|else|for|while|try|except|finally|with|as|import|from|pass|break|continue|raise|yield|lambda|and|or|not|in|is|None|True|False|self|cls|async|await)\b/g,
    c.blue,
  ],
  pyDecorator: [ /(@[a-zA-Z_][\w.]*)/g, c.orange ],
  pyFn:   [ /\b([a-zA-Z_]\w*)(?=\s*\()/g, c.tealBright ],
  pyStr:  [ /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, c.green ],
  // Shell
  shKeyword: [ /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|local|export|source|echo|exit|cd|ls|grep|awk|sed|curl|git|npm|node|python|pip)\b/g, c.blue ],
  shFlag:    [ /(--?[a-zA-Z][\w-]*)/g, c.teal ],
  shStr:     [ /("(?:[^"\\]|\\.)*"|'[^']*')/g, c.green ],
  shVar:     [ /(\$\{?[a-zA-Z_]\w*\}?|\$\d)/g, c.yellow ],
  // JSON
  jsonKey:   [ /("(?:[^"\\]|\\.)*")\s*:/g, c.teal ],
  jsonStr:   [ /:\s*("(?:[^"\\]|\\.)*")/g, c.green ],
  jsonNum:   [ /:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, c.yellow ],
  jsonKw:    [ /\b(true|false|null)\b/g, c.blue ],
  // CSS
  cssSel:    [ /([.#]?[a-zA-Z][\w-]*(?:\s*[,>+~]\s*[.#]?[a-zA-Z][\w-]*)*)\s*\{/g, c.tealBright ],
  cssProp:   [ /([a-z-]+)\s*:/g, c.blue ],
  cssVal:    [ /:\s*(.+?);/g, c.green ],
  cssAt:     [ /(@[a-zA-Z-]+)/g, c.orange ],
};

const LANG_RULES = {
  js:         [T.mlCom, T.comment, T.jsStr,   T.jsNum,  T.jsKeyword, T.jsType, T.jsFn,  T.jsOp],
  javascript: [T.mlCom, T.comment, T.jsStr,   T.jsNum,  T.jsKeyword, T.jsType, T.jsFn,  T.jsOp],
  ts:         [T.mlCom, T.comment, T.jsStr,   T.jsNum,  T.jsKeyword, T.jsType, T.jsFn,  T.jsOp],
  typescript: [T.mlCom, T.comment, T.jsStr,   T.jsNum,  T.jsKeyword, T.jsType, T.jsFn,  T.jsOp],
  jsx:        [T.mlCom, T.comment, T.jsStr,   T.jsNum,  T.jsKeyword, T.jsType, T.jsFn,  T.jsOp],
  tsx:        [T.mlCom, T.comment, T.jsStr,   T.jsNum,  T.jsKeyword, T.jsType, T.jsFn,  T.jsOp],
  py:         [T.mlCom, T.hashCom, T.pyStr,   T.jsNum,  T.pyKeyword, T.pyDecorator, T.pyFn],
  python:     [T.mlCom, T.hashCom, T.pyStr,   T.jsNum,  T.pyKeyword, T.pyDecorator, T.pyFn],
  sh:         [T.hashCom, T.shStr, T.shVar,   T.shFlag, T.shKeyword],
  bash:       [T.hashCom, T.shStr, T.shVar,   T.shFlag, T.shKeyword],
  shell:      [T.hashCom, T.shStr, T.shVar,   T.shFlag, T.shKeyword],
  zsh:        [T.hashCom, T.shStr, T.shVar,   T.shFlag, T.shKeyword],
  json:       [T.jsonKey, T.jsonStr, T.jsonNum, T.jsonKw],
  css:        [T.mlCom,  T.cssSel, T.cssProp, T.cssVal, T.cssAt],
  scss:       [T.mlCom,  T.hashCom, T.cssSel, T.cssProp, T.cssVal, T.cssAt],
};

export function syntaxHighlight(text, lang = "") {
  const rules = LANG_RULES[lang.toLowerCase()];
  if (!rules || !isTTY) return text;          // unsupported lang — return plain
  return text
    .split("\n")
    .map((line) => _applyRules(line, rules))
    .join("\n");
}