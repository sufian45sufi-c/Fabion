/**
 * apps/cli/index.js
 *
 * Fabion CLI entry point.
 *
 * Responsibilities:
 *   - Parse command-line arguments
 *   - Start the interactive REPL or handle a one-shot task
 *   - Pass user input to the agent
 *   - Display Fabio's responses using ui.js
 *
 * Usage:
 *   node apps/cli/index.js                     → interactive REPL
 *   node apps/cli/index.js "build a landing page"  → one-shot task
 */

import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { FabionAgent } from '../../packages/agents/index.js';
import { OpenRouterProvider } from '../../packages/core/qwen.js';
import { printBanner, printLine, printBlank, printPrompt,
         printDivider, printFabioSays, printHelp,
         printStatus, startSpinner, stopSpinner, clr, sym } from './ui.js';

// ─── Build the agent ─────────────────────────────────────────────────────────
//
// No model connected yet — that comes in Phase 6.
// The agent will give stub responses until then.

const agent = new FabionAgent({
  model: new OpenRouterProvider(),
  tools:  [],     // tools added in Phase 3
  skills: [],     // skills added in Phase 5
});

// ─── Listen to agent events ───────────────────────────────────────────────────
//
// The agent emits events as it works.
// Here we translate them into CLI output.

agent.on((event) => {
  switch (event.type) {
    case 'thinking':
      startSpinner('Fabio is thinking...');
      break;
    case 'tool_call':
      stopSpinner();
      printLine(`${sym.arrow}  Using tool: ${clr.blue(event.toolName)}`);
      break;
    case 'tool_result':
      printLine(`${event.success ? sym.tick : sym.cross}  ${clr.grayMid(event.toolName)}`);
      break;
    case 'done':
      stopSpinner('Done');
      break;
    case 'error':
      stopSpinner('Error', false);
      break;
  }
});

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Check for an inline task: fabion "do something"
  const inlineTask = process.argv
    .slice(2)
    .filter(a => a !== '--')
    .join(' ')
    .trim();

  printBanner();

  if (inlineTask) {
    await runOneShot(inlineTask);
    return;
  }

  await runRepl();
}

// ─── One-shot mode ────────────────────────────────────────────────────────────
// fabion "build a landing page"

async function runOneShot(task) {
  printLine(`${sym.dot}  ${clr.cream('Task:')} ${clr.grayMid(task)}`);
  printBlank();

  const response = await agent.run(task);

  printFabioSays(response);
  printDivider();
  printBlank();
}

// ─── Interactive REPL ─────────────────────────────────────────────────────────

async function runRepl() {
  printLine(clr.cream('  What are we building today?'));
  printLine(clr.gray('  Type a prompt, "help", or "exit"'));
  printBlank();
  printDivider();

  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });

  // Ctrl+C exits cleanly
  process.on('SIGINT', () => {
    printBlank();
    printFabioSays('Catch you later.');
    rl.close();
    process.exit(0);
  });

  while (true) {
    printPrompt();

    let line;
    try {
      line = await rl.question('');
    } catch {
      break; // Ctrl+D / EOF
    }

    const cmd = line.trim();
    if (!cmd) continue;

    // ── Built-in commands ───────────────────────────────────────────────────

    if (cmd === 'exit' || cmd === 'quit') break;
    if (cmd === 'clear') { printBanner(); continue; }
    if (cmd === 'help')  { printHelp();   continue; }
    if (cmd === 'status'){ printStatus(); continue; }

    // ── Pass to agent ────────────────────────────────────────────────────────

    const response = await agent.run(cmd);
    printFabioSays(response);
    printDivider();
  }

  rl.close();
  printBlank();
  printFabioSays('Catch you later.');
  printBlank();
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
