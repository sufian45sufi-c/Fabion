import {
  c,
  sym,
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

// ── Layout ─────────────────────────────────────────────────────────────────────
const BOTTOM_BAR_H = 1;
const INPUT_MIN_H  = 3;   // ╭─╮ border + 1 content line + ╰─╯
const INPUT_MAX_H  = 7;   // max 5 content lines
const MIN_CHAT_H   = 3;

// ── Braille spinner — exact same set Claude Code uses ─────────────────────────
const BRAILLE = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];

export class FabionTUI {
  constructor({ agent, modelName = "unknown" }) {
    this.agent       = agent;
    this.modelName   = modelName;
    this.cwd         = cwd();
    this.projectName = basename(this.cwd);

    // ── Input state ────────────────────────────────────────────────────────────
    this.inputLines  = [""];   // multi-line buffer
    this.inputRow    = 0;
    this.inputCol    = 0;
    this.history     = [];
    this.histIdx     = -1;
    this._inputFocus = true;

    // ── Conversation ───────────────────────────────────────────────────────────
    this.messages     = [];
    this.isGenerating = false;
    this.activity     = "idle";

    // ── Animation ─────────────────────────────────────────────────────────────
    this._frame      = 0;
    this._timer      = null;
    this._elapsed    = 0;       // seconds since generation started
    this._elapsedTimer = null;

    // ── Scroll ────────────────────────────────────────────────────────────────
    this.scrollOffset   = 0;
    this._chatLines     = [];
    this._dirty         = true;
    this._hasNewContent = false;

    // ── Stats ──────────────────────────────────────────────────────────────────
    this.sessionStart    = Date.now();
    this.toolCalls       = 0;
    this.tokenCount      = 0;
    this._currentToolLog = [];

    // ── Terminal size ──────────────────────────────────────────────────────────
    this.W = process.stdout.columns ?? 120;
    this.H = process.stdout.rows    ?? 30;

    this.agent.on((e) => this._onEvent(e));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════════════════

  async start() {
    this._setupTerminal();
    this._render();
    await new Promise(() => process.stdin.on("data", (k) => this._key(k)));
  }

  _setupTerminal() {
    process.stdout.write("\x1b[?1049h\x1b[?25l");
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.on("SIGINT",  () => this._exit());
    process.on("SIGTERM", () => this._exit());
    process.stdout.on("resize", () => {
      this.W = process.stdout.columns ?? 120;
      this.H = process.stdout.rows    ?? 30;
      this._dirty = true;
      this._render();
    });
  }

  _exit() {
    this._stopAnim();
    process.stdout.write("\x1b[?25h\x1b[?1049l\x1b[0m");
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.exit(0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INPUT HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  _key(k) {
    if (k === "\x03") { this._exit(); return; }
    if (this.isGenerating) return;

    // Enter → submit
    if (k === "\r" || k === "\n") {
      this._submit(); return;
    }

    // Escape sequences
    switch (k) {
      case "\x7f":    // backspace
      case "\x08":    this._bs();     this._render(); return;
      case "\x1b[A":  this._hUp();   this._render(); return;  // up
      case "\x1b[B":  this._hDown(); this._render(); return;  // down
      case "\x1b[C":  this._curR();  this._render(); return;  // right
      case "\x1b[D":  this._curL();  this._render(); return;  // left
      case "\x01":                                            // ctrl+a / home
      case "\x1b[H":  this.inputCol = 0; this._render(); return;
      case "\x05":                                            // ctrl+e / end
      case "\x1b[F":  this.inputCol = this._curLine().length; this._render(); return;
      case "\x15":    this._clearInput(); this._render(); return; // ctrl+u
      case "\x1b\r":                                          // alt+enter = newline
      case "\x1b\n":  this._newline(); this._render(); return;
      // pgup/pgdn scroll
      case "\x1b[5~": this._pgUp(); this._render(); return;
      case "\x1b[6~": this._pgDn(); this._render(); return;
    }

    // Printable
    if (k.length >= 1 && (k.length === 1 ? k >= " " : !k.startsWith("\x1b"))) {
      for (const ch of k) {
        if (ch < " ") continue;
        const ln = this._curLine();
        this.inputLines[this.inputRow] = ln.slice(0, this.inputCol) + ch + ln.slice(this.inputCol);
        this.inputCol++;
      }
      this._render();
    }
  }

  _curLine()  { return this.inputLines[this.inputRow] ?? ""; }
  _inputText(){ return this.inputLines.join("\n").trim(); }

  _clearInput() {
    this.inputLines = [""]; this.inputRow = 0; this.inputCol = 0;
  }

  _newline() {
    const ln    = this._curLine();
    const left  = ln.slice(0, this.inputCol);
    const right = ln.slice(this.inputCol);
    this.inputLines[this.inputRow] = left;
    this.inputLines.splice(this.inputRow + 1, 0, right);
    this.inputRow++;
    this.inputCol = 0;
  }

  _bs() {
    if (this.inputCol > 0) {
      const ln = this._curLine();
      this.inputLines[this.inputRow] = ln.slice(0, this.inputCol - 1) + ln.slice(this.inputCol);
      this.inputCol--;
    } else if (this.inputRow > 0) {
      const prev = this.inputLines[this.inputRow - 1];
      this.inputCol = prev.length;
      this.inputLines[this.inputRow - 1] = prev + this._curLine();
      this.inputLines.splice(this.inputRow, 1);
      this.inputRow--;
    }
  }

  _curR() {
    if (this.inputCol < this._curLine().length) this.inputCol++;
    else if (this.inputRow < this.inputLines.length - 1) { this.inputRow++; this.inputCol = 0; }
  }

  _curL() {
    if (this.inputCol > 0) this.inputCol--;
    else if (this.inputRow > 0) { this.inputRow--; this.inputCol = this._curLine().length; }
  }

  _hUp() {
    if (!this.history.length) return;
    this.histIdx = Math.min(this.histIdx + 1, this.history.length - 1);
    this.inputLines = [this.history[this.histIdx]];
    this.inputRow = 0; this.inputCol = this.inputLines[0].length;
  }

  _hDown() {
    this.histIdx = Math.max(-1, this.histIdx - 1);
    this.inputLines = [this.histIdx < 0 ? "" : this.history[this.histIdx]];
    this.inputRow = 0; this.inputCol = this.inputLines[0].length;
  }

  _pgUp() {
    const ph = this._chatH();
    this.scrollOffset = Math.min(this.scrollOffset + Math.floor(ph / 2), Math.max(0, this._chatLines.length - 1));
  }

  _pgDn() {
    this.scrollOffset = Math.max(0, this.scrollOffset - Math.floor(this._chatH() / 2));
    if (this.scrollOffset === 0) this._hasNewContent = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════

  async _submit() {
    const text = this._inputText();
    if (!text) return;

    this.history.unshift(text);
    this.histIdx = -1;
    this._clearInput();

    // Built-in commands
    if (text === "/clear") {
      this.messages = []; this._dirty = true; this._render(); return;
    }
    if (text === "/help")  { this._help(); return; }
    if (text === "/exit")  { this._exit(); return; }

    this.messages.push({ role: "user",      content: text });
    this.messages.push({ role: "assistant", content: "", toolLog: [] });
    this._currentToolLog = this.messages.at(-1).toolLog;

    this.isGenerating   = true;
    this._hasNewContent = false;
    this._elapsed       = 0;
    this.scrollOffset   = 0;
    this._dirty         = true;
    this._activity("loading");
    this._startAnim();
    this._render();

    try {
      await this.agent.run(text);
    } catch (e) {
      this.messages.push({ role: "error", content: e.message ?? String(e) });
    } finally {
      this._stopAnim();
      this.isGenerating    = false;
      this._currentToolLog = [];
      this._activity("idle");
      this.scrollOffset = 0;
      this._dirty       = true;
      this._render();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AGENT EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  _onEvent(e) {
    switch (e.type) {
      case "thinking":
        this._activity("thinking"); break;

      case "response_chunk": {
        const last = this.messages.at(-1);
        if (last?.role === "assistant") {
          last.content += e.delta ?? "";
          this._dirty = true;
          if (this.scrollOffset > 0) this._hasNewContent = true;
        }
        this._activity("thinking"); break;
      }

      case "token_count":
        if (typeof e.count === "number") this.tokenCount += e.count; break;

      case "tool_call": {
        this._activity("coding");
        this.toolCalls++;
        const entry = this._makeToolEntry(e.toolName, e.args ?? {});
        this._currentToolLog.push(entry);
        break;
      }

      case "tool_result": {
        const running = [...this._currentToolLog].reverse().find((x) => x.status === "running");
        if (running) {
          running.status = "done";
          if (typeof e.result === "string") {
            const lc = e.result.split("\n").length;
            if (lc > 1) running.lines = lc;
          }
          if (e.diff) running.diff = e.diff;
        }
        this._activity("thinking");
        // Immediate rebuild so ✓ appears right now
        this._chatLines = this._buildLines(this.W);
        break;
      }

      case "done":   this._activity("done");  break;
      case "error":  this._activity("error"); break;
    }
    this._render();
  }

  _makeToolEntry(name = "", args = {}) {
    const n = name.toLowerCase();
    if (n.includes("read"))
      return { icon: "read",   label: "Read",    file: args.path ?? args.file ?? "",           status: "running", lines: null, diff: null };
    if (n.includes("write"))
      return { icon: "write",  label: "Write",   file: args.path ?? args.file ?? "",           status: "running", lines: null, diff: null };
    if (n.includes("edit") || n.includes("patch"))
      return { icon: "edit",   label: "Edit",    file: args.path ?? args.file ?? "",           status: "running", lines: null, diff: null };
    if (n.includes("list") || n.includes("dir"))
      return { icon: "list",   label: "List",    file: args.path ?? args.dir  ?? "",           status: "running", lines: null, diff: null };
    if (n.includes("search"))
      return { icon: "search", label: "Search",  file: args.pattern ?? args.query ?? "",       status: "running", lines: null, diff: null };
    if (n.includes("run") || n.includes("command") || n.includes("exec"))
      return { icon: "run",    label: "Run",     file: args.command ?? args.cmd ?? "",         status: "running", lines: null, diff: null };
    return   { icon: "tool",   label: name,      file: "",                                      status: "running", lines: null, diff: null };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════

  _activity(s) { this.activity = s; }

  _startAnim() {
    if (this._timer) return;
    this._frame = 0;
    this._timer = setInterval(() => {
      this._frame++;
      this._render();
    }, 80);
    // Elapsed seconds counter
    this._elapsedTimer = setInterval(() => {
      this._elapsed++;
    }, 1000);
  }

  _stopAnim() {
    clearInterval(this._timer);       this._timer        = null;
    clearInterval(this._elapsedTimer);this._elapsedTimer = null;
  }

  _spin()   { return BRAILLE[this._frame % BRAILLE.length]; }
  _elapsedStr() {
    const s = this._elapsed;
    if (s < 60) return `${s}s`;
    return `${Math.floor(s/60)}m${String(s%60).padStart(2,"0")}s`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LAYOUT HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _inputH() {
    const contentLines = Math.max(1, this.inputLines.length);
    const h = Math.min(INPUT_MAX_H, Math.max(INPUT_MIN_H, contentLines + 2));
    return h;
  }

  _chatH() {
    return Math.max(MIN_CHAT_H, this.H - this._inputH() - BOTTOM_BAR_H);
  }

  _sessionAge() {
    const s   = Math.floor((Date.now() - this.sessionStart) / 1000);
    const m   = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  }

  _fmtTok(n) { return n >= 1000 ? (n/1000).toFixed(1)+"k" : String(n); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER ROOT  —  full-screen repaint every tick
  // ═══════════════════════════════════════════════════════════════════════════

  _render() {
    if (this.messages.length === 0 && !this.isGenerating) {
      this._paintWelcome();
    } else {
      this._paintChat();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WELCOME  —  Claude Code identical layout
  //
  //  (blank)
  //  (blank)
  //    fabio.ansi art  │  ◈ Fabion Code
  //                    │    model: …
  //                    │    cwd: …
  //  ────────────────────────────────────
  //  Tips (shortcuts)
  //  (blank)
  //  ╭──────────────── input ──────────────────╮
  //  │ > _                                      │
  //  ╰─────────────────────────────────────────╯
  //  bottom bar
  // ═══════════════════════════════════════════════════════════════════════════

  _paintWelcome() {
    const { W, H } = this;
    const inputH   = this._inputH();
    const frame    = [];

    // ── Mascot + identity block ─────────────────────────────────────────────
    const art     = FABIO_ART;
    const artW    = art.length ? visibleLength(art[0]) : 0;

    const identity = [
      "",
      c.bold(c.teal("◈ Fabion")) + c.gray(" Code") + c.dim(c.gray(`  v${VERSION}`)),
      "",
      c.dim(c.gray("  model  ")) + c.grayLight(truncate(stripAnsi(this.modelName), 36)),
      c.dim(c.gray("  cwd    ")) + c.grayLight(truncate(this.cwd, 36)),
      "",
      c.dim(c.gray("  Today I will help you build anything.")),
    ];

    const blockH = Math.max(art.length, identity.length);
    // Centre the whole block vertically — leave room for input + bar + separator
    const reservedBottom = 2 + inputH + BOTTOM_BAR_H + 4;
    const topPad = Math.max(1, Math.floor((H - blockH - reservedBottom) / 2));

    for (let i = 0; i < topPad; i++) frame.push("");

    for (let i = 0; i < blockH; i++) {
      const left  = art[i]      ?? " ".repeat(artW);
      const right = identity[i] ?? "";
      frame.push("  " + left + "   " + right);
    }

    // ── Separator ───────────────────────────────────────────────────────────
    frame.push("");
    frame.push("  " + c.gray("─".repeat(Math.min(W - 4, 64))));
    frame.push("");

    // ── Quick-help tips — same style as Claude Code ─────────────────────────
    const tip = (key, desc) =>
      "  " + c.dim(c.gray(key.padEnd(18))) + c.gray(desc);

    frame.push(tip("Enter",         "send message"));
    frame.push(tip("Alt+Enter",     "insert newline"));
    frame.push(tip("↑ / ↓",         "browse history"));
    frame.push(tip("PgUp / PgDn",   "scroll conversation"));
    frame.push(tip("/clear",        "clear conversation"));
    frame.push(tip("/help",         "all commands"));
    frame.push("");

    // ── Input box flush to bottom ────────────────────────────────────────────
    const inputStart = H - inputH - BOTTOM_BAR_H;
    while (frame.length < inputStart) frame.push("");

    frame.push(...this._renderInputBox(W, inputH, /* welcome */ true));
    frame.push(this._renderBottomBar(W));

    this._paint(frame);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHAT  —  Claude Code identical layout
  //
  //  ┌──────────────── scrollable messages ────────────────┐
  //  │  ↑ N lines above  (badge, when scrolled up)         │
  //  │  ...messages...                                     │
  //  │  ↓ new content    (badge, when new + scrolled up)   │
  //  └─────────────────────────────────────────────────────┘
  //  ╭──────────────── input ──────────────────────────────╮
  //  │  > _                                                │
  //  ╰─────────────────────────────────────────────────────╯
  //  bottom bar
  // ═══════════════════════════════════════════════════════════════════════════

  _paintChat() {
    const { W, H } = this;
    const inputH   = this._inputH();
    const chatH    = this._chatH();
    const frame    = [];

    // Rebuild message lines when dirty or streaming
    if (this._dirty || this.isGenerating) {
      this._chatLines = this._buildLines(W);
      this._dirty     = false;
    }

    const total  = this._chatLines.length;
    const end    = Math.max(0, total - this.scrollOffset);
    const start  = Math.max(0, end - chatH);
    const slice  = this._chatLines.slice(start, end);
    const hidden = start;  // lines above viewport

    // ── Scroll-up badge ──────────────────────────────────────────────────────
    let usedFirst = false;
    if (this.scrollOffset > 0 && hidden > 0) {
      const label  = ` ↑ ${hidden} line${hidden === 1?"":"s"} above `;
      frame.push(this._scrollBadge(W, label));
      usedFirst = true;
    }

    for (let i = usedFirst ? 1 : 0; i < chatH; i++) {
      const ln  = slice[i - (usedFirst ? 1 : 0)] ?? "";
      const pad = Math.max(0, W - visibleLength(ln));
      frame.push(ln + " ".repeat(pad));
    }

    // ── Scroll-down badge (overwrites last chat line) ─────────────────────────
    if (this._hasNewContent && this.scrollOffset > 0 && frame.length > 0) {
      frame[frame.length - 1] = this._scrollBadge(W, " ↓ new content — PgDn to follow ");
    }

    frame.push(...this._renderInputBox(W, inputH, false));
    frame.push(this._renderBottomBar(W));

    this._paint(frame);
  }

  _scrollBadge(W, label) {
    const bl   = label.length;
    const lpad = Math.max(0, Math.floor((W - bl) / 2));
    return (
      " ".repeat(lpad) +
      c.bgHighlight(c.tealBright(label)) +
      " ".repeat(Math.max(0, W - lpad - bl))
    );
  }

  _paint(frame) {
    const { H } = this;
    while (frame.length < H) frame.push("");
    process.stdout.write("\x1b[H\x1b[0m" + frame.slice(0, H).join("\r\n") + "\x1b[0m");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INPUT BOX
  //
  //  Exactly like Claude Code:
  //  • thin gray border when idle
  //  • teal border + spinner when generating
  //  • cursor block highlight
  //  • grows with content (up to INPUT_MAX_H)
  // ═══════════════════════════════════════════════════════════════════════════

  _renderInputBox(W, inputH, welcome) {
    const innerW  = W - 2;
    const rows    = [];
    const active  = this.isGenerating;
    const border  = active ? (s) => c.teal(s) : (s) => c.gray(s);

    rows.push(border("╭" + "─".repeat(innerW) + "╮"));

    const contentH = inputH - 2;

    if (active) {
      // ── Generating: spinner line + blank lines ──────────────────────────────
      const spin    = c.teal(this._spin());
      const elapsed = c.dim(c.gray(this._elapsedStr()));
      const actStr  = this._actStr();
      const line    = `  ${spin} ${actStr}  ${elapsed}`;
      const vis     = visibleLength(line);
      rows.push(border("│") + line + " ".repeat(Math.max(0, innerW - vis)) + border("│"));
      for (let i = 1; i < contentH; i++) {
        rows.push(border("│") + " ".repeat(innerW) + border("│"));
      }
    } else {
      // ── Idle: render input lines ─────────────────────────────────────────────
      for (let li = 0; li < contentH; li++) {
        let content;
        if (li === 0 && this.inputLines.length === 1 && !this.inputLines[0] && welcome) {
          // Welcome placeholder
          content = "  " + c.dim(c.gray("> ")) + c.dim(c.gray("How can I help you today?"));
        } else if (li === 0 && this.inputLines.length === 1 && !this.inputLines[0]) {
          content = "  " + c.dim(c.gray("> ")) + c.dim(c.gray("Message Fabio…"));
        } else {
          const text   = this.inputLines[li] ?? "";
          const prompt = li === 0 ? c.bold(c.teal("> ")) : "  ";
          content = "  " + prompt + this._cursorLine(text, li);
        }
        const vis = visibleLength(content);
        rows.push(border("│") + content + " ".repeat(Math.max(0, innerW - vis)) + border("│"));
      }
    }

    rows.push(border("╰" + "─".repeat(innerW) + "╯"));
    return rows;
  }

  _cursorLine(text, lineIdx) {
    const isCursorLine = lineIdx === this.inputRow;
    const maxW = this.W - 8;
    let display = text;
    let col     = isCursorLine ? this.inputCol : -1;

    if (display.length > maxW && col >= 0) {
      const start = Math.max(0, col - Math.floor(maxW / 2));
      display     = display.slice(start, start + maxW);
      col        -= start;
    }

    if (!isCursorLine || col < 0) return c.grayLight(display);

    const before  = display.slice(0, col);
    const cur     = display[col] ?? " ";
    const after   = display.slice(col + 1);
    return c.grayLight(before) + c.bgHighlight(c.white(cur)) + c.grayLight(after);
  }

  _actStr() {
    const map = {
      loading:   c.gray("loading…"),
      thinking:  c.teal("thinking…"),
      coding:    c.blue("coding…"),
      reading:   c.yellow("reading…"),
      searching: c.yellow("searching…"),
      running:   c.yellow("running…"),
      editing:   c.teal("editing…"),
      done:      c.green("done"),
      error:     c.red("error"),
    };
    return map[this.activity] ?? c.gray("working…");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BOTTOM BAR  — exact Claude Code format
  //
  //   ctrl+c exit · ctrl+u clear · ↑↓ history · pgup/dn scroll    model  0:00
  // ═══════════════════════════════════════════════════════════════════════════

  _renderBottomBar(W) {
    const hints = [
      ["ctrl+c",   "exit"],
      ["ctrl+u",   "clear"],
      ["↑↓",       "history"],
      ["pg↑↓",     "scroll"],
      ["alt+↵",    "newline"],
    ].map(([k, v]) => c.dim(c.gray(k)) + " " + c.gray(v)).join(c.dim(c.gray("  ·  ")));

    const modelStr = c.dim(c.gray(truncate(stripAnsi(this.modelName), 22)));
    const tokStr   = this.tokenCount > 0 ? c.dim(c.gray("  " + this._fmtTok(this.tokenCount) + " tok")) : "";
    const timeStr  = c.dim(c.gray(this._sessionAge()));

    const left  = " " + hints;
    const right = modelStr + tokStr + "  " + timeStr + " ";
    const gap   = Math.max(1, W - visibleLength(left) - visibleLength(right));
    return left + " ".repeat(gap) + right;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MESSAGE LINE BUILDER
  //  Produces a flat array of pre-rendered ANSI strings, one per visual row.
  //  Scrolling slices this array.
  // ═══════════════════════════════════════════════════════════════════════════

  _buildLines(W) {
    const lines = [];
    const push  = (s = "") => lines.push(s);

    // ── Mascot header — shown once at top of conversation ──────────────────
    const art     = FABIO_ART;
    const artW    = art.length ? visibleLength(art[0]) : 0;
    const identity = [
      c.bold(c.teal("◈ Fabion")) + c.gray(" Code") + c.dim(c.gray(`  v${VERSION}`)),
      c.dim(c.gray("model  ")) + c.grayLight(truncate(stripAnsi(this.modelName), 34)),
      c.dim(c.gray("cwd    ")) + c.grayLight(truncate(this.cwd, 34)),
    ];
    const blockH = Math.max(art.length, identity.length);
    push();
    for (let i = 0; i < blockH; i++) {
      const left  = art[i]      ?? " ".repeat(artW);
      const right = identity[i] ?? "";
      push("  " + left + "   " + right);
    }
    push();
    push("  " + c.dim(c.gray("─".repeat(Math.min(W - 4, 60)))));
    push();

    // ── Messages ────────────────────────────────────────────────────────────
    for (const msg of this.messages) {
      if      (msg.role === "user")      this._userBlock(msg, W, lines);
      else if (msg.role === "assistant") this._assistantBlock(msg, W, lines);
      else if (msg.role === "error")     this._errorBlock(msg, lines);
    }

    push();
    return lines;
  }

  // ── User turn  ─────────────────────────────────────────────────────────────
  //
  //  ▸ You
  //    message text here
  //
  _userBlock(msg, W, lines) {
    lines.push("");
    lines.push(c.bold(c.tealBright("▸")) + " " + c.bold(c.grayLight("You")));
    for (const l of this._wrap(msg.content, W - 4)) {
      lines.push("  " + c.cream(l));
    }
  }

  // ── Assistant turn  ────────────────────────────────────────────────────────
  //
  //  ◈ Fabio
  //    ○ Reading   src/index.js           ···
  //    ✓ Writing   src/index.js     142 lines
  //    ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
  //    response text / markdown
  //
  _assistantBlock(msg, W, lines) {
    lines.push("");
    lines.push(c.bold(c.teal("◈")) + " " + c.bold(c.teal("Fabio")));

    // Tool log
    if (msg.toolLog?.length) {
      for (const entry of msg.toolLog) {
        this._toolLine(entry, W, lines);
      }
      if (msg.content) {
        lines.push("  " + c.dim(c.gray("╌".repeat(Math.min(W - 6, 48)))));
      }
    }

    // Response text
    if (msg.content || !msg.toolLog?.length) {
      for (const l of this._md(msg.content ?? "", W - 4)) {
        lines.push("  " + l);
      }
    }

    // Diffs
    for (const e of (msg.toolLog ?? [])) {
      if (e.diff && e.status === "done") {
        lines.push("");
        for (const l of this._diff(e.diff, e.file, W)) lines.push("  " + l);
      }
    }
  }

  _errorBlock(msg, lines) {
    lines.push("");
    lines.push(c.bold(c.red("✗")) + " " + c.bold(c.red("Error")));
    lines.push("  " + c.red(msg.content));
  }

  // ── Tool log line ──────────────────────────────────────────────────────────
  //
  //  ○ Read    src/auth.js                     ···
  //  ✓ Write   src/auth.js                142 lines
  //  ○ Run     npm test                        ···
  //
  _toolLine(entry, W, lines) {
    const icon =
      entry.status === "done"  ? c.green("✓") :
      entry.status === "error" ? c.red("✗")   :
      c.dim(c.gray("○"));

    const labelColors = {
      read: c.grayLight, write: c.teal, edit: c.teal,
      list: c.grayLight, search: c.yellow, run: c.yellow, tool: c.grayLight,
    };
    const labelColor = labelColors[entry.icon] ?? c.grayLight;
    const label      = labelColor(entry.label.padEnd(7));

    const maxFileW = Math.min(W - 28, 48);
    const fileStr  = entry.file
      ? c.dim(c.gray(truncate(entry.file, maxFileW).padEnd(maxFileW)))
      : " ".repeat(maxFileW);

    const meta =
      entry.status === "running" ? c.dim(c.gray("···"))                    :
      entry.lines                ? c.dim(c.teal(`${entry.lines} lines`))   :
                                   c.dim(c.gray("done"));

    lines.push(`  ${icon} ${label}  ${fileStr}  ${meta}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DIFF RENDERER
  // ═══════════════════════════════════════════════════════════════════════════

  _diff(text, file, W) {
    const out  = [];
    const barW = Math.min(W - 4, 70);
    const title    = file ? ` ${file} ` : " diff ";
    const titleLen = stripAnsi(title).length;
    const dashR    = Math.max(0, barW - titleLen - 2);

    out.push(c.dim(c.teal("┌─")) + c.gray(title) + c.dim(c.teal("─".repeat(dashR) + "┐")));

    for (const raw of text.split("\n")) {
      if (!raw) continue;
      const pfx    = raw[0];
      const rest   = raw.slice(1);
      const padded = rest + " ".repeat(Math.max(0, barW - rest.length - 4));
      let row;
      if      (pfx === "+") row = c.dim(c.teal("│")) + c.green(" + ") + c.green(padded)      + c.dim(c.teal("│"));
      else if (pfx === "-") row = c.dim(c.teal("│")) + c.red(" − ")   + c.red(padded)        + c.dim(c.teal("│"));
      else if (pfx === "@") row = c.dim(c.teal("│")) + c.gray(" @ ")  + c.dim(c.gray(padded))+ c.dim(c.teal("│"));
      else                  row = c.dim(c.teal("│")) + c.gray("   ")  + c.dim(c.gray(padded))+ c.dim(c.teal("│"));
      out.push(row);
    }

    out.push(c.dim(c.teal("└" + "─".repeat(barW) + "┘")));
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MARKDOWN RENDERER — with real syntax highlighting
  // ═══════════════════════════════════════════════════════════════════════════

  _md(text, W) {
    if (!text) return [c.dim(c.gray("…"))];
    const out     = [];
    let inCode    = false;
    let lang      = "";
    let codeBuf   = [];

    for (const raw of text.split("\n")) {
      // ── Code fence ───────────────────────────────────────────────────────
      if (raw.startsWith("```")) {
        if (!inCode) {
          inCode = true; lang = raw.slice(3).trim(); codeBuf = [];
        } else {
          // Emit code block
          const barW  = Math.min(W - 2, 66);
          const lpad  = lang ? `─ ${lang} ` : "";
          const rdash = Math.max(0, barW - lpad.length - 1);
          out.push(c.dim(c.teal("┌" + lpad + "─".repeat(rdash) + "┐")));

          const highlighted = syntaxHighlight(codeBuf.join("\n"), lang);
          for (const cl of highlighted.split("\n")) {
            const padN = Math.max(0, barW - visibleLength(cl) - 2);
            out.push(
              c.dim(c.teal("│")) +
              c.bgCode(" " + cl + " ".repeat(padN) + " ") +
              "\x1b[0m" +
              c.dim(c.teal("│"))
            );
          }
          out.push(c.dim(c.teal("└" + "─".repeat(barW) + "┘")));
          inCode = false; lang = ""; codeBuf = [];
        }
        continue;
      }
      if (inCode) { codeBuf.push(raw); continue; }

      // ── Headings ─────────────────────────────────────────────────────────
      if (raw.startsWith("### ")) { out.push(c.bold(c.grayLight(raw.slice(4)))); continue; }
      if (raw.startsWith("## "))  { out.push(c.bold(c.white(raw.slice(3))));     continue; }
      if (raw.startsWith("# "))   { out.push(c.bold(c.tealBright(raw.slice(2)))); continue; }

      // ── Lists ─────────────────────────────────────────────────────────────
      if (raw.match(/^[*-] /)) {
        out.push(c.dim(c.teal("  •")) + " " + this._inline(raw.slice(2))); continue;
      }
      if (raw.match(/^\d+\. /)) {
        const num  = raw.match(/^(\d+\.)/)[0];
        const rest = raw.replace(/^\d+\.\s*/, "");
        out.push(c.dim(c.teal(`  ${num}`)) + " " + this._inline(rest)); continue;
      }

      // ── Blank line ────────────────────────────────────────────────────────
      if (raw.trim() === "") { out.push(""); continue; }

      // ── Paragraph — word-wrap ─────────────────────────────────────────────
      for (const l of this._wrap(raw, W - 2)) {
        out.push(this._inline(l));
      }
    }

    return out.length ? out : [c.dim(c.gray("…"))];
  }

  _inline(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g, (_, x) => c.bold(c.white(x)))
      .replace(/\*(.+?)\*/g,     (_, x) => c.italic(c.grayLight(x)))
      .replace(/`([^`]+)`/g,     (_, x) => c.bgCode(c.tealBright(" " + x + " ")) + "\x1b[0m");
  }

  _wrap(text, W) {
    if (!text || W <= 0) return [text || ""];
    const words = text.split(" ");
    const lines = [];
    let cur     = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > W) { if (cur) lines.push(cur); cur = w; }
      else                   cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HELP
  // ═══════════════════════════════════════════════════════════════════════════

  _help() {
    this.messages.push({
      role: "assistant",
      toolLog: [],
      content: [
        "## Fabion Help",
        "",
        "**Commands**",
        "- `/clear` — clear conversation",
        "- `/help` — show this",
        "- `/exit` — quit",
        "",
        "**Keyboard**",
        "- `Enter` — send",
        "- `Alt+Enter` — newline",
        "- `↑ ↓` — history",
        "- `PgUp PgDn` — scroll",
        "- `Ctrl+U` — clear input",
        "- `Ctrl+C` — quit",
      ].join("\n"),
    });
    this._dirty = true;
    this._render();
  }
}