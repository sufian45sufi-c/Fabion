/**
 * packages/tools/read-file.js
 *
 * Reads the contents of a file.
 * Permission: READ — safe, no side effects.
 *
 * Input:
 *   { path: string }   — absolute or relative path to the file
 *
 * Output:
 *   The file contents as a string.
 */

import { readFile } from 'node:fs/promises';
import { Tool } from '@fabion/core';

export const readFileTool = new Tool({
  name:        'read_file',
  description: 'Read the contents of a file. Use this to understand existing code or configuration.',
  permission:  'read',

  async execute({ path }) {
    if (!path) throw new Error('read_file requires a "path" argument');

    const contents = await readFile(path, 'utf-8');
    return contents;
  },
});
