import {
  c,
  FABIO_ART,
  activityLabel,
  activityFrames,
  syntaxHighlight,
  stripAnsi,
  visibleLength,
  truncate,
} from "./theme.js";
import { cwd } from "node:process";
import { basename } from "node:path";

const VERSION = "0.1.0";
const TOP_BAR_H = 1;
const BOTTOM_BAR_H = 0;
const INPUT_H = 3;

export class FabionTUI {
  constructor({ agent, modelName = "unknown" }) {
    this.agent = agent;
    this.modelName = modelName;
    this.cwd = cwd();
    this.projectName = basename(this.cwd);

    this.messages = [];
    this.input = "";
    this.cursor = 0;
    this.history = [];
    this.historyIdx = -1;
    this.isGenerating = false;
    this.activity = "idle";
    this.activityText = activityLabel.idle;
    this._activityFrame = 0;
    this._activityTimer = null;
    this.scrollOffset = 0;
    this._chatLines = [];
    this._dirty = true;

    // Session stats
    this.sessionStart = Date.now();
    this.toolCalls = 0;
    this.tokenCount = 0;
    this.filesContext = [];
    this.toolStats = { Read: 0, Edit: 0, Search: 0, Run: 0 };

    this.width = process.stdout.columns ?? 120;
    this.height = process.stdout.rows ?? 30;

    this.agent.on((e) => this._onAgentEvent(e));
  }

  // ── Start ──────────────────────────────────────────────────────────────────

  async start() {
    this._setupTerminal();
    this._render();
    await this._inputLoop();
  }

  _setupTerminal() {
    process.stdout.write("\x1b[?1049h\x1b[?25l");
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanup = () => {
      this._stopActivityAnimation();
      process.stdout.write("\x1b[?25h\x1b[?1049l");
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.exit(0);
    };
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.stdout.on("resize", () => {
      this.width = process.stdout.columns ?? 120;
      this.height = process.stdout.rows ?? 30;
      this._dirty = true;
      this._render();
    });
  }

