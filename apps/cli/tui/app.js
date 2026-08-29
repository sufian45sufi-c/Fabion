/**
 * FabionTUI
 *
 * Claude-Code-style terminal UI for Fabion.
 *
 * IMPORTANT:
 * - Fabio mascot stays at the top beside Fabion Code identity.
 * - No sidebar.
 * - No thinking animation inside the input.
 * - No thinking animation above the input.
 * - ONLY ONE thinking animation directly underneath the active AI message.
 * - AI response content updates live as response_chunk events arrive.
 */

import {
  c,
  FABIO_ART,
  syntaxHighlight,
  stripAnsi,
  visibleLength,
  truncate,
} from "./theme.js";

import { cwd } from "node:process";
import { basename } from "node:path";
import { openEditor } from "./editor.js";

const VERSION = "0.1.0";

const THINK_WORDS = [
  "Baking","Blanching","Brewing","Caramelizing","Cooking","Drizzling",
  "Fermenting","Marinating","Percolating","Simmering","Stewing","Whisking",
  "Calculating","Cerebrating","Cogitating","Considering","Contemplating",
  "Crunching","Deciphering","Deliberating","Determining","Elucidating",
  "Inferring","Mulling","Musing","Noodling","Pondering","Ruminating",
  "Beboppin'","Boogieing","Frolicking","Gallivanting","Galloping",
  "Jitterbugging","Meandering","Moonwalking","Moseying","Shimmying",
  "Wandering","Befuddling","Boondoggling","Booping","Discombobulating",
  "Fiddle-faddling","Finagling","Flibbertigibbeting","Hullaballooing",
  "Razzmatazzing","Shenaniganing","Tomfoolering",
];

const BRAILLE = ["⣾","⣽","⣻","⢿","⡿","⣟","⣯","⣷"];

export class FabionTUI {
  constructor({ agent, modelName = "unknown" }) {
    this.agent = agent;
    this.modelName = modelName;
    this.cwd = cwd();
    this.projectName = basename(this.cwd);
    this.input = "";
    this.cursor = 0;
    this.history = [];
    this.histIdx = -1;
    this.messages = [];
    this.isGenerating = false;
    this.activity = "idle";
    this._currentToolLog = [];
    this._frame = 0;
    this._timer = null;
    this._elapsed = 0;
    this._elapsedTimer = null;
    this._thinkWordIdx = Math.floor(Math.random() * THINK_WORDS.length);
    this._thinkWord = THINK_WORDS[this._thinkWordIdx];
    this._thinkTimer = null;
    this.scrollOffset = 0;
    this._lines = [];
    this._dirty = true;
    this._hasNew = false;
    this.sessionStart = Date.now();
    this.toolCalls = 0;
    this.tokenCount = 0;
    this.W = process.stdout.columns ?? 120;
    this.H = process.stdout.rows ?? 30;
    this.agent.on((e) => this._onEvent(e));
  }

  // ===========================================================================
  // BOOT
  // ===========================================================================

  async start() {
    process.stdout.write("\x1b[?1049h\x1b[?25l");
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const bye = () => {
      this._stopAnim();
      process.stdout.write("\x1b[?25h\x1b[?1049l\x1b[0m");
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.exit(0);
    };

    process.on("SIGINT", bye);
    process.on("SIGTERM", bye);
    process.stdout.on("resize", () => {
      this.W = process.stdout.columns ?? 120;
      this.H = process.stdout.rows ?? 30;
      this._dirty = true;
      this._paint();
    });

    this._paint();
    await new Promise(() => process.stdin.on("data", (k) => this._key(k)));
  }

  // ===========================================================================
  // KEYBOARD
  // ===========================================================================

