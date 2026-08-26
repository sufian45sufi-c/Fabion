import { c, FABIO_ART, activityLabel, syntaxHighlight, stripAnsi, visibleLength, truncate } from './theme.js';
import { cwd } from 'node:process';
import { basename } from 'node:path';

const VERSION       = '0.1.0';
const SIDEBAR_WIDTH = 32;
const SIDEBAR_MIN_W = 100;
const TOP_BAR_H     = 1;
const BOTTOM_BAR_H  = 1;
const INPUT_H       = 3;

export class FabionTUI {
  constructor({ agent, modelName = 'unknown' }) {
    this.agent       = agent;
    this.modelName   = modelName;
    this.cwd         = cwd();
    this.projectName = basename(this.cwd);

    this.messages     = [];
    this.input        = '';
    this.cursor       = 0;
    this.history      = [];
    this.historyIdx   = -1;
    this.isGenerating = false;
    this.activity     = 'idle';
    this.activityText = activityLabel.idle;
    this.scrollOffset = 0;
    this._chatLines   = [];
    this._dirty       = true;

    // Session stats
    this.sessionStart  = Date.now();
    this.toolCalls     = 0;
    this.tokenCount    = 0;
    this.filesContext  = [];
    this.toolStats     = { Read: 0, Edit: 0, Search: 0, Run: 0 };

    this.width  = process.stdout.columns ?? 120;
    this.height = process.stdout.rows    ?? 30;

    this.agent.on(e => this._onAgentEvent(e));
  }

  // ── Start ──────────────────────────────────────────────────────────────────

  async start() {
    this._setupTerminal();
    this._render();
    await this._inputLoop();
  }

  _setupTerminal() {
    process.stdout.write('\x1b[?1049h\x1b[?25l');
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const cleanup = () => {
      process.stdout.write('\x1b[?25h\x1b[?1049l');
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.exit(0);
    };
    process.on('SIGINT',  cleanup);
    process.on('SIGTERM', cleanup);
    process.stdout.on('resize', () => {
      this.width  = process.stdout.columns ?? 120;
      this.height = process.stdout.rows    ?? 30;
      this._dirty = true;
      this._render();
    });
  }

