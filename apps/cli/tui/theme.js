import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ESC = '\x1b[';
const isTTY = process.stdout.isTTY ?? true;
function a(code, text) { if (!isTTY) return text; return `${ESC}${code}m${text}${ESC}0m`; }

export const c = {
  blue:       t => a('38;2;77;158;255', t),
  blueDim:    t => a('38;2;40;90;180', t),
  blueBright: t => a('38;2;140;200;255', t),
  teal:       t => a('38;2;45;160;140', t),
  cream:      t => a('38;2;220;215;205', t),
  gray:       t => a('38;2;90;100;95', t),
  grayMid:    t => a('38;2;140;150;145', t),
  grayLight:  t => a('38;2;185;195;190', t),
  green:      t => a('38;2;80;200;120', t),
  greenDim:   t => a('38;2;50;130;80', t),
  yellow:     t => a('38;2;220;180;80', t),
  orange:     t => a('38;2;220;130;60', t),
  red:        t => a('38;2;220;80;80', t),
  purple:     t => a('38;2;180;120;255', t),
  cyan:       t => a('38;2;80;200;220', t),
  white:      t => a('97', t),
  bold:       t => a('1', t),
  dim:        t => a('2', t),
  italic:     t => a('3', t),
  // Backgrounds
  bgBar:      t => a('48;2;12;18;16', t),
  bgInput:    t => a('48;2;20;28;25', t),
  bgSidebar:  t => a('48;2;14;20;18', t),
  bgCode:     t => a('48;2;16;22;20', t),
  bgHighlight:t => a('48;2;30;45;40', t),
};

// Load real Fabio ANSI art
function loadFabioArt() {
  try {
    const p = join(__dirname, '../../../assets/fabio/fabio.ansi');
    const content = readFileSync(p, 'utf8');
    const lines = content.split('\n');
    while (lines.length && !lines[lines.length-1]) lines.pop();
    return lines;
  } catch {
    return [
      c.blue(' ╭─────╮ '),
      c.blue(' │◼◻ ◼◻│ '),
      c.blue(' ╰─────╯ '),
    ];
  }
}

export const FABIO_ART = loadFabioArt();

export const activityLabel = {
  idle:     c.gray('Idle'),
  thinking: c.blue('Thinking...'),
  reading:  c.yellow('Reading files...'),
  running:  c.yellow('Running command...'),
  editing:  c.orange('Editing file...'),
  done:     c.green('Done'),
  error:    c.red('Error'),
};

// Syntax highlighting for code blocks
export function syntaxHighlight(code, lang = '') {
  const l = lang.toLowerCase();

  // Keywords by language
  const keywords = {
    js:         ['const','let','var','function','return','if','else','for','while','class','import','export','from','async','await','new','this','typeof','null','undefined','true','false','=>'],
    ts:         ['const','let','var','function','return','if','else','for','while','class','import','export','from','async','await','new','this','typeof','null','undefined','true','false','=>','interface','type','string','number','boolean','void','any'],
    python:     ['def','return','if','else','elif','for','while','class','import','from','as','with','try','except','True','False','None','and','or','not','in','is','lambda'],
    bash:       ['if','then','else','fi','for','do','done','while','case','esac','function','echo','exit','source','export','local'],
  };

  const langKey = l.includes('typescript') || l === 'ts' || l === 'tsx' ? 'ts'
               : l.includes('python') || l === 'py' ? 'python'
               : l.includes('bash') || l === 'sh' ? 'bash'
               : 'js';

  const kws = keywords[langKey] ?? keywords.js;

  return code
    .split('\n')
    .map(line => {
      // Comments
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
        return c.greenDim(line);
      }
      // Strings
      line = line.replace(/(["'`])(.*?)\1/g, (_, q, s) => c.yellow(`${q}${s}${q}`));
      // Numbers
      line = line.replace(/\b(\d+\.?\d*)\b/g, n => c.purple(n));
      // Keywords
      for (const kw of kws) {
        line = line.replace(new RegExp(`\\b(${kw})\\b`, 'g'), c.blue('$1'));
      }
      // Function calls
      line = line.replace(/\b([a-zA-Z_]\w*)\s*\(/g, (_, fn) => c.cyan(fn) + '(');
      return line;
    })
    .join('\n');
}

export function stripAnsi(str) { return str.replace(/\x1b\[[0-9;]*m/g, ''); }
export function visibleLength(str) { return stripAnsi(str).length; }
export function truncate(text, width) {
  const v = stripAnsi(text);
  if (v.length <= width) return text;
  return v.slice(0, width - 1) + c.gray('…');
}
