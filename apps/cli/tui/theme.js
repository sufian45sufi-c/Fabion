const ESC = '\x1b[';
const isTTY = process.stdout.isTTY ?? true;
function a(code, text) { if (!isTTY) return text; return `${ESC}${code}m${text}${ESC}0m`; }
export const c = {
  blue:      t => a('38;2;77;158;255', t),
  blueDim:   t => a('38;2;40;80;140', t),
  cream:     t => a('38;2;232;220;195', t),
  gray:      t => a('38;2;90;90;100', t),
  grayMid:   t => a('38;2;150;148;145', t),
  grayLight: t => a('38;2;190;188;185', t),
  green:     t => a('38;2;92;186;125', t),
  yellow:    t => a('38;2;212;166;74', t),
  red:       t => a('38;2;224;92;92', t),
  white:     t => a('97', t),
  orange:    t => a('38;2;220;130;60', t),
  bold:      t => a('1', t),
  dim:       t => a('2', t),
  bgDark:    t => a('48;2;14;14;16', t),
  bgSidebar: t => a('48;2;18;18;22', t),
  bgInput:   t => a('48;2;22;22;26', t),
  bgMsg:     t => a('48;2;26;25;24', t),
};
export const sym = {
  tick: c.green('✓'), cross: c.red('✗'), dot: c.blue('◆'),
  warn: c.yellow('◆'), arrow: c.gray('›'), pipe: c.gray('│'),
  user: c.blue('▸'), fabio: c.blue('◈'),
  spinner: ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'],
};
export const FABIO_SMALL = [
  c.blue('  ░ ★ ░  '), c.blue('   ╲│╱   '), c.blue(' ╭─────╮ '),
  c.blue(' │◼◻ ◼◻│ '), c.blue(' │ ╰─╯ │ '), c.blue(' ╰─────╯ '), c.blue('  ╱╱ ╲╲  '),
];
export const activityLabel = {
  idle: c.gray('idle'), thinking: c.blue('thinking...'),
  reading: c.yellow('reading files...'), searching: c.yellow('searching...'),
  running: c.yellow('running command...'), editing: c.orange('editing file...'),
  testing: c.yellow('running tests...'), done: c.green('completed'), error: c.red('error'),
};
export function stripAnsi(str) { return str.replace(/\x1b\[[0-9;]*m/g, ''); }
export function visibleLength(str) { return stripAnsi(str).length; }
export function truncate(text, width) { const v = stripAnsi(text); if (v.length <= width) return text; return v.slice(0, width - 1) + c.gray('…'); }
export function hline(width, color = c.gray) { return color('─'.repeat(Math.max(0, width))); }