  async _inputLoop() {
    return new Promise(() => { process.stdin.on('data', k => this._handleKey(k)); });
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  _handleKey(key) {
    if (key === '\x03') { process.emit('SIGINT'); return; }
    if (this.isGenerating) return;
    if (key === '\r' || key === '\n') { this._submit(); return; }
    if (key === '\x7f' || key === '\x08') { this._backspace(); return; }
    if (key === '\x1b[A') { this._histUp();   this._render(); return; }
    if (key === '\x1b[B') { this._histDown(); this._render(); return; }
    if (key === '\x1b[C') { this.cursor = Math.min(this.input.length, this.cursor+1); this._render(); return; }
    if (key === '\x1b[D') { this.cursor = Math.max(0, this.cursor-1); this._render(); return; }
    if (key === '\x1b[H' || key === '\x01') { this.cursor = 0; this._render(); return; }
    if (key === '\x1b[F' || key === '\x05') { this.cursor = this.input.length; this._render(); return; }
    if (key === '\x1b[5~') { this.scrollOffset = Math.min(this.scrollOffset+5, Math.max(0, this._chatLines.length-1)); this._render(); return; }
    if (key === '\x1b[6~') { this.scrollOffset = Math.max(0, this.scrollOffset-5); this._render(); return; }
    if (key === '\x15') { this.input = ''; this.cursor = 0; this._render(); return; }
    if (key.length === 1 && key >= ' ') { this.input = this.input.slice(0,this.cursor)+key+this.input.slice(this.cursor); this.cursor++; this._render(); return; }
    if (key.length > 1 && !key.startsWith('\x1b')) { this.input = this.input.slice(0,this.cursor)+key+this.input.slice(this.cursor); this.cursor += key.length; this._render(); }
  }

  _backspace() {
    if (this.cursor === 0) return;
    this.input = this.input.slice(0,this.cursor-1)+this.input.slice(this.cursor);
    this.cursor--;
    this._render();
  }

  _histUp() {
    if (!this.history.length) return;
    this.historyIdx = Math.min(this.historyIdx+1, this.history.length-1);
    this.input = this.history[this.historyIdx] ?? '';
    this.cursor = this.input.length;
  }

  _histDown() {
    if (this.historyIdx <= 0) { this.historyIdx = -1; this.input = ''; this.cursor = 0; return; }
    this.historyIdx--;
    this.input = this.history[this.historyIdx] ?? '';
    this.cursor = this.input.length;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async _submit() {
    const text = this.input.trim();
    if (!text) return;
    this.history.unshift(text);
    this.historyIdx = -1;
    this.input = '';
    this.cursor = 0;

    if (text === '/clear') { this.messages = []; this._dirty = true; this._render(); return; }
    if (text === '/help')  { this._addHelp(); return; }
    if (text === '/exit' || text === 'exit') { process.emit('SIGINT'); return; }

    this.messages.push({ role: 'user', content: text });
    this.isGenerating = true;
    this._setActivity('thinking');
    this.scrollOffset = 0;
    this._dirty = true;
    this._render();

    try {
      const r = await this.agent.run(text);
      this.messages.push({ role: 'assistant', content: r });
    } catch(e) {
      this.messages.push({ role: 'error', content: e.message ?? String(e) });
    } finally {
      this.isGenerating = false;
      this._setActivity('idle');
      this.scrollOffset = 0;
      this._dirty = true;
      this._render();
    }
  }

  // ── Agent events ───────────────────────────────────────────────────────────

  _onAgentEvent(e) {
    switch(e.type) {
      case 'thinking':    this._setActivity('thinking'); break;
      case 'tool_call':
        this._setActivity('running');
        this.toolCalls++;
        const tn = (e.toolName ?? '').toLowerCase();
        if (tn.includes('read'))   this.toolStats.Read++;
        if (tn.includes('write') || tn.includes('edit')) this.toolStats.Edit++;
        if (tn.includes('search')) this.toolStats.Search++;
        if (tn.includes('run') || tn.includes('command')) this.toolStats.Run++;
        break;
      case 'done':  this._setActivity('done');  break;
      case 'error': this._setActivity('error'); break;
    }
    this._render();
  }

  _setActivity(s) {
    this.activity     = s;
    this.activityText = activityLabel[s] ?? activityLabel.idle;
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
    const W = this.width;
    const H = this.height;

    const showSidebar = W >= SIDEBAR_MIN_W;
    const SW = showSidebar ? SIDEBAR_WIDTH : 0;
    const mainW = W - SW;
    const chatH = H - TOP_BAR_H - INPUT_H - BOTTOM_BAR_H;

    const frame = [];

    // ── Top bar ──────────────────────────────────────────────────────────────
    const fabioIcon = c.blue('⬡');
    const appName   = c.bold(c.blue('Fabion')) + c.gray(` v${VERSION}`);
    const pathStr   = c.grayMid(`~/${this.projectName}`);
    const modelStr  = c.gray('Model: ') + c.grayLight(truncate(stripAnsi(this.modelName), 30));
    const onlineStr = c.green('● Online');

    const leftTop  = ` ${fabioIcon} ${appName}   ${pathStr}`;
    const rightTop = `${modelStr}   ${onlineStr} `;
    const leftVis  = visibleLength(leftTop);
    const rightVis = visibleLength(rightTop);
    const topGap   = Math.max(1, W - leftVis - rightVis);
    frame.push(c.bgBar(leftTop + ' '.repeat(topGap) + rightTop));

    // ── Chat + sidebar rows ───────────────────────────────────────────────────
    if (this._dirty) {
      this._chatLines = this._buildChatLines(mainW - 2);
      this._dirty = false;
    }

    const total = this._chatLines.length;
    const start = Math.max(0, total - chatH - this.scrollOffset);
    const end   = Math.max(0, total - this.scrollOffset);
    const slice = this._chatLines.slice(start, end);

    const chatRows = [];

    // Header inside main area — Fabio avatar + greeting
    const avatarLines = FABIO_ART.slice(0, 3);
    const headerLines = [
      '',
      `  ${c.bold(c.blue('Fabio'))} ${c.grayMid('(Fabion AI)')}`,
      `  ${c.grayMid('Hello ' + this.projectName + '!')}`,
      `  ${c.gray('What shall we build today?')}`,
      '',
    ];

    // Only show header if no messages
    if (this.messages.length === 0) {
      // Fabio avatar + text side by side
      const maxHeaderLines = Math.max(avatarLines.length, headerLines.length);
      for (let i = 0; i < maxHeaderLines; i++) {
        const av = avatarLines[i] ?? '';
        const hl = headerLines[i] ?? '';
        const avVis = visibleLength(av);
        chatRows.push((av || ' '.repeat(avVis || 6)) + '  ' + hl);
      }
      chatRows.push('');
      chatRows.push(c.gray('  ─'.repeat(Math.floor((mainW - 2) / 2))));
      chatRows.push('');
      chatRows.push(c.dim(c.gray('  /help for commands · /clear to reset · Ctrl+C to quit')));
    }

    // Pad top of chat
    while (chatRows.length + slice.length < chatH) chatRows.push('');
    chatRows.push(...slice);

    // Sidebar content
    const sidebarRows = showSidebar ? this._buildSidebar(chatH, SW) : [];

    // Compose rows
    for (let i = 0; i < chatH; i++) {
      const chatLine = chatRows[i - (chatH - chatRows.length)] ?? '';
      const chatVis  = visibleLength(chatLine);
      const chatPad  = ' '.repeat(Math.max(0, mainW - chatVis));

      if (showSidebar) {
        const sidebarLine = sidebarRows[i] ?? ' '.repeat(SW);
        frame.push(chatLine + chatPad + sidebarLine);
      } else {
        frame.push(chatLine + chatPad);
      }
    }

    // ── Input bar ─────────────────────────────────────────────────────────────
    frame.push(c.gray('─'.repeat(W)));

    if (this.isGenerating) {
      frame.push(`  ${this.activityText}   ${c.dim(c.gray('Ctrl+C to stop'))}`);
    } else {
      let display = this.input;
      let cp      = this.cursor;
      const iw    = W - 6;
      if (display.length > iw) {
        const s = Math.max(0, cp - Math.floor(iw/2));
        display = display.slice(s, s+iw);
        cp = cp - s;
      }
      const before = display.slice(0, cp);
      const at     = display[cp] ?? ' ';
      const after  = display.slice(cp+1);
      const rendered = c.grayLight(before) + c.bgInput(c.white(at)) + c.grayLight(after);
      const ph = this.input.length === 0 ? c.dim(c.gray('Ask Fabio anything...')) : '';
      frame.push(`  ${c.bold(c.teal('> '))}${this.input.length ? rendered : ph}`);
    }

    frame.push(c.gray('─'.repeat(W)));

    // ── Bottom bar ────────────────────────────────────────────────────────────
    const folderIcon = c.blue('⊡');
    const branchIcon = c.grayMid('⎇');
    const leftBot  = ` ${folderIcon} ${c.blue('~/' + this.projectName)}   ${branchIcon} ${c.grayMid('main')}   ${c.green('● Agent: Fabio')}   ${c.blue('⬡')}   ${this.activityText}`;
    const rightBot = c.gray('Type / for commands   ') + c.grayMid('?');
    const leftBotVis  = visibleLength(leftBot);
    const rightBotVis = visibleLength(rightBot);
    const botGap = Math.max(1, W - leftBotVis - rightBotVis);
    frame.push(c.bgBar(leftBot + ' '.repeat(botGap) + rightBot));

    // ── Write ─────────────────────────────────────────────────────────────────
    process.stdout.write('\x1b[H' + frame.slice(0, H).join('\r\n'));
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────

  _buildSidebar(height, width) {
    const rows = [];
    const w = width - 1;

    const line = (content = '') => {
      const v = visibleLength(content);
      return c.gray('│') + content + ' '.repeat(Math.max(0, w - v));
    };

    const heading = text => line(' ' + c.bold(c.grayMid(text.toUpperCase())));
    const blank   = ()   => line();
    const divider = ()   => line(c.gray('─'.repeat(w - 1)));

    // SESSION
    rows.push(blank());
    rows.push(heading('Session'));
    rows.push(line(`  ${c.gray('⏱')} ${c.grayLight(this._sessionTime())}`));
    rows.push(line(`  ${c.gray('⚡')} ${c.grayLight(this.toolCalls + ' tool calls')}`));
    rows.push(line(`  ${c.gray('◉')} ${c.grayLight(this.tokenCount + ' tokens')}`));

    // FILES CONTEXT
    rows.push(blank());
    rows.push(divider());
    rows.push(heading('Files Context'));
    if (this.filesContext.length === 0) {
      rows.push(line(`  ${c.dim(c.gray('No files yet'))}`));
    } else {
      for (const f of this.filesContext.slice(0, 5)) {
        rows.push(line(`  ${c.grayMid(truncate(f, w - 4))}`));
      }
    }

    // TOOLS
    rows.push(blank());
    rows.push(divider());
    rows.push(heading('Tools'));
    for (const [name, count] of Object.entries(this.toolStats)) {
      if (count === 0) continue;
      const col = name === 'Read' ? c.blue : name === 'Edit' ? c.orange : name === 'Search' ? c.yellow : c.green;
      rows.push(line(`  ${col(name.padEnd(10))}${c.grayMid(String(count))}`));
    }
    if (Object.values(this.toolStats).every(v => v === 0)) {
      rows.push(line(`  ${c.dim(c.gray('No tools used yet'))}`));
    }

    // MODEL
    rows.push(blank());
    rows.push(divider());
    rows.push(heading('Model'));
    rows.push(line(`  ${c.grayLight(truncate(stripAnsi(this.modelName), w - 4))}`));
    rows.push(line(`  ${c.dim(c.gray('128K context'))}`));

    // Pad to height
    while (rows.length < height) rows.push(blank());

    return rows.slice(0, height);
  }

  // ── Build chat lines ───────────────────────────────────────────────────────

  _buildChatLines(width) {
    const lines = [];
    for (const msg of this.messages) {
      lines.push('');
      if (msg.role === 'user') {
        lines.push(c.bold(c.teal('> ')) + c.bold(c.grayLight('You: ')) + c.cream(msg.content));
      } else if (msg.role === 'assistant') {
        lines.push(c.blue('● ') + c.bold(c.blue('Fabio: ')));
        for (const l of this._renderMd(msg.content, width - 2)) {
          lines.push('  ' + l);
        }
      } else if (msg.role === 'activity') {
        lines.push(`  ${c.gray('○')} ${c.dim(c.grayMid(msg.content))}`);
      } else if (msg.role === 'error') {
        lines.push(c.red('✗ Error: ') + c.red(msg.content));
      }
    }
    if (lines.length) lines.push('');
    return lines;
  }

  _renderMd(text, width) {
    if (!text) return [c.gray('...')];
    const out = []; let inCode = false; let lang = ''; let codeLines = [];

    for (const raw of text.split('\n')) {
      if (raw.startsWith('```')) {
        if (!inCode) { inCode = true; lang = raw.slice(3).trim(); codeLines = []; }
        else {
          // Render code block with syntax highlighting
          const bar = c.gray('  ' + '─'.repeat(Math.min(width - 4, 50)));
          const langLabel = lang ? c.dim(c.grayMid('  ' + lang)) : '';
          if (langLabel) out.push(langLabel);
          out.push(bar);
          const highlighted = syntaxHighlight(codeLines.join('\n'), lang);
          for (const cl of highlighted.split('\n')) {
            out.push(c.bgCode('  ' + cl + ' '.repeat(Math.max(0, width - visibleLength(cl) - 4))) + '\x1b[0m');
          }
          out.push(bar);
          inCode = false; lang = ''; codeLines = [];
        }
        continue;
      }
      if (inCode) { codeLines.push(raw); continue; }

      // Tool activity lines
      if (raw.startsWith('○ ') || raw.startsWith('✓ ') || raw.startsWith('◌ ')) {
        const icon = raw.startsWith('✓') ? c.green('✓') : c.gray('○');
        out.push(`${icon} ${c.grayMid(raw.slice(2))}`);
        continue;
      }

      if (raw.startsWith('# '))   { out.push(c.bold(c.cream(raw.slice(2)))); continue; }
      if (raw.startsWith('## '))  { out.push(c.bold(c.grayLight(raw.slice(3)))); continue; }
      if (raw.startsWith('### ')) { out.push(c.bold(c.gray(raw.slice(4)))); continue; }
      if (raw.match(/^[\*\-] /))  { out.push(c.blue('  ○') + ' ' + this._inline(raw.slice(2))); continue; }
      if (raw.match(/^\d+\. /))   { out.push(c.grayMid('  ' + raw.match(/^(\d+)\./)[0]) + ' ' + this._inline(raw.replace(/^\d+\.\s*/,''))); continue; }
      if (raw.trim() === '')       { out.push(''); continue; }

      for (const l of this._wrap(stripAnsi(this._inline(raw)), width - 2)) {
        out.push(this._inline(l));
      }
    }
    return out.length ? out : [c.gray('(empty)')];
  }

  _inline(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g, (_, x) => c.bold(c.white(x)))
      .replace(/`([^`]+)`/g,     (_, x) => c.bgCode(c.cyan(' '+x+' ')) + '\x1b[0m');
  }

  _wrap(text, width) {
    if (!text || width <= 0) return [text || ''];
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) {
      if ((line+(line?' ':'')+w).length > width) { if (line) lines.push(line); line = w; }
      else line = line ? `${line} ${w}` : w;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  _addHelp() {
    this.messages.push({ role: 'assistant', content: [
      '## Fabion Help',
      '',
      '**Commands:**',
      '- `/clear` — clear conversation',
      '- `/help` — show this help',
      '- `/exit` — quit',
      '',
      '**Keyboard:**',
      '- `Enter` send · `↑↓` history',
      '- `PgUp/Dn` scroll · `Ctrl+U` clear input · `Ctrl+C` quit',
    ].join('\n') });
    this._dirty = true;
    this._render();
  }
}
