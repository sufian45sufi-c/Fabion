/**
 * packages/tools/list-dir.js
 *
 * Lists the files and folders inside a directory.
 * Permission: READ — safe, no side effects.
 *
 * Input:
 *   { path: string }   — directory to list (defaults to current directory)
 *
 * Output:
 *   A formatted string showing the directory tree (one level deep).
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Tool } from '@fabion/core';

export const listDirTool = new Tool({
  name:        'list_dir',
  description: 'List files and folders in a directory. Use this to understand project structure.',
  permission:  'read',

  async execute({ path = '.' }) {
    const entries = await readdir(path, { withFileTypes: true });

    // Skip common noise folders
    const skip = new Set(['node_modules', '.git', 'dist', '.cache']);

    const lines = [];
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const icon = entry.isDirectory() ? '📁' : '📄';
      lines.push(`${icon}  ${entry.name}`);
    }

    return lines.join('\n') || '(empty directory)';
  },
});
