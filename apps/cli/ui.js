/**
 * apps/cli/ui.js
 *
 * Everything visual for the Fabion CLI.
 *
 * This file owns:
 *   - ANSI color helpers
 *   - Fabio ASCII art banner
 *   - Spinner animation
 *   - Print helpers (lines, dividers, Fabio speech)
 *   - Help and status displays
 *
 * Nothing in this file knows about the agent or the model.
 * It is purely a display layer.
 */

// ─── ANSI color codes ─────────────────────────────────────────────────────────
//
// Using raw ANSI escape codes — no external library.
// We check isTTY so colors are stripped when output is piped.

const isTTY = process.stdout.isTTY ?? true;

function ansi(code, text) {
  if (!isTTY) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const clr = {
  blue:    t => ansi('38;2;77;158;255', t),
  cream:   t => ansi('38;2;232;220;195', t),
  gray:    t => ansi('38;2;100;100;112', t),
  grayMid: t => ansi('38;2;160;155;150', t),
  green:   t => ansi('38;2;92;186;125', t),
  yellow:  t => ansi('38;2;212;166;74', t),
  red:     t => ansi('38;2;224;92;92', t),
  bold:    t => ansi('1', t),
  dim:     t => ansi('2', t),
};

// ─── Symbols ──────────────────────────────────────────────────────────────────

export const sym = {
  tick:   clr.green('✓'),
  cross:  clr.red('✗'),
  dot:    clr.blue('◆'),
  warn:   clr.yellow('◆'),
  arrow:  clr.gray('›'),
};

// ─── Fabio ASCII art ──────────────────────────────────────────────────────────
//
// Designed to look like Fabio — the pixel-art blue robot mascot.
// Blue tones, antenna on top, round body, small feet.

const FABIO_ART = [
  '          ░░  ★  ░░          ',
  '           ╲  │  ╱           ',
  '        ╭───────────╮        ',
  '      ╭─┤  ◼◻  ◼◻  ├─╮      ',
  '      │ │           │ │      ',
  '      ╰─┤   ╰───╯   ├─╯      ',
  '        │  ╱╱╱╱╱╱╱  │        ',
  '        ╰───────────╯        ',
  '         ╱╱       ╲╲         ',
];

// ─── Banner ───────────────────────────────────────────────────────────────────

export function printBanner() {
  process.stdout.write('\x1b[2J\x1b[H'); // clear screen
  printBlank();

  for (const line of FABIO_ART) {
    printLine(clr.blue(line));
  }

  printBlank();
  printLine(
    clr.bold(clr.cream('FABION')) +
    clr.gray('  ·  AI-native workspace  ·  ') +
    clr.blue('v0.1.0')
  );
  printBlank();
  printLine(clr.gray('─'.repeat(48)));
  printBlank();
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
//
// Shows an animated spinner while the agent is working.
// Clears itself when done.

const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
let _spinnerTimer = null;
let _spinnerFrame = 0;

export function startSpinner(label = 'Working...') {
  if (!isTTY || _spinnerTimer) return;
  _spinnerFrame = 0;

  _spinnerTimer = setInterval(() => {
    const frame = SPINNER_FRAMES[_spinnerFrame % SPINNER_FRAMES.length];
    process.stdout.write(`\r  ${clr.blue(frame)}  ${clr.grayMid(label)}   `);
    _spinnerFrame++;
  }, 80);
}

export function stopSpinner(label = '', success = true) {
  if (_spinnerTimer) {
    clearInterval(_spinnerTimer);
    _spinnerTimer = null;
  }
  if (!isTTY) return;

  const icon = success ? sym.tick : sym.cross;
  const text = label ? clr.grayMid(label) : '';
  process.stdout.write(`\r  ${icon}  ${text}\n`);
}

// ─── Print helpers ────────────────────────────────────────────────────────────

export function printLine(text) {
  console.log(`  ${text}`);
}

export function printBlank() {
  console.log('');
}

export function printDivider() {
  console.log(clr.gray('  ' + '─'.repeat(48)));
}

export function printPrompt() {
  process.stdout.write(clr.blue('\n  ❯ ') + clr.cream(''));
}

// Print a Fabio response with word wrapping
export function printFabioSays(text) {
  printBlank();
  printLine(`${sym.dot}  ${clr.bold(clr.blue('Fabio'))}`);
  printBlank();

  // Word-wrap at 50 characters
  const words    = text.split(' ');
  let   line     = '';
  const maxWidth = 50;

  for (const word of words) {
    if ((line + word).length > maxWidth) {
      if (line.trim()) printLine(clr.cream('   ' + line.trim()));
      line = '';
    }
    line += word + ' ';
  }
  if (line.trim()) printLine(clr.cream('   ' + line.trim()));

  printBlank();
}

// ─── Help ─────────────────────────────────────────────────────────────────────

export function printHelp() {
  printBlank();
  printLine(clr.bold(clr.cream('Commands')));
  printBlank();
  printLine(`  ${clr.blue('help')}      ${clr.gray('Show this help message')}`);
  printLine(`  ${clr.blue('status')}    ${clr.gray('Show agent and model status')}`);
  printLine(`  ${clr.blue('clear')}     ${clr.gray('Clear the screen')}`);
  printLine(`  ${clr.blue('exit')}      ${clr.gray('Quit Fabion')}`);
  printBlank();
  printLine(clr.gray('  Or type any message to talk to Fabio.'));
  printBlank();
  printDivider();
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function printStatus() {
  printBlank();
  printLine(clr.bold(clr.cream('Status')));
  printBlank();
  printLine(`  ${sym.tick}   ${clr.grayMid('CLI')}           ${clr.green('running')}`);
  printLine(`  ${sym.warn}   ${clr.grayMid('Agent')}         ${clr.yellow('no model connected')}`);
  printLine(`  ${sym.warn}   ${clr.grayMid('Model')}         ${clr.yellow('Phase 6')}`);
  printLine(`  ${sym.warn}   ${clr.grayMid('Tools')}         ${clr.yellow('Phase 3')}`);
  printLine(`  ${sym.warn}   ${clr.grayMid('Desktop')  }     ${clr.yellow('Phase 2')}`);
  printBlank();
  printDivider();
}
