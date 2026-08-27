import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ESC = "\x1b[";
const isTTY = process.stdout.isTTY ?? true;

function ansi(code, text) {
  if (!isTTY) return text;
  return `${ESC}${code}m${text}${ESC}0m`;
}

export const c = {
  blue: (text) => ansi("38;2;77;158;255", text),
  blueDim: (text) => ansi("38;2;40;80;140", text),
  cream: (text) => ansi("38;2;232;220;195", text),
  gray: (text) => ansi("38;2;90;90;100", text),
  grayMid: (text) => ansi("38;2;150;148;145", text),
  grayLight: (text) => ansi("38;2;190;188;185", text),
  green: (text) => ansi("38;2;92;186;125", text),
  yellow: (text) => ansi("38;2;212;166;74", text),
  red: (text) => ansi("38;2;224;92;92", text),
  white: (text) => ansi("97", text),
  orange: (text) => ansi("38;2;220;130;60", text),
  teal: (text) => ansi("38;2;80;190;180", text),
  cyan: (text) => ansi("36", text),
  bold: (text) => ansi("1", text),
  dim: (text) => ansi("2", text),
  bgDark: (text) => ansi("48;2;14;14;16", text),
  bgSidebar: (text) => ansi("48;2;18;18;22", text),
  bgInput: (text) => ansi("48;2;22;22;26", text),
  bgCode: (text) => ansi("48;2;26;25;24", text),
  bgBar: (text) => ansi("48;2;14;14;16", text),
};

export const sym = {
  tick: c.green("✓"),
  cross: c.red("✗"),
  dot: c.blue("◆"),
  warn: c.yellow("◆"),
  arrow: c.gray("›"),
  user: c.blue("▸"),
  fabio: c.blue("◈"),
};

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

export const activityLabel = {
  idle: c.gray("idle"),
  loading: c.gray("loading..."),
  thinking: c.blue("thinking..."),
  coding: c.orange("coding..."),
  reading: c.yellow("reading files..."),
  searching: c.yellow("searching..."),
  running: c.yellow("running command..."),
  editing: c.orange("editing file..."),
  testing: c.yellow("running tests..."),
  done: c.green("completed"),
  error: c.red("error"),
};

// Frame sets modeled after Bubble Tea's spinner styles.
export const activityFrames = {
  loading: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  thinking: ["◐", "◓", "◑", "◒"],
  coding: ["▖", "▘", "▝", "▗", "▄", "▖", "▘", "▝", "▗", "▀"],
};

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

export function syntaxHighlight(text) {
  return text;
}
