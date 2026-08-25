import { c, sym } from '../theme.js';
export class Input {
  constructor() { this.value=''; this.cursor=0; this.history=[]; this.historyIdx=-1; this.disabled=false; }
  insert(ch) { if(this.disabled)return; this.value=this.value.slice(0,this.cursor)+ch+this.value.slice(this.cursor); this.cursor+=ch.length; this.historyIdx=-1; }
  backspace() { if(this.disabled||this.cursor===0)return; this.value=this.value.slice(0,this.cursor-1)+this.value.slice(this.cursor); this.cursor=Math.max(0,this.cursor-1); }
  delete()    { if(this.disabled||this.cursor>=this.value.length)return; this.value=this.value.slice(0,this.cursor)+this.value.slice(this.cursor+1); }
  clear()     { this.value=''; this.cursor=0; }
  moveLeft()  { this.cursor=Math.max(0,this.cursor-1); }
  moveRight() { this.cursor=Math.min(this.value.length,this.cursor+1); }
  moveHome()  { this.cursor=0; }
  moveEnd()   { this.cursor=this.value.length; }
  historyUp() { if(!this.history.length)return; this.historyIdx=Math.min(this.historyIdx+1,this.history.length-1); this.value=this.history[this.historyIdx]??''; this.cursor=this.value.length; }
  historyDown() { if(this.historyIdx<=0){this.historyIdx=-1;this.value='';this.cursor=0;return;} this.historyIdx--; this.value=this.history[this.historyIdx]??''; this.cursor=this.value.length; }
  submit() { const t=this.value.trim(); if(!t)return null; this.history.unshift(t); this.clear(); this.historyIdx=-1; return t; }
  render(width) {
    const lines = [c.gray('─'.repeat(width))];
    if (this.disabled) {
      lines.push(`  ${c.dim(c.gray('Fabio is responding...'))}  ${c.gray('Ctrl+C to stop')}`);
    } else {
      const prompt='  ▸ '; const iw=width-6;
      let display=this.value; let cp=this.cursor;
      if(display.length>iw){const s=Math.max(0,cp-Math.floor(iw/2));display=display.slice(s,s+iw);cp=cp-s;}
      const bc=display.slice(0,cp); const ac=display.slice(cp+1); const at=display[cp]??' ';
      const rendered=c.cream(bc)+c.bgInput(c.cream(at))+c.cream(ac);
      lines.push(c.blue(prompt)+(this.value.length?rendered:c.gray('Ask Fabio anything... (Enter to send)')));
    }
    lines.push(c.gray(`  ${c.dim('Enter')} send · ${c.dim('↑↓')} history · ${c.dim('^B')} sidebar · ${c.dim('^C')} quit`));
    return lines;
  }
}
