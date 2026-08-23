/**
 * packages/tools/write-file.js
 *
 * Writes content to a file. Creates the file if it doesn't exist.
 * Creates parent directories automatically.
 * Permission: WRITE — modifies the filesystem.
 *
 * Input:
 *   { path: string, content: string }
 *
 * Output:
 *   Confirmation message with the path written.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Tool } from '@fabion/core';

export const writeFileTool = new Tool({
  name:        'write_file',
  description: 'Write content to a file. Creates the file and any missing parent directories.',
  permission:  'write',

  async execute({ path, content }) {
    if (!path)    throw new Error('write_file requires a "path" argument');
    if (content === undefined) throw new Error('write_file requires a "content" argument');

    // Make sure the parent directory exists before writing
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf-8');

    return `Written: ${path} (${content.length} characters)`;
  },
});
