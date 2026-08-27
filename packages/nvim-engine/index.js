import { spawn, spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { attach } from "neovim";

export class NeovimEditor {
  constructor({ nvimPath = "nvim", cwd = process.cwd() } = {}) {
    this.nvimPath = nvimPath;
    this.cwd = resolve(cwd);
    this.process = null;
    this.nvim = null;
    this.buffer = null;
    this.closed = false;
  }

  async start() {
    if (this.nvim) return this;
    this._assertNeovimAvailable();

    this.process = spawn(this.nvimPath, ["--headless", "--clean", "--embed"], {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.closed = false;

    const crashed = new Promise((_, reject) => {
      this.process.once("error", reject);
      this.process.once("exit", (code, signal) => {
        if (!this.closed) {
          reject(
            new Error(
              `Neovim exited unexpectedly (code=${code}, signal=${signal ?? "none"})`,
            ),
          );
        }
      });
    });

    try {
      this.nvim = attach({ proc: this.process });
      await Promise.race([this.nvim.apiInfo, crashed]);
      this.buffer = await this.nvim.buffer;
      return this;
    } catch (error) {
      await this.close();
      throw new Error(`Could not connect to headless Neovim: ${error.message}`);
    }
  }

  async loadFile(filePath) {
    await this._ensureStarted();
    const path = resolve(this.cwd, filePath);
    await access(path, constants.F_OK);
    await this.nvim.command(`edit ${this._escapeCommandPath(path)}`);
    this.buffer = await this.nvim.buffer;
    return this.getBufferText();
  }

  async getBufferText() {
    await this._ensureStarted();
    return (await this.buffer.lines).join("\n");
  }

  async append(lineNumber, text) {
    await this._ensureStarted();
    const lines = this._textToLines(text);
    this._assertLineNumber(lineNumber);
    await this.buffer.setLines(lines, {
      start: lineNumber,
      end: lineNumber,
      strictIndexing: true,
    });
  }

  async delete(startLine, endLine = startLine + 1) {
    await this._ensureStarted();
    this._assertRange(startLine, endLine);
    await this.buffer.setLines([], {
      start: startLine - 1,
      end: endLine,
      strictIndexing: true,
    });
  }

  async replace(startLine, endLine, text) {
    await this._ensureStarted();
    this._assertRange(startLine, endLine);
    await this.buffer.setLines(this._textToLines(text), {
      start: startLine - 1,
      end: endLine,
      strictIndexing: true,
    });
  }

  async close() {
    if (!this.process) return;
    this.closed = true;
    const nvim = this.nvim;
    const child = this.process;
    this.nvim = null;
    this.buffer = null;

    try {
      if (nvim) await nvim.command("qa!");
    } catch {
      // The process may already have exited; killing it below is the fallback.
    }

    if (!child.killed) child.kill();
    this.process = null;
  }

  _assertNeovimAvailable() {
    const result = spawnSync(this.nvimPath, ["--version"], {
      stdio: "ignore",
      windowsHide: true,
    });
    if (result.error?.code === "ENOENT" || result.status === null) {
      throw new Error(
        `Neovim was not found in PATH. Install Neovim and ensure "${this.nvimPath}" is available.`,
      );
    }
    if (result.status !== 0) {
      throw new Error(`Unable to run Neovim at "${this.nvimPath}".`);
    }
  }

  async _ensureStarted() {
    if (!this.nvim || !this.process) await this.start();
  }

  _textToLines(text) {
    if (typeof text !== "string") throw new TypeError("Text must be a string");
    return text.split("\n");
  }

  _assertLineNumber(lineNumber) {
    if (!Number.isInteger(lineNumber) || lineNumber < 1) {
      throw new RangeError("Line numbers are one-based integers starting at 1");
    }
  }

  _assertRange(startLine, endLine) {
    this._assertLineNumber(startLine);
    if (!Number.isInteger(endLine) || endLine < startLine) {
      throw new RangeError(
        "endLine must be an integer greater than or equal to startLine",
      );
    }
  }

  _escapeCommandPath(filePath) {
    return `'${filePath.replaceAll("'", "''")}'`;
  }
}
