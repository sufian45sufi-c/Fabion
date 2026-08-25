import { c, sym, stripAnsi, visibleLength } from '../theme.js';
export class Chat {
  constructor() { this.messages = []; this.scrollOffset = 0; this._renderedLines = []; this._dirty = true; }
  addUserMessage(content)      { this.messages.push({ role:'user', content }); this._dirty = true; this.scrollToBottom(); }
  addAssistantMessage(content) { this.messages.push({ role:'assistant', content }); this._dirty = true; this.scrollToBottom(); }
  updateLastAssistant(content) {
    const last = this.messages[this.messages.length - 1];
    if (last?.role === 'assistant') last.content = content;
    else this.messages.push({ role:'assistant', content });
    this._dirty = true;
  }
  addActivity(text) { this.messages.push({ role:'activity', content:text }); this._dirty = true; }
  addError(text)    { this.messages.push({ role:'error', content:text }); this._dirty = true; this.scrollToBottom(); }
  clearMessages()   { this.messages = []; this._dirty = true; this.scrollOffset = 0; }
  scrollToBottom()  { this.scrollOffset = 0; }
  scrollUp(n=3)     { this.scrollOffset = Math.min(this.scrollOffset + n, Math.max(0, this._renderedLines.length - 1)); }
  scrollDown(n=3)   { this.scrollOffset = Math.max(0, this.scrollOffset - n); }
  pageUp(h)         { this.scrollUp(Math.floor(h * 0.8)); }
  pageDown(h)       { this.scrollDown(Math.floor(h * 0.8)); }
  render(width, height) {
    if (this._dirty) { this._renderedLines = this._buildLines(width); this._dirty = false; }
    const total = this._renderedLines.length;
    const start = Math.max(0, total - height - this.scrollOffset);
    const end   = Math.max(0, total - this.scrollOffset);
    const slice = this._renderedLines.slice(start, end);
    const lines = [];
    while (lines.length + slice.length < height) lines.push('');
    lines.push(...slice);
    if (this.scrollOffset > 0 && lines.length > 0) lines[lines.length-1] = c.gray(` ↓ ${this.scrollOffset} lines below `);
    return lines.slice(-height);
  }
  _buildLines(width) {
    const lines = []; const cw = width - 2;
    if (this.messages.length === 0) {
      return ['', c.gray('  Start a conversation with Fabio.'), c.gray('  Type your message below and press Enter.'), '',
              c.gray('  ' + '─'.repeat(Math.min(40, cw))), '', c.gray('  Ctrl+B sidebar · PgUp/Dn scroll · Ctrl+C quit')];
    }
    for (const msg of this.messages) {
      lines.push('');
      if (msg.role === 'user') {
        lines.push(`  ${sym.user} ${c.bold(c.blue('You'))}`);
        for (const l of this._wrap(msg.content, cw)) lines.push(`    ${c.cream(l)}`);
      } else if (msg.role === 'assistant') {
        lines.push(`  ${sym.fabio} ${c.bold(c.blue('Fabio'))}`);
        for (const l of this._renderMd(msg.content, cw)) lines.push(`    ${l}`);
      } else if (msg.role === 'activity') {
        lines.push(`  ${c.gray('·')} ${c.dim(c.yellow(msg.content))}`);
      } else if (msg.role === 'error') {
        lines.push(`  ${sym.cross} ${c.red('Error')}`);
        for (const l of this._wrap(msg.content, cw)) lines.push(`    ${c.red(l)}`);
      }
    }
    lines.push(''); return lines;
  }
  _renderMd(text, width) {
    if (!text) return [c.gray('...')];
    const out = []; let inCode = false; let codeLang = ''; let codeLines = [];
    for (const raw of text.split('\n')) {
      if (raw.startsWith('```')) {
        if (!inCode) { inCode = true; codeLang = raw.slice(3).trim(); codeLines = []; }
        else {
          if (codeLang) out.push(c.gray(`  ${codeLang}`));
          out.push(c.gray('  ' + '─'.repeat(Math.min(width-4, 48))));
          for (const cl of codeLines) out.push(c.grayLight('  ' + cl));
          out.push(c.gray('  ' + '─'.repeat(Math.min(width-4, 48))));
          inCode = false; codeLang = ''; codeLines = [];
        }
        continue;
      }
      if (inCode) { codeLines.push(raw); continue; }
      if (raw.startsWith('# '))   { out.push(c.bold(c.blue(raw.slice(2)))); continue; }
      if (raw.startsWith('## '))  { out.push(c.bold(c.cream(raw.slice(3)))); continue; }
      if (raw.startsWith('### ')) { out.push(c.bold(c.grayLight(raw.slice(4)))); continue; }
      if (raw.match(/^[\*\-] /))  { out.push(`${c.blue('·')} ${this._inline(raw.slice(2))}`); continue; }
      if (raw.trim() === '')       { out.push(''); continue; }
      for (const l of this._wrap(stripAnsi(this._inline(raw)), width-2)) out.push(this._inline(l));
    }
    return out.length ? out : [c.gray('(empty)')];
  }
  _inline(t) { return t.replace(/\*\*(.+?)\*\*/g, (_,x)=>c.bold(c.white(x))).replace(/`([^`]+)`/g, (_,x)=>c.grayLight(x)); }
  _wrap(text, width) {
    if (!text || width <= 0) return [text||''];
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) {
      if ((line+(line?' ':'')+w).length > width) { if (line) lines.push(line); line = w; }
      else line = line ? `${line} ${w}` : w;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
}
