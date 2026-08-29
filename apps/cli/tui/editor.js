/**
 * editor.js — Neovim integration for Fabion CLI
 *
 * Seamlessly suspends the Fabion TUI, launches Neovim in the
 * full terminal, then hands control back to Fabion when Neovim exits.
 *
 * Usage:
 *   import { openEditor } from "./editor.js";
 *   const result = await openEditor("/path/to/file.js");
 *   // result: { ok: true } or { error: "message" }
 */

import { spawnSync, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// ── Detect Neovim ─────────────────────────────────────────────────────────────

function findNeovim() {
  // Try nvim first, then fall back to vim, then vi
  const candidates = ["nvim", "vim", "vi"];
  for (const bin of candidates) {
    try {
      execFileSync("which", [bin], { stdio: "pipe" });
      return bin;
    } catch {
      // not found — try next
    }
  }
  return null;
}

// ── Open editor ───────────────────────────────────────────────────────────────

/**
 * openEditor(target)
 *
 * Suspends the Fabion TUI and opens Neovim (or vim/vi) on:
 *   - a specific file path, or
 *   - a directory (opens Neovim's file explorer via `:Ex`)
 *
 * The caller is responsible for restoring the TUI after this resolves.
 *
 * @param {string} target  — absolute or relative path to file or directory
 * @returns {{ ok: boolean, editor: string } | { error: string }}
 */
export async function openEditor(target) {
  const editor = findNeovim();

  if (!editor) {
    return {
      error:
        "Neovim (nvim) is not installed. " +
        "Install it with your package manager:\n" +
        "  Ubuntu/Debian: sudo apt install neovim\n" +
        "  macOS:         brew install neovim\n" +
        "  Arch:          sudo pacman -S neovim",
    };
  }

  const targetPath = resolve(target);

  // Validate path exists (warn but still open if it doesn't — Neovim will create it)
  const exists = existsSync(targetPath);

  // Build args
  // If target is a directory → open with :Ex (netrw file explorer)
  // If target is a file → open the file directly
  let args;
  if (exists && (await isDirectory(targetPath))) {
    args = [targetPath];
  } else {
    args = [targetPath];
  }

  // Neovim needs a real tty. spawnSync with stdio:"inherit" gives it exactly that.
  const result = spawnSync(editor, args, {
    stdio: "inherit",   // full terminal control to Neovim
    env: {
      ...process.env,
      // Ensure Neovim gets proper colour support
      TERM: process.env.TERM || "xterm-256color",
      COLORTERM: process.env.COLORTERM || "truecolor",
    },
  });

  if (result.error) {
    return { error: `Failed to launch ${editor}: ${result.error.message}` };
  }

  if (result.status !== 0 && result.status !== null) {
    return { error: `${editor} exited with code ${result.status}` };
  }

  return { ok: true, editor };
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function isDirectory(p) {
  try {
    const { stat } = await import("node:fs/promises");
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}