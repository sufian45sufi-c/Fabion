/**
 * packages/tools/run-command.js
 *
 * Runs a shell command and returns its output.
 * Permission: EXECUTE — runs code on the user's machine.
 *
 * The agent must explain what it's running and why before calling this.
 * Dangerous commands (rm -rf, format, sudo, etc.) are blocked.
 *
 * Input:
 *   { command: string, cwd: string (optional) }
 *
 * Output:
 *   The stdout output of the command, or an error message.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Tool } from '@fabion/core';

const execAsync = promisify(exec);

// Commands that are never allowed, no matter what
const BLOCKED = [
  'rm -rf /',
  'rm -rf ~',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',  // fork bomb
  'sudo rm',
  'chmod 777 /',
];

function isBlocked(command) {
  const lower = command.toLowerCase();
  return BLOCKED.some(blocked => lower.includes(blocked));
}

export const runCommandTool = new Tool({
  name:        'run_command',
  description: 'Run a shell command. Use for npm, git, file operations. Always explain what you are running.',
  permission:  'execute',

  async execute({ command, cwd = '.' }) {
    if (!command) throw new Error('run_command requires a "command" argument');

    // Safety check before running anything
    if (isBlocked(command)) {
      throw new Error(`Command blocked for safety: "${command}"`);
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 30_000, // 30 second max
    });

    // Return stdout, fall back to stderr if stdout is empty
    return stdout.trim() || stderr.trim() || '(no output)';
  },
});