  _key(k) {
    if (k === "\x03") { process.emit("SIGINT"); return; }
    if (this.isGenerating) return;
    if (k === "\r" || k === "\n") { this._submit(); return; }

    const pg = () => Math.max(4, this.H - 3);

    switch (k) {
      case "\x7f": case "\x08":
        if (!this.cursor) return;
        this.input = this.input.slice(0, this.cursor - 1) + this.input.slice(this.cursor);
        this.cursor--;
        break;
      case "\x1b[A": this._hUp(); break;
      case "\x1b[B": this._hDown(); break;
      case "\x1b[C": this.cursor = Math.min(this.input.length, this.cursor + 1); break;
      case "\x1b[D": this.cursor = Math.max(0, this.cursor - 1); break;
      case "\x01": case "\x1b[H": this.cursor = 0; break;
      case "\x05": case "\x1b[F": this.cursor = this.input.length; break;
      case "\x15": this.input = ""; this.cursor = 0; break;
      case "\x1b[5~":
        this.scrollOffset = Math.min(this.scrollOffset + pg(), Math.max(0, this._lines.length - 1));
        break;
      case "\x1b[6~":
        this.scrollOffset = Math.max(0, this.scrollOffset - pg());
        if (!this.scrollOffset) this._hasNew = false;
        break;
      default:
        if (k.length === 1 && k >= " ") {
          this.input = this.input.slice(0, this.cursor) + k + this.input.slice(this.cursor);
          this.cursor++;
        } else if (k.length > 1 && !k.startsWith("\x1b")) {
          this.input += k;
          this.cursor += k.length;
        }
    }
    this._paint();
  }

  _hUp() {
    if (!this.history.length) return;
    this.histIdx = Math.min(this.histIdx + 1, this.history.length - 1);
    this.input = this.history[this.histIdx];
    this.cursor = this.input.length;
  }

  _hDown() {
    this.histIdx = Math.max(-1, this.histIdx - 1);
    this.input = this.histIdx < 0 ? "" : this.history[this.histIdx];
    this.cursor = this.input.length;
  }

  // ===========================================================================
  // SUBMIT
  // ===========================================================================

  async _submit() {
    const text = this.input.trim();
    if (!text) return;

    this.history.unshift(text);
    this.histIdx = -1;
    this.input = "";
    this.cursor = 0;

    if (text === "/clear") { this.messages = []; this._dirty = true; this._paint(); return; }
    if (text === "/help")  { this._help(); return; }
    if (text === "/exit")  { process.emit("SIGINT"); return; }

    // ── /edit [file] — open Neovim directly ────────────────────────────────
    if (text.startsWith("/edit")) {
      const filePath = text.slice(5).trim() || null;
      await this._launchEditor(filePath);
      return;
    }

    this.messages.push({ role: "user", content: text });
    this.messages.push({ role: "assistant", content: "", toolLog: [] });
    this._currentToolLog = this.messages.at(-1).toolLog;

    this.isGenerating = true;
    this._hasNew = false;
    this._elapsed = 0;
    this.scrollOffset = 0;
    this._dirty = true;
    this.activity = "thinking";

    this._startAnim();
    this._paint();

    try {
      await this.agent.run(text);
    } catch (e) {
      this.messages.push({ role: "error", content: e?.message ?? String(e) });
    } finally {
      this._stopAnim();
      this.isGenerating = false;
      this._currentToolLog = [];
      this.activity = "idle";
      this.scrollOffset = 0;
      this._dirty = true;
      this._paint();
    }
  }

  // ===========================================================================
  // NEOVIM INTEGRATION
  // ===========================================================================