  async _inputLoop() {
    return new Promise(() => {
      process.stdin.on("data", (k) => this._handleKey(k));
    });
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  _handleKey(key) {
    if (key === "\x03") {
      process.emit("SIGINT");
      return;
    }
    if (this.isGenerating) return;
    if (key === "\r" || key === "\n") {
      this._submit().catch((error) => {
        this._stopActivityAnimation();
        this.isGenerating = false;
        this._setActivity("error");
        this.messages.push({
          role: "error",
          content: error.message ?? String(error),
        });
        this._dirty = true;
        this._render();
      });
      return;
    }
    if (key === "\x7f" || key === "\x08") {
      this._backspace();
      return;
    }
    if (key === "\x1b[A") {
      this._histUp();
      this._render();
      return;
    }
    if (key === "\x1b[B") {
      this._histDown();
      this._render();
      return;
    }
    if (key === "\x1b[C") {
      this.cursor = Math.min(this.input.length, this.cursor + 1);
      this._render();
      return;
    }
    if (key === "\x1b[D") {
      this.cursor = Math.max(0, this.cursor - 1);
      this._render();
      return;
    }
    if (key === "\x1b[H" || key === "\x01") {
      this.cursor = 0;
      this._render();
      return;
    }
    if (key === "\x1b[F" || key === "\x05") {
      this.cursor = this.input.length;
      this._render();
      return;
    }
    if (key === "\x1b[5~") {
      this.scrollOffset = Math.min(
        this.scrollOffset + 5,
        Math.max(0, this._chatLines.length - 1),
      );
      this._render();
      return;
    }
    if (key === "\x1b[6~") {
      this.scrollOffset = Math.max(0, this.scrollOffset - 5);
      this._render();
      return;
    }
    if (key === "\x15") {
      this.input = "";
      this.cursor = 0;
      this._render();
      return;
    }
    if (key.length === 1 && key >= " ") {
      this.input =
        this.input.slice(0, this.cursor) + key + this.input.slice(this.cursor);
      this.cursor++;
      this._render();
      return;
    }
    if (key.length > 1 && !key.startsWith("\x1b")) {
      this.input =
        this.input.slice(0, this.cursor) + key + this.input.slice(this.cursor);
      this.cursor += key.length;
      this._render();
    }
  }

  _backspace() {
    if (this.cursor === 0) return;
    this.input =
      this.input.slice(0, this.cursor - 1) + this.input.slice(this.cursor);
    this.cursor--;
    this._render();
  }

  _histUp() {
    if (!this.history.length) return;
    this.historyIdx = Math.min(this.historyIdx + 1, this.history.length - 1);
    this.input = this.history[this.historyIdx] ?? "";
    this.cursor = this.input.length;
  }

  _histDown() {
    if (this.historyIdx <= 0) {
      this.historyIdx = -1;
      this.input = "";
      this.cursor = 0;
      return;
    }
    this.historyIdx--;
    this.input = this.history[this.historyIdx] ?? "";
    this.cursor = this.input.length;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async _submit() {
    const text = this.input.trim();
    if (!text) return;
    this.history.unshift(text);
    this.historyIdx = -1;
    this.input = "";
    this.cursor = 0;

    if (text === "/clear") {
      this.messages = [];
      this._dirty = true;
      this._render();
      return;
    }
    if (text === "/help") {
      this._addHelp();
      return;
    }
    if (text === "/exit" || text === "exit") {
      process.emit("SIGINT");
      return;
    }

    this.messages.push({ role: "user", content: text });
    this.messages.push({ role: "assistant", content: "" });
    this.isGenerating = true;
    this._setActivity("loading");
    this._startActivityAnimation();
    this.scrollOffset = 0;
    this._dirty = true;
    this._render();

    try {
      await this.agent.run(text);
    } catch (e) {
      this.messages.push({ role: "error", content: e.message ?? String(e) });
    } finally {
      this._stopActivityAnimation();
      this.isGenerating = false;
      this._setActivity("idle");
      this.scrollOffset = 0;
      this._dirty = true;
      this._render();
    }
  }

  // ── Agent events ───────────────────────────────────────────────────────────

  _onAgentEvent(e) {
    switch (e.type) {
      case "thinking":
        this._setActivity("thinking");
        break;
      case "response_chunk": {
        const last = this.messages[this.messages.length - 1];
        if (last?.role === "assistant") {
          last.content += e.delta ?? "";
          this._dirty = true;
        }
        this._setActivity("thinking");
        break;
      }
      case "tool_call":
        this._setActivity("coding");
        this.toolCalls++;
        const tn = (e.toolName ?? "").toLowerCase();
        if (tn.includes("read")) this.toolStats.Read++;
        if (tn.includes("write") || tn.includes("edit")) this.toolStats.Edit++;
        if (tn.includes("search")) this.toolStats.Search++;
        if (tn.includes("run") || tn.includes("command")) this.toolStats.Run++;
        break;
      case "done":
        this._setActivity("done");
        break;
      case "error":
        this._setActivity("error");
        if (
          this.messages.at(-1)?.role === "assistant" &&
          !this.messages.at(-1).content
        ) {
          this.messages.at(-1).content =
            `Error: ${e.message ?? "The model request failed"}`;
          this._dirty = true;
        }
        break;
    }
    this._render();
  }

  _setActivity(s) {
    this.activity = s;
    this.activityText = activityLabel[s] ?? activityLabel.idle;
  }

  _startActivityAnimation() {
    if (this._activityTimer) return;
    this._activityFrame = 0;
    this._activityTimer = setInterval(() => {
      const frames = this._currentActivityFrames();
      this._activityFrame = (this._activityFrame + 1) % frames.length;
      this._dirty = true;
      this._render();
    }, 140);
  }

  _stopActivityAnimation() {
    if (!this._activityTimer) return;
    clearInterval(this._activityTimer);
    this._activityTimer = null;
  }

  _currentActivityFrames() {
    return activityFrames[this.activity] ?? activityFrames.loading;
  }

  // ── Session time ───────────────────────────────────────────────────────────

  _sessionTime() {
    const s = Math.floor((Date.now() - this.sessionStart) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _render() {
    if (this.messages.length === 0 && !this.isGenerating) {
      this._renderWelcome();
      return;
    }

    const W = this.width;
    const H = this.height;

    const mainW = W;
    const chatH = H - TOP_BAR_H - INPUT_H - BOTTOM_BAR_H;

    const frame = [];

    // ── Top bar ──────────────────────────────────────────────────────────────
    const fabioIcon = c.blue("⬡");
    const appName = c.bold(c.blue("Fabion")) + c.gray(` v${VERSION}`);
    const pathStr = c.grayMid(`~/${this.projectName}`);
    const modelStr =
      c.gray("Model: ") + c.grayLight(truncate(stripAnsi(this.modelName), 30));
    const onlineStr = c.green("● Online");

    const leftTop = ` ${fabioIcon} ${appName}   ${pathStr}`;
    const rightTop = `${modelStr}   ${onlineStr} `;
    const leftVis = visibleLength(leftTop);
    const rightVis = visibleLength(rightTop);
    const topGap = Math.max(1, W - leftVis - rightVis);
    frame.push(c.bgBar(leftTop + " ".repeat(topGap) + rightTop));

    // ── Chat rows ─────────────────────────────────────────────────────────────
    if (this._dirty) {
      this._chatLines = this._buildChatLines(mainW - 2);
      this._dirty = false;
    }

    const total = this._chatLines.length;
    const start = Math.max(0, total - chatH - this.scrollOffset);
    const end = Math.max(0, total - this.scrollOffset);
    const slice = this._chatLines.slice(start, end);

    const chatRows = slice;

    // Compose rows at full terminal width.
    for (let i = 0; i < chatRows.length; i++) {
      const chatLine = chatRows[i] ?? "";
      const chatVis = visibleLength(chatLine);
      const chatPad = " ".repeat(Math.max(0, mainW - chatVis));
      frame.push(chatLine + chatPad);
    }

    // ── Input bar ─────────────────────────────────────────────────────────────
    frame.push(...this._inputBox(W));

    for (let i = chatRows.length; i < chatH; i++) {
      frame.push(" ".repeat(mainW));
    }

    // ── Write ─────────────────────────────────────────────────────────────────
    process.stdout.write("\x1b[H" + frame.slice(0, H).join("\r\n"));
  }

  _renderWelcome() {
    const W = this.width;
    const H = this.height;
    const frame = [""];
    const art = FABIO_ART;
    const artWidth = art.length ? visibleLength(art[0]) : 0;
    const info = [
      c.grayLight("Fabion Code ") + c.gray("v2.0.0"),
      c.grayLight("Fabio ") +
        c.gray("1.0 · ") +
        c.grayLight("Fabion Enterprise"),
      c.gray(this.cwd),
    ];

    for (let index = 0; index < Math.max(art.length, info.length); index++) {
      const mascot = art[index] ?? " ".repeat(artWidth);
      const label = info[index] ?? "";
      frame.push(` ${mascot}${" ".repeat(3)}${label}`);
    }

    frame.push(...this._inputBox(W, true));

    while (frame.length < H) frame.push("");
    process.stdout.write("\x1b[H" + frame.slice(0, H).join("\r\n"));
  }

  _inputLine(W) {
    const inputWidth = Math.max(1, W - 6);
    let display = this.input;
    let cursor = this.cursor;

    if (display.length > inputWidth) {
      const start = Math.max(0, cursor - Math.floor(inputWidth / 2));
      display = display.slice(start, start + inputWidth);
      cursor -= start;
    }

    const before = display.slice(0, cursor);
    const current = display[cursor] ?? " ";
    const after = display.slice(cursor + 1);
    const rendered =
      c.grayLight(before) + c.bgInput(c.white(current)) + c.grayLight(after);

    return `  ${c.bold(c.gray("> "))}${rendered}`;
  }

  _inputBox(W, welcome = false) {
    const innerWidth = Math.max(1, W - 2);
    let content;

    if (this.isGenerating) {
      const frames = this._currentActivityFrames();
      const frame =
        this.activity === "coding"
          ? c.orange(frames[this._activityFrame % frames.length])
          : c.blue(frames[this._activityFrame % frames.length]);
      content = `  ${frame} ${this.activityText}   ${c.dim(c.gray("Ctrl+C to stop"))}`;
    } else if (welcome && !this.input) {
      content = `  ${c.bold(c.gray("> Run "))}${c.bgInput(c.green("[1]"))}${c.bold(c.gray(" tests."))}`;
    } else if (this.input) {
      content = this._inputLine(W);
    } else {
      content = `  ${c.bold(c.gray("> "))}${c.dim(c.gray("Ask Fabio anything..."))}`;
    }

    const visible = visibleLength(content);
    const padded = content + " ".repeat(Math.max(0, innerWidth - visible));
    return [
      c.gray("╭" + "─".repeat(innerWidth) + "╮"),
      c.gray("│") + padded + c.gray("│"),
      c.gray("╰" + "─".repeat(innerWidth) + "╯"),
    ];
  }

  // ── Build chat lines ───────────────────────────────────────────────────────

  _buildChatLines(width) {
    const lines = [];
    const identity = [
      c.grayLight("Fabion Code ") + c.gray("v2.0.0"),
      c.grayLight("Fabio ") +
        c.gray("1.0 · ") +
        c.grayLight("Fabion Enterprise"),
      c.gray(this.cwd),
    ];

    for (let index = 0; index < FABIO_ART.length; index++) {
      const mascot = FABIO_ART[index];
      const label = identity[index] ?? "";
      lines.push(` ${mascot}${" ".repeat(3)}${label}`);
    }
    if (!FABIO_ART.length) {
      lines.push(`  ${c.bold(c.blue("Fabion"))} ${c.gray("Fabion workspace")}`);
    }
    lines.push("");

    for (const msg of this.messages) {
      lines.push("");
      if (msg.role === "user") {
        lines.push(
          c.bold(c.teal("> ")) +
            c.bold(c.grayLight("You: ")) +
            c.cream(msg.content),
        );
      } else if (msg.role === "assistant") {
        lines.push(c.blue("● ") + c.bold(c.blue("Fabio: ")));
        for (const l of this._renderMd(msg.content, width - 2)) {
          lines.push("  " + l);
        }
      } else if (msg.role === "activity") {
        lines.push(`  ${c.gray("○")} ${c.dim(c.grayMid(msg.content))}`);
      } else if (msg.role === "error") {
        lines.push(c.red("✗ Error: ") + c.red(msg.content));
      }
    }
    if (lines.length) lines.push("");
    return lines;
  }

  _renderMd(text, width) {
    if (!text) return [c.gray("...")];
    const out = [];
    let inCode = false;
    let lang = "";
    let codeLines = [];

    for (const raw of text.split("\n")) {
      if (raw.startsWith("```")) {
        if (!inCode) {
          inCode = true;
          lang = raw.slice(3).trim();
          codeLines = [];
        } else {
          // Render code block with syntax highlighting
          const bar = c.gray("  " + "─".repeat(Math.min(width - 4, 50)));
          const langLabel = lang ? c.dim(c.grayMid("  " + lang)) : "";
          if (langLabel) out.push(langLabel);
          out.push(bar);
          const highlighted = syntaxHighlight(codeLines.join("\n"), lang);
          for (const cl of highlighted.split("\n")) {
            out.push(
              c.bgCode(
                "  " +
                  cl +
                  " ".repeat(Math.max(0, width - visibleLength(cl) - 4)),
              ) + "\x1b[0m",
            );
          }
          out.push(bar);
          inCode = false;
          lang = "";
          codeLines = [];
        }
        continue;
      }
      if (inCode) {
        codeLines.push(raw);
        continue;
      }

      // Tool activity lines
      if (
        raw.startsWith("○ ") ||
        raw.startsWith("✓ ") ||
        raw.startsWith("◌ ")
      ) {
        const icon = raw.startsWith("✓") ? c.green("✓") : c.gray("○");
        out.push(`${icon} ${c.grayMid(raw.slice(2))}`);
        continue;
      }

      if (raw.startsWith("# ")) {
        out.push(c.bold(c.cream(raw.slice(2))));
        continue;
      }
      if (raw.startsWith("## ")) {
        out.push(c.bold(c.grayLight(raw.slice(3))));
        continue;
      }
      if (raw.startsWith("### ")) {
        out.push(c.bold(c.gray(raw.slice(4))));
        continue;
      }
      if (raw.match(/^[\*\-] /)) {
        out.push(c.blue("  ○") + " " + this._inline(raw.slice(2)));
        continue;
      }
      if (raw.match(/^\d+\. /)) {
        out.push(
          c.grayMid("  " + raw.match(/^(\d+)\./)[0]) +
            " " +
            this._inline(raw.replace(/^\d+\.\s*/, "")),
        );
        continue;
      }
      if (raw.trim() === "") {
        out.push("");
        continue;
      }

      for (const l of this._wrap(stripAnsi(this._inline(raw)), width - 2)) {
        out.push(this._inline(l));
      }
    }
    return out.length ? out : [c.gray("(empty)")];
  }

  _inline(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g, (_, x) => c.bold(c.white(x)))
      .replace(
        /`([^`]+)`/g,
        (_, x) => c.bgCode(c.cyan(" " + x + " ")) + "\x1b[0m",
      );
  }

  _wrap(text, width) {
    if (!text || width <= 0) return [text || ""];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      if ((line + (line ? " " : "") + w).length > width) {
        if (line) lines.push(line);
        line = w;
      } else line = line ? `${line} ${w}` : w;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  _addHelp() {
    this.messages.push({
      role: "assistant",
      content: [
        "## Fabion Help",
        "",
        "**Commands:**",
        "- `/clear` — clear conversation",
        "- `/help` — show this help",
        "- `/exit` — quit",
        "",
        "**Keyboard:**",
        "- `Enter` send · `↑↓` history",
        "- `PgUp/Dn` scroll · `Ctrl+U` clear input · `Ctrl+C` quit",
      ].join("\n"),
    });
    this._dirty = true;
    this._render();
  }
}
