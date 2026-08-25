const ESC = '\x1b[';
const isTTY = process.stdout.isTTY ?? true;
function a(code, text) { if (!isTTY) return text; return `${ESC}${code}m${text}${ESC}0m`; }
export const c = {
  blue:       t => a('38;2;77;158;255', t),
  blueBright: t => a('38;2;140;200;255', t),
  teal:       t => a('38;2;45;130;120', t),
  cream:      t => a('38;2;232;220;195', t),
  gray:       t => a('38;2;100;115;110', t),
  grayMid:    t => a('38;2;150;165;160', t),
  grayLight:  t => a('38;2;190;200;198', t),
  green:      t => a('38;2;92;186;125', t),
  yellow:     t => a('38;2;212;166;74', t),
  orange:     t => a('38;2;220;130;60', t),
  red:        t => a('38;2;224;92;92', t),
  white:      t => a('97', t),
  bold:       t => a('1', t),
  dim:        t => a('2', t),
  bgDark:     t => a('48;2;18;26;24', t),
  bgInput:    t => a('48;2;22;32;29', t),
};
export const FABIO_ART = [
  '        ▀█▀        ',
  '         █         ',
  '      ▄▄███▄▄      ',
  '    ██ ██ ██ ██    ',
  '   ██  ██ ██  ██   ',
  '   ██  █████  ██   ',
  '    ██  ███  ██    ',
  '      ███████      ',
  '    ▄█▀     ▀█▄    ',
  '   █▀  ▀▀▀▀▀  ▀█   ',
];
export const activityLabel = {
  idle: c.gray('idle'), thinking: c.blue('thinking...'),
  reading: c.yellow('reading files...'), running: c.yellow('running command...'),
  editing: c.orange('editing file...'), done: c.green('completed'), error: c.red('error'),
};
export function stripAnsi(str) { return str.replace(/\x1b\[[0-9;]*m/g, ''); }
export function visibleLength(str) { return stripAnsi(str).length; }
export function truncate(text, width) { const v=stripAnsi(text); if(v.length<=width)return text; return v.slice(0,width-1)+c.gray('…'); }