  async _launchEditor(filePath) {
    // Suspend the TUI — restore normal terminal so Neovim gets a clean tty
    this._stopAnim();
    process.stdout.write("\x1b[?25h\x1b[?1049l\x1b[0m");
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();

    const result = await openEditor(filePath ?? this.cwd);

    // Re-enter alternate screen and restore TUI
    process.stdout.write("\x1b[?1049h\x1b[?25l");
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    if (result.error) {
      this.messages.push({ role: "error", content: result.error });
    } else if (filePath) {
      this.messages.push({
        role: "assistant",
        toolLog: [],
        content: `Opened \`${filePath}\` in Neovim. File saved and editor closed.`,
      });
    } else {
      this.messages.push({
        role: "assistant",
        toolLog: [],
        content: `Opened project workspace in Neovim.`,
      });
    }

    this._dirty = true;
    this._paint();
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  _onEvent(e) {
    if (!e) return;

    switch (e.type) {
      case "thinking": {
        this.activity = "thinking";
        break;
      }
      case "response_chunk": {
        const last = this.messages.at(-1);
        if (last?.role === "assistant") {
          last.content += e.delta ?? "";
          this._dirty = true;
          if (this.scrollOffset > 0) this._hasNew = true;
        }
        this.activity = "thinking";
        break;
      }
      case "token_count": {
        if (typeof e.count === "number") this.tokenCount += e.count;
        break;
      }
      case "tool_call": {
        this.activity = "coding";
        this.toolCalls++;
        this._currentToolLog.push(this._mkEntry(e.toolName ?? "", e.args ?? {}));

        // If the agent is writing/editing a file, offer Neovim after
        const n = (e.toolName ?? "").toLowerCase();
        if (n.includes("write") || n.includes("edit") || n.includes("patch")) {
          this._pendingEditorFile = e.args?.path ?? e.args?.file ?? null;
        }
        break;
      }
      case "tool_result": {
        const r = [...this._currentToolLog].reverse().find((x) => x.status === "running");
        if (r) {
          r.status = "done";
          if (typeof e.result === "string") {
            const lc = e.result.split("\n").length;
            if (lc > 1) r.lines = lc;
          }
          if (e.diff) r.diff = e.diff;
        }
        this.activity = "thinking";
        this._lines = this._buildLines();
        break;
      }
      case "done": {
        this.activity = "done";
        break;
      }
      case "error": {
        this.activity = "error";
        break;
      }
    }

    this._paint();
  }

  // ===========================================================================
  // TOOL ENTRY
  // ===========================================================================

  _mkEntry(name, args) {
    const n = name.toLowerCase();
    const base = { status: "running", lines: null, diff: null };
    if (n.includes("read"))   return { ...base, icon: "read",   label: "Read",   file: args.path ?? args.file ?? "" };
    if (n.includes("write"))  return { ...base, icon: "write",  label: "Write",  file: args.path ?? args.file ?? "" };
    if (n.includes("edit") || n.includes("patch")) return { ...base, icon: "edit", label: "Edit", file: args.path ?? args.file ?? "" };
    if (n.includes("list") || n.includes("dir"))   return { ...base, icon: "list", label: "List", file: args.path ?? args.dir  ?? "" };
    if (n.includes("search")) return { ...base, icon: "search", label: "Search", file: args.pattern ?? args.query ?? "" };
    if (n.includes("run") || n.includes("command") || n.includes("exec"))
      return { ...base, icon: "run", label: "Run", file: args.command ?? args.cmd ?? "" };
    return { ...base, icon: "tool", label: name, file: "" };
  }

  // ===========================================================================
  // ANIMATION
  // ===========================================================================

  _startAnim() {
    if (this._timer) return;
    this._timer = setInterval(() => { this._frame++; this._paint(); }, 80);
    this._elapsedTimer = setInterval(() => { this._elapsed++; }, 1000);
    this._thinkTimer = setInterval(() => {
      this._thinkWordIdx = (this._thinkWordIdx + 1) % THINK_WORDS.length;
      this._thinkWord = THINK_WORDS[this._thinkWordIdx];
      this._paint();
    }, 1800);
  }

  _stopAnim() {
    clearInterval(this._timer);        this._timer = null;
    clearInterval(this._elapsedTimer); this._elapsedTimer = null;
    clearInterval(this._thinkTimer);   this._thinkTimer = null;
  }

  _spin() { return BRAILLE[this._frame % BRAILLE.length]; }

  _elapsed_s() {
    const s = this._elapsed;
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
  }

  _fmtTok(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }

  // ===========================================================================
  // PAINT
  // ===========================================================================

  _paint() {
    if (!this.messages.length && !this.isGenerating) {
      this._paintWelcome();
    } else {
      this._paintChat();
    }
  }

  _flush(rows) {
    const { W, H } = this;
    const padded = [];
    for (let i = 0; i < H; i++) {
      const ln  = rows[i] ?? "";
      const vis = visibleLength(ln);
      padded.push(ln + " ".repeat(Math.max(0, W - vis)));
    }
    process.stdout.write("\x1b[H\x1b[J\x1b[0m" + padded.join("\r\n") + "\x1b[0m");
  }

  // ===========================================================================
  // WELCOME
  // ===========================================================================

  _paintWelcome() {
    const { W } = this;
    const rows  = [];
    const art   = FABIO_ART ?? [];
    const artH  = art.length;
    const artW  = artH ? visibleLength(art[0] ?? "") : 0;
    const model = truncate(stripAnsi(this.modelName), 50);

    const idLines = [
      c.bold(c.teal("Fabion Code")) + " " + c.dim(c.gray("v" + VERSION)),
      c.dim(c.gray(model)),
      c.dim(c.gray(truncate(this.cwd, 50))),
    ];

    const blockH = Math.max(artH, idLines.length);
    rows.push("");

    for (let i = 0; i < blockH; i++) {
      const left    = art[i] ?? " ".repeat(artW);
      const right   = idLines[i] ?? "";
      const spacing = Math.max(2, artW - visibleLength(left) + 2);
      rows.push("  " + left + " ".repeat(spacing) + right);
    }

    rows.push("");
    rows.push("  " + c.dim(c.gray("│")) + " " + c.dim(c.gray("Fabio is ready. Type anything to start.")));
    rows.push("");
    rows.push(c.dim(c.gray("─".repeat(W))));
    rows.push(this._inputLine());
    rows.push(c.dim(c.gray("─".repeat(W))));
    rows.push("");
    rows.push("  " + c.dim(c.gray("? for shortcuts  ·  /help for commands  ·  /edit [file] to open Neovim  ·  ctrl+c to exit")));

    this._flush(rows);
  }

  // ===========================================================================
  // CHAT
  // ===========================================================================

  _paintChat() {
    const { W, H } = this;

    this._lines = this._buildLines();
    this._dirty = false;

    const statusLine = "  " + c.dim(c.gray("? for shortcuts  ·  /help  ·  /edit [file] to open Neovim  ·  ctrl+c to exit"));
    const sep        = c.dim(c.gray("─".repeat(W)));

    const doc = [
      ...this._lines,
      sep,
      this._inputLine(),
      sep,
      statusLine,
    ];

    const total = doc.length;
    const start = Math.max(0, total - H - this.scrollOffset);
    const end   = Math.max(0, total - this.scrollOffset);
    const slice = doc.slice(start, end);

    const frame = [];
    for (const ln of slice) {
      frame.push(ln + " ".repeat(Math.max(0, W - visibleLength(ln))));
    }

    if (start > 0 && frame.length > 0) {
      const lbl = ` ↑ ${start} line${start === 1 ? "" : "s"} above `;
      const lp  = Math.max(0, Math.floor((W - lbl.length) / 2));
      frame[0]  = " ".repeat(lp) + c.bgHighlight(c.tealBright(lbl)) + " ".repeat(Math.max(0, W - lp - lbl.length));
    }

    if (this._hasNew && this.scrollOffset > 0 && frame.length > 4) {
      const lbl      = " ↓ new content — PgDn ";
      const lp       = Math.max(0, Math.floor((W - lbl.length) / 2));
      const badgeIdx = Math.max(0, frame.length - 5);
      frame[badgeIdx] = " ".repeat(lp) + c.bgHighlight(c.tealBright(lbl)) + " ".repeat(Math.max(0, W - lp - lbl.length));
    }

    this._flush(frame);
  }

  // ===========================================================================
  // INPUT
  // ===========================================================================

  _inputLine() {
    const prompt = c.bold(c.teal("›")) + " ";
    if (!this.input) return prompt + c.bgHighlight(c.white(" "));

    const maxW   = this.W - 4;
    let display  = this.input;
    let col      = this.cursor;

    if (display.length > maxW) {
      const s  = Math.max(0, col - Math.floor(maxW / 2));
      display  = display.slice(s, s + maxW);
      col     -= s;
    }

    const before = display.slice(0, col);
    const cur    = display[col] ?? " ";
    const after  = display.slice(col + 1);
    return prompt + c.grayLight(before) + c.bgHighlight(c.white(cur)) + c.grayLight(after);
  }

  // ===========================================================================
  // MESSAGE BUFFER
  // ===========================================================================

  _buildLines() {
    const { W } = this;
    const out   = [];
    const push  = (s) => out.push(s ?? "");

    this._headerLines(W, out);
    push("");

    for (const msg of this.messages) {
      if      (msg.role === "user")      this._userLines(msg, W, out);
      else if (msg.role === "assistant") this._aiLines(msg, W, out);
      else if (msg.role === "error")     this._errLines(msg, W, out);
    }

    push("");
    return out;
  }

  // ===========================================================================
  // HEADER
  // ===========================================================================

  _headerLines(W, out) {
    const art    = FABIO_ART ?? [];
    const artH   = art.length;
    const artW   = artH ? visibleLength(art[0] ?? "") : 0;
    const model  = truncate(stripAnsi(this.modelName), 50);

    const idLines = [
      c.bold(c.teal("Fabion Code")) + " " + c.dim(c.gray("v" + VERSION)),
      c.dim(c.gray(model)),
      c.dim(c.gray(truncate(this.cwd, 50))),
    ];

    const blockH = Math.max(artH, idLines.length);
    out.push("");

    for (let i = 0; i < blockH; i++) {
      const mascot  = art[i] ?? " ".repeat(artW);
      const info    = idLines[i] ?? "";
      const spacing = Math.max(2, artW - visibleLength(mascot) + 2);
      out.push("  " + mascot + " ".repeat(spacing) + info);
    }

    out.push("");
  }

  // ===========================================================================
  // USER
  // ===========================================================================

  _userLines(msg, W, out) {
    out.push("");
    for (const l of this._wrap(msg.content, W - 4)) {
      out.push("  " + c.dim(c.grayLight(l)));
    }
  }

  // ===========================================================================
  // AI
  // ===========================================================================

  _aiLines(msg, W, out) {
    const textW = W - 4;

    if (msg.toolLog?.length) {
      for (const e of msg.toolLog) this._toolEntry(e, textW, out);
    }

    if (msg.content) {
      out.push("");
      const paras = msg.content.split("\n\n");
      for (const para of paras) {
        if (para.trim() === "") continue;
        if (para.startsWith("```")) {
          this._codeInFlow(para, textW, out);
        } else {
          const lines = this._md(para.trim(), textW);
          let first   = true;
          for (const row of lines) {
            if (Array.isArray(row)) {
              for (const cr of row) out.push("  " + cr);
            } else {
              if (first) { out.push(c.teal("●") + " " + row); first = false; }
              else          out.push("  " + row);
            }
          }
        }
        out.push("");
      }
    }

    // ── ONLY thinking animation in the entire UI ────────────────────────────
    // Appears directly underneath the active AI message — nowhere else.
    if (this.isGenerating && this.messages.at(-1) === msg && msg.role === "assistant") {
      const spin    = c.teal(this._spin());
      const word    = c.dim(c.gray(this._thinkWord + "…"));
      const elapsed = c.dim(c.gray(this._elapsed_s()));
      const tok     = this.tokenCount > 0 ? c.dim(c.gray(" · ✳ " + this._fmtTok(this.tokenCount) + " tokens")) : "";
      const esc     = c.dim(c.gray(" · esc to interrupt"));
      out.push("  " + spin + " " + word + "  (" + elapsed + tok + esc + ")");
      out.push("");
    }
  }

  // ===========================================================================
  // TOOL ENTRY
  // ===========================================================================

  _toolEntry(entry, textW, out) {
    out.push("");

    const file    = entry.file ? c.dim(c.gray("(" + truncate(entry.file, textW - 20) + ")")) : "";
    const nameCol = { read: c.grayLight, write: c.tealBright, edit: c.tealBright, list: c.grayLight, search: c.yellow, run: c.yellow, tool: c.grayLight };
    const nameStr = (nameCol[entry.icon] ?? c.grayLight)(c.bold(entry.label));

    out.push(c.teal("●") + " " + nameStr + file);

    if (entry.status === "running") {
      out.push("  " + c.dim(c.gray("└")) + " " + c.dim(c.gray("running…")));
    } else if (entry.lines) {
      out.push(
        "  " + c.dim(c.gray("└")) + " " +
        c.dim(c.gray(`${entry.icon === "read" ? "Read" : "Processed"} `)) +
        c.bold(c.grayLight(String(entry.lines))) +
        c.dim(c.gray(" lines"))
      );
    } else if (entry.status === "done") {
      out.push("  " + c.dim(c.gray("└")) + " " + c.dim(c.gray("Done")));
    }

    if (entry.diff && entry.status === "done") {
      this._inlineDiff(entry.diff, entry.file, textW, out);
    }
  }

  // ===========================================================================
  // DIFF
  // ===========================================================================

  _inlineDiff(diffText, file, textW, out) {
    const lines = diffText.split("\n");
    let lineNum  = 1;
    const adds   = lines.filter((l) => l.startsWith("+")).length;
    const dels   = lines.filter((l) => l.startsWith("-")).length;

    if (adds || dels) {
      const summary =
        `Updated ${file || "file"} with ` +
        (adds > 0 ? c.teal(`${adds} addition${adds > 1 ? "s" : ""}`) : "") +
        (adds && dels ? " and " : "") +
        (dels > 0 ? c.red(`${dels} removal${dels > 1 ? "s" : ""}`) : "");
      out.push("    " + c.dim(c.gray("└")) + " " + summary);
    }

    for (const raw of lines) {
      if (!raw || raw.startsWith("@@") || raw.startsWith("---") || raw.startsWith("+++")) continue;
      const pfx   = raw[0];
      const rest  = raw.slice(1);
      const lnStr = String(lineNum).padStart(4);

      if (pfx === "+") {
        const row  = ` ${lnStr} + ${rest}`;
        const padN = Math.max(0, textW - row.length);
        out.push("    " + c.green(row + " ".repeat(padN)));
        lineNum++;
      } else if (pfx === "-") {
        const row  = ` ${lnStr} - ${rest}`;
        const padN = Math.max(0, textW - row.length);
        out.push("    " + c.red(row + " ".repeat(padN)));
      } else {
        out.push("    " + c.dim(c.gray(` ${lnStr}   ${rest}`)));
        lineNum++;
      }
    }
  }

  // ===========================================================================
  // CODE IN FLOW
  // ===========================================================================

  _codeInFlow(raw, textW, out) {
    const lines = raw.split("\n");
    const lang  = lines[0].slice(3).trim();
    const code  = lines.slice(1, -1);
    const barW  = Math.min(textW - 2, 70);
    const lnW   = String(code.length).length;
    const codeW = barW - lnW - 4;

    out.push(c.dim(c.gray("  ┌─ ")) + c.dim(c.gray(lang || "code")) + c.dim(c.gray(" " + "─".repeat(Math.max(0, barW - lang.length - 5)) + "┐")));

    const hl = syntaxHighlight(code.join("\n"), lang).split("\n");
    for (let i = 0; i < hl.length; i++) {
      const ln   = String(i + 1).padStart(lnW);
      const line = hl[i];
      const raw2 = stripAnsi(line);
      const padN = Math.max(0, codeW - raw2.length);
      out.push(
        "  " + c.dim(c.gray(ln)) + c.dim(c.gray(" │ ")) +
        c.bgCode(" " + line + " ".repeat(padN) + " ") + "\x1b[0m" + c.dim(c.gray("│"))
      );
    }

    out.push(c.dim(c.gray("  └" + "─".repeat(barW) + "┘")));
  }

  // ===========================================================================
  // ERROR
  // ===========================================================================

  _errLines(msg, W, out) {
    out.push("");
    out.push(c.red("✗") + " " + c.bold(c.red("Error")));
    for (const l of this._wrap(msg.content, W - 4)) {
      out.push("  " + c.red(l));
    }
  }

  // ===========================================================================
  // MARKDOWN
  // ===========================================================================

  _md(text, textW) {
    if (!text) return [];
    const out = [];
    let inCode = false, lang = "", codeBuf = [];

    for (const raw of text.split("\n")) {
      if (raw.startsWith("```")) {
        if (!inCode) { inCode = true; lang = raw.slice(3).trim(); codeBuf = []; }
        else { out.push(this._mkCodeBlock(codeBuf, lang, textW)); inCode = false; lang = ""; codeBuf = []; }
        continue;
      }
      if (inCode) { codeBuf.push(raw); continue; }

      if (raw.startsWith("# "))   { out.push(c.bold(c.tealBright(raw.slice(2)))); continue; }
      if (raw.startsWith("## "))  { out.push(c.bold(c.white(raw.slice(3))));      continue; }
      if (raw.startsWith("### ")) { out.push(c.bold(c.grayLight(raw.slice(4)))); continue; }
      if (raw.match(/^[*-] /))    { out.push(c.dim(c.teal("  •")) + " " + this._inline(raw.slice(2))); continue; }
      if (raw.match(/^\d+\. /))   {
        const n = raw.match(/^(\d+\.)/)[0];
        out.push(c.dim(c.teal("  " + n)) + " " + this._inline(raw.replace(/^\d+\.\s*/, "")));
        continue;
      }
      if (raw.trim() === "") { out.push(""); continue; }
      for (const l of this._wrap(raw, textW - 2)) out.push(this._inline(l));
    }

    return out;
  }

  _mkCodeBlock(codeLines, lang, textW) {
    const barW  = Math.min(textW - 2, 70);
    const lnW   = String(codeLines.length).length;
    const codeW = barW - lnW - 4;

    const rows = [
      c.dim(c.teal("┌─" + (lang ? `─ ${lang} ` : "") + "─".repeat(Math.max(0, barW - (lang ? lang.length + 4 : 1))) + "┐")),
    ];

    const hl = syntaxHighlight(codeLines.join("\n"), lang).split("\n");
    for (let i = 0; i < hl.length; i++) {
      const ln   = String(i + 1).padStart(lnW);
      const line = hl[i];
      const raw  = stripAnsi(line);
      const padN = Math.max(0, codeW - raw.length);
      rows.push(
        c.dim(c.gray(ln)) + c.dim(c.teal(" │ ")) +
        c.bgCode(" " + line + " ".repeat(padN) + " ") + "\x1b[0m" + c.dim(c.teal("│"))
      );
    }

    rows.push(c.dim(c.teal("└" + "─".repeat(barW) + "┘")));
    return rows;
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
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > W) { if (cur) lines.push(cur); cur = w; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }

  // ===========================================================================
  // HELP
  // ===========================================================================

  _help() {
    this.messages.push({
      role: "assistant",
      toolLog: [],
      content: [
        "## Fabion Help",
        "",
        "**Commands**",
        "- `/clear` — clear conversation",
        "- `/help` — this message",
        "- `/edit [file]` — open Neovim editor (omit file to open project root)",
        "- `/exit` — quit",
        "",
        "**Keys**",
        "- `Enter` — send  ·  `↑↓` — history",
        "- `PgUp/PgDn` — scroll  ·  `Ctrl+U` — clear input  ·  `Ctrl+C` — quit",
        "",
        "**Neovim integration**",
        "- Fabion automatically suggests opening Neovim after file edits",
        "- Use `/edit src/index.js` to jump straight into a file",
      ].join("\n"),
    });
    this._dirty = true;
    this._paint();
  }
}