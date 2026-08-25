import { c, sym, FABIO_SMALL, visibleLength, truncate } from '../theme.js';
export const SIDEBAR_WIDTH = 22;
export const SIDEBAR_MIN_TERMINAL_WIDTH = 80;
export class Sidebar {
  constructor() { this.visible = true; this.activeItem = 0; this.items = ['Sessions','Project','Files','Changes','Agent','Help']; }
  toggle() { this.visible = !this.visible; }
  shouldShow(w) { return this.visible && w >= SIDEBAR_MIN_TERMINAL_WIDTH; }
  navigateUp()   { this.activeItem = Math.max(0, this.activeItem - 1); }
  navigateDown() { this.activeItem = Math.min(this.items.length - 1, this.activeItem + 1); }
  render(height, ctx = {}) {
    const lines = []; const w = SIDEBAR_WIDTH;
    const blank = () => lines.push(this._line('', w));
    lines.push(this._line(c.bold(c.blue(' FABION')), w));
    lines.push(this._line(c.gray(' AI workspace'), w));
    blank();
    for (const row of FABIO_SMALL) lines.push(this._line(row, w));
    blank();
    lines.push(this._line(c.gray('─'.repeat(w)), w));
    this.items.forEach((item, i) => {
      const icons = { Sessions:'◉', Project:'⬡', Files:'⊞', Changes:'±', Agent:'◈', Help:'?' };
      const label = `${icons[item]??'·'} ${item}`;
      const styled = i === this.activeItem ? c.bold(c.cream(` ${label}`)) : c.gray(` ${label}`);
      lines.push(this._line(styled, w));
    });
    blank(); lines.push(this._line(c.gray('─'.repeat(w)), w)); blank();
    lines.push(this._line(c.gray(' Model'), w));
    lines.push(this._line(c.blue(' ' + truncate(ctx.modelName ?? 'no model', w - 2)), w));
    blank();
    lines.push(this._line(c.gray(' Status'), w));
    lines.push(this._line(' ' + (ctx.activityLabel ?? c.gray('idle')), w));
    blank();
    lines.push(this._line(c.gray('─'.repeat(w)), w));
    lines.push(this._line(c.gray(' ^B') + c.gray(' sidebar'), w));
    lines.push(this._line(c.gray(' ^C') + c.gray(' quit'), w));
    lines.push(this._line(c.gray(' ↑↓') + c.gray(' scroll'), w));
    while (lines.length < height) lines.push(this._line('', w));
    return lines.slice(0, height);
  }
  _line(content, width) { const v = visibleLength(content); if (v >= width) return content; return content + ' '.repeat(width - v); }
}
