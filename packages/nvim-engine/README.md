# @fabion/nvim-engine

A lightweight, headless Neovim RPC editing engine for Fabion.

## Overview

This module spawns a background Neovim instance using its native RPC architecture, allowing programmatic control of buffer contents without any visible GUI or TUI.

## Usage

```js
import { NeovimEditor } from "@fabion/nvim-engine";

const editor = new NeovimEditor({ cwd: "/path/to/project" });

// Start the headless Neovim instance
await editor.start();

// Load a file into the buffer
await editor.loadFile("path/to/file.js");

// Get the current buffer content
const content = await editor.getBufferText();

// Append text at line 5
await editor.append(5, "new line");

// Replace lines 10-15 with new content
await editor.replace(10, 15, "replacement text\nmore text");

// Delete lines 20-25
await editor.delete(20, 25);

// Clean up and terminate the Neovim process
await editor.close();
```

## API

### Constructor

```js
new NeovimEditor({ nvimPath = "nvim", cwd = process.cwd() })
```

- `nvimPath`: Path to the Neovim executable (default: `"nvim"` from `PATH`)
- `cwd`: Working directory for the Neovim instance

### Methods

All methods are async:

- `start()` — Launch the headless Neovim instance and establish RPC connection
- `loadFile(filePath)` — Load a file into the current buffer; returns the file content
- `getBufferText()` — Get the entire buffer as a string
- `append(lineNumber, text)` — Append text at one-based line number
- `delete(startLine, endLine)` — Delete lines from `startLine` to `endLine` (inclusive)
- `replace(startLine, endLine, text)` — Replace lines with new text
- `close()` — Gracefully terminate the Neovim process with `:qa!`

## Requirements

- Neovim must be installed and available in `PATH` (or specify `nvimPath` option)
- Node.js ≥ 20.0.0
