import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { c, syntaxHighlight, stripAnsi, visibleLength, truncate } from './theme.js';
import { cwd } from 'node:process';
import { basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION   = 'v0.1.0';
const SIDEBAR_WIDTH = 34;
const SIDEBAR_MIN_W = 100;
const SPINNER = ['◐','◓','◑','◒'];

function loadFabioArt() {
  try {
    const p = join(__dirname, '../../../assets/fabio/fabio.ansi');
    const content = readFileSync(p, 'utf8');
    const lines = content.split('\n');
    while (lines.length && !lines[lines.length-1]) lines.pop();
    return lines;
  } catch { return []; }
}

const FABIO_ART = loadFabioArt();
const FABIO_W   = FABIO_ART.length > 0 ? visibleLength(FABIO_ART[0]) : 0;

export class FabionTUI {
  constructor({ agent, modelName = 'unknown' }) {
    this.agent       = agent;
    this.modelName   = modelName;
    this.cwd         = cwd();
    this.projectName = basename(this.cwd);
    this.messages    = [];
    this.activities  = [];
    this.input       = '';
    this.cursor      = 0;
    this.history     = [];
    this.historyIdx  = -1;
    this.isGenerating = false;
    this.activity    = 'idle';
    this.scrollOffset = 0;
    this._chatLines  = [];
    this._dirty      = true;
    this._spinnerFrame = 0;
    this._spinnerTimer = null;
    this.sessionStart = Date.now();
    this.toolCalls   = 0;
    this.tokenCount  = 0;
    this.filesContext = [];
    this.toolStats   = { Read: 0, Edit: 0, Search: 0, Run: 0 };
    this.width  = process.stdout.columns ?? 120;
    this.height = process.stdout.rows    ?? 30;
    this.agent.on(e => this._onAgentEvent(e));
  }

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
      this._stopSpinner();
      process.stdout.write('\x1b[?25h\x1b[?1049l');
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
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

  _startSpinner() {
    if (this._spinnerTimer) return;
    this._spinnerTimer = setInterval(() => {
      this._spinnerFrame = (this._spinnerFrame + 1) % SPINNER.length;
      this._render();
    }, 120);
  }

  _stopSpinner() {
    if (this._spinnerTimer) { clearInterval(this._spinnerTimer); this._spinnerTimer = null; }
  }

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
    if (key === '\x1b[5~') { this.scrollOffset = Math.min(this.scrollOffset+5, Math.max(0,this._chatLines.length-1)); this._render(); return; }
    if (key === '\x1b[6~') { this.scrollOffset = Math.max(0, this.scrollOffset-5); this._render(); return; }
    if (key === '\x15') { this.input=''; this.cursor=0; this._render(); return; }
    if (key.length===1 && key>=' ') {
      this.input = this.input.slice(0,this.cursor)+key+this.input.slice(this.cursor);
      this.cursor++; this._render(); return;
    }
    if (key.length>1 && !key.startsWith('\x1b')) {
      this.input = this.input.slice(0,this.cursor)+key+this.input.slice(this.cursor);
      this.cursor += key.length; this._render();
    }
  }

  _backspace() {
    if (this.cursor===0) return;
    this.input = this.input.slice(0,this.cursor-1)+this.input.slice(this.cursor);
    this.cursor--; this._render();
  }

  _histUp() {
    if (!this.history.length) return;
    this.historyIdx = Math.min(this.historyIdx+1, this.history.length-1);
    this.input = this.history[this.historyIdx]??'';
    this.cursor = this.input.length;
  }

  _histDown() {
    if (this.historyIdx<=0) { this.historyIdx=-1; this.input=''; this.cursor=0; return; }
    this.historyIdx--;
    this.input = this.history[this.historyIdx]??'';
    this.cursor = this.input.length;
  }

  async _submit() {
    const text = this.input.trim();
    if (!text) return;
    this.history.unshift(text);
    this.historyIdx=-1; this.input=''; this.cursor=0;

    if (text==='/clear') { this.messages=[]; this.activities=[]; this._dirty=true; this._render(); return; }
    if (text==='/help')  { this._addHelp(); return; }
    if (text==='/exit'||text==='exit') { process.emit('SIGINT'); return; }

    this.messages.push({ role:'user', content:text });
    this.activities=[];
    this.isGenerating=true;
    this.activity='thinking';
    this.scrollOffset=0;
    this._dirty=true;
    this._startSpinner();
    this._render();

    try {
      const r = await this.agent.run(text);
      this._stopSpinner();
      this.messages.push({ role:'assistant', content:r });
      this.tokenCount += Math.floor(r.length/4);
    } catch(e) {
      this._stopSpinner();
      this.messages.push({ role:'error', content: e.message??String(e) });
    } finally {
      this.isGenerating=false; this.activity='idle';
      this.scrollOffset=0; this._dirty=true; this._render();
    }
  }

  _onAgentEvent(e) {
    switch(e.type) {
      case 'thinking': this.activity='thinking'; break;
      case 'tool_call':
        this.activity='working'; this.toolCalls++;
        const tn=(e.toolName??'').toLowerCase();
        if(tn.includes('read'))   { this.toolStats.Read++;   this.activities.push({text:`Reading ${e.input?.path??'file'}`,done:false}); }
        if(tn.includes('write')||tn.includes('edit')) { this.toolStats.Edit++; this.activities.push({text:`Editing ${e.input?.path??'file'}`,done:false}); }
        if(tn.includes('search')) { this.toolStats.Search++; this.activities.push({text:`Searching ${e.input?.query??'...'}`,done:false}); }
        if(tn.includes('run'))    { this.toolStats.Run++;    this.activities.push({text:`Running: ${e.input?.command??'command'}`,done:false}); }
        this._dirty=true; break;
      case 'tool_result':
        if(this.activities.length>0) {
          const last=this.activities[this.activities.length-1];
          last.done=e.success!==false; last.failed=e.success===false;
          if(last.done&&e.output){ const n=String(e.output).split('\n').length; last.detail=`${n} lines`; }
        }
        this._dirty=true; break;
      case 'done':  this.activity='idle';  break;
      case 'error': this.activity='error'; break;
    }
    this._render();
  }

  _sessionTime() {
    const s=Math.floor((Date.now()-this.sessionStart)/1000);
    return `${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`;
  }

  // ── MAIN RENDER ─────────────────────────────────────────────────────────────

  _render() {
    if (this.messages.length===0 && !this.isGenerating) {
      this._renderPreChat();
    } else {
      this._renderChat();
    }
  }

  // ── PRE-CHAT — matches Image 2 exactly ────────────────────────────────────
  //
  //   [FABIO]   Fabion Code v0.1.0
  //             Fabio  1.0 · Fabion Enterprise
  //             /workspaces/Fabion
  //   ─────────────────────────────────────
  //   > Ask Fabio anything...
  //   ─────────────────────────────────────

  _renderPreChat() {
    const W = this.width;
    const H = this.height;
    const frame = [];

    frame.push('');

    // Info lines that sit beside the mascot
    const info = [
      '',
      c.bold(c.blue('Fabion Code')) + c.gray(' '+VERSION),
      c.bold(c.cream('Fabio')) + c.gray('  1.0 · ') + c.bold(c.blue('Fabion Enterprise')),
      c.gray(this.cwd),
    ];

    const rows = Math.max(FABIO_ART.length, info.length);

    for (let i=0; i<rows; i++) {
      const art    = FABIO_ART[i] ?? '';
      const artVis = visibleLength(art);
      const artPad = ' '.repeat(Math.max(0, FABIO_W - artVis));
      const inf    = info[i] ?? '';
      frame.push(' ' + art + artPad + '  ' + inf);
    }

    frame.push('');
    frame.push(c.gray('─'.repeat(W)));
    frame.push(this._inputLine(W));
    frame.push(c.gray('─'.repeat(W)));

    while (frame.length < H) frame.push('');

    process.stdout.write('\x1b[H' + frame.slice(0,H).join('\r\n'));
  }

  // ── CHAT — matches Image 1 exactly ────────────────────────────────────────

  _renderChat() {
    const W = this.width;
    const H = this.height;
    const showSidebar = W >= SIDEBAR_MIN_W;
    const SW    = showSidebar ? SIDEBAR_WIDTH : 0;
    const mainW = W - SW;
    const chatH = H - 2 - 3 - 1; // topbar+div, div+input+div, statusbar
    const frame = [];

    // Top bar
    const icon   = c.blue('⬡');
    const app    = c.bold(c.blue('Fabion'))+c.gray(' '+VERSION);
    const path   = c.grayMid('~/'+this.projectName);
    const model  = c.gray('Model: ')+c.grayMid(truncate(stripAnsi(this.modelName),26));
    const online = c.green('● Online');
    const lTop=` ${icon} ${app}`, cTop=path, rTop=`${model}   ${online} `;
    const lv=visibleLength(lTop), cv=visibleLength(cTop), rv=visibleLength(rTop);
    const g=W-lv-cv-rv, lp=Math.max(0,Math.floor(g/2)), rp=Math.max(0,g-lp);
    frame.push(lTop+' '.repeat(lp)+cTop+' '.repeat(rp)+rTop);
    frame.push(c.gray('─'.repeat(W)));

    // Chat lines
    if (this._dirty) { this._chatLines=this._buildChat(mainW-2); this._dirty=false; }
    const total=this._chatLines.length;
    const vs=Math.max(0,total-chatH-this.scrollOffset);
    const ve=Math.max(0,total-this.scrollOffset);
    const slice=this._chatLines.slice(vs,ve);
    const rows=[];
    while (rows.length+slice.length<chatH) rows.push('');
    rows.push(...slice);

    const sidebar=showSidebar?this._sidebar(chatH,SW):[];
    for (let i=0;i<chatH;i++) {
      const row=rows[i]??'';
      const pad=' '.repeat(Math.max(0,mainW-visibleLength(row)));
      frame.push(showSidebar?row+pad+(sidebar[i]??''):row+pad);
    }

    // Input
    frame.push(c.gray('─'.repeat(W)));
    if (this.isGenerating) {
      const sp=c.blue(SPINNER[this._spinnerFrame]);
      frame.push(`  ${sp} `+(this.activity==='thinking'?c.blue('Fabio is thinking...'):c.yellow('Fabio is working...')));
    } else {
      frame.push(this._inputLine(W));
    }
    frame.push(c.gray('─'.repeat(W)));

    // Status bar
    const fl=c.blue('⊡ ~/'+this.projectName);
    const br=c.grayMid('⎇  main');
    const ag=c.green('● Agent: Fabio');
    const fb=c.blue('⬡');
    const wk=this.isGenerating?c.blue(SPINNER[this._spinnerFrame]+' '+(this.activity==='thinking'?'Thinking':'Working')):c.gray('◈ Idle');
    const rr=c.gray('Type / for commands')+'  '+c.grayMid('?');
    const lb=` ${fl}   ${br}   ${ag}   ${fb}   ${wk}`;
    const bg=Math.max(1,W-visibleLength(lb)-visibleLength(rr)-1);
    frame.push(lb+' '.repeat(bg)+rr+' ');

    process.stdout.write('\x1b[H'+frame.slice(0,H).join('\r\n'));
  }

  _inputLine(W) {
    let d=this.input, cp=this.cursor;
    const iw=W-6;
    if (d.length>iw) { const s=Math.max(0,cp-Math.floor(iw/2)); d=d.slice(s,s+iw); cp=cp-s; }
    const b=d.slice(0,cp), at=d[cp]??' ', a=d.slice(cp+1);
    const rendered=c.grayLight(b)+c.bgInput(c.white(at))+c.grayLight(a);
    const ph=this.input.length===0?c.dim(c.gray('Ask Fabio anything...')):'';
    return `  ${c.bold(c.blue('> '))}${this.input.length?rendered:ph}`;
  }

  _sidebar(height, width) {
    const rows=[];
    const w=width;
    const row=(content='')=>{ const v=visibleLength(content); return c.gray('│')+' '+content+' '.repeat(Math.max(0,w-v-2)); };
    const H=text=>row(c.bold(c.blue(text)));
    const blank=()=>row('');
    const div=()=>row(c.gray('─'.repeat(w-2)));
    rows.push(blank());
    rows.push(H('SESSION'));
    rows.push(row(c.gray('◷ ')+c.grayLight(this._sessionTime())));
    rows.push(row(c.gray('⌁ ')+c.grayLight(this.toolCalls+' tool calls')));
    rows.push(row(c.gray('● ')+c.grayLight(this.tokenCount.toLocaleString()+' tokens')));
    rows.push(blank()); rows.push(div()); rows.push(H('FILES CONTEXT'));
    if (!this.filesContext.length) rows.push(row(c.dim(c.gray('No files yet'))));
    else for (const f of this.filesContext.slice(0,6)) rows.push(row(c.grayMid(truncate(f,w-4))));
    rows.push(blank()); rows.push(div()); rows.push(H('TOOLS'));
    const tc={Read:c.blue,Edit:c.orange,Search:c.yellow,Run:c.grayLight};
    for (const [n,cnt] of Object.entries(this.toolStats)) {
      const col=tc[n]??c.grayLight;
      rows.push(row(col(n)+' '.repeat(Math.max(1,20-n.length))+(cnt>0?c.grayLight(String(cnt)):c.dim(c.gray('0')))));
    }
    rows.push(blank()); rows.push(div()); rows.push(H('MODEL'));
    rows.push(row(c.grayMid(truncate(stripAnsi(this.modelName),w-4))));
    rows.push(row(c.dim(c.gray('128K context'))));
    while (rows.length<height) rows.push(blank());
    return rows.slice(0,height);
  }

  _buildChat(width) {
    const lines=[];
    const artH=Math.min(FABIO_ART.length,4);
    const greet=[
      c.bold(c.blue('Fabio'))+c.gray(' (Fabion AI)'),
      c.grayLight('Hello '+(process.env.USER??'Sufian')+'! 👋'),
      c.gray('What shall we build today?'),
    ];
    for (let i=0;i<Math.max(artH,greet.length);i++) {
      const av=FABIO_ART[i]??'';
      const pad=' '.repeat(Math.max(0,FABIO_W-visibleLength(av)));
      lines.push(' '+av+pad+'  '+(greet[i]??''));
    }
    lines.push('');

    for (const msg of this.messages) {
      if (msg.role==='user') {
        lines.push('');
        lines.push(c.teal('> ')+c.bold(c.grayLight('You: '))+c.cream(msg.content));
      } else if (msg.role==='assistant') {
        lines.push('');
        lines.push(c.blue('● ')+c.bold(c.blue('Fabio: ')));
        for (const l of this._md(msg.content,width-4)) lines.push('  '+l);
        for (const act of this.activities) {
          const icon=act.failed?c.red('✗'):act.done?c.green('✓'):c.gray('○');
          const text=act.done?c.green(act.text)+(act.detail?c.gray(' '+act.detail):''):c.gray(act.text);
          lines.push(`  ${icon} ${text}`);
        }
      } else if (msg.role==='error') {
        lines.push('');
        lines.push(c.red('✗ Error: ')+c.red(msg.content));
      }
    }
    if (this.isGenerating&&this.activities.length>0) {
      lines.push('');
      for (const act of this.activities) {
        const icon=act.failed?c.red('✗'):act.done?c.green('✓'):c.gray('○');
        lines.push(`  ${icon} `+(act.done?c.green(act.text)+(act.detail?c.gray(' '+act.detail):''):c.gray(act.text)));
      }
    }
    if (lines.length) lines.push('');
    return lines;
  }

  _md(text, width) {
    if (!text) return [c.gray('...')];
    const out=[]; let inCode=false,lang='',codeLines=[];
    for (const raw of text.split('\n')) {
      if (raw.startsWith('```')) {
        if (!inCode) { inCode=true; lang=raw.slice(3).trim(); codeLines=[]; }
        else {
          const bar=c.gray('  '+'─'.repeat(Math.min(width-4,52)));
          if (lang) out.push(c.dim(c.blue('  '+lang)));
          out.push(bar);
          for (const cl of syntaxHighlight(codeLines.join('\n'),lang).split('\n')) out.push(c.bgCode('  '+cl));
          out.push(bar);
          inCode=false; lang=''; codeLines=[];
        }
        continue;
      }
      if (inCode) { codeLines.push(raw); continue; }
      if (raw.startsWith('# '))   { out.push(c.bold(c.cream(raw.slice(2)))); continue; }
      if (raw.startsWith('## '))  { out.push(c.bold(c.grayLight(raw.slice(3)))); continue; }
      if (raw.match(/^[\*\-] /))  { out.push(c.blue('  ○')+' '+this._il(raw.slice(2))); continue; }
      if (raw.trim()==='')         { out.push(''); continue; }
      for (const l of this._wrap(stripAnsi(this._il(raw)),width-2)) out.push(this._il(l));
    }
    return out.length?out:[c.gray('(empty)')];
  }

  _il(t) {
    return t
      .replace(/\*\*(.+?)\*\*/g,(_,x)=>c.bold(c.white(x)))
      .replace(/`([^`]+)`/g,    (_,x)=>c.bgCode(c.cyan(' '+x+' '))+'\x1b[0m');
  }

  _wrap(text, width) {
    if (!text||width<=0) return [text||''];
    const words=text.split(' '); const lines=[]; let line='';
    for (const w of words) {
      if ((line+(line?' ':'')+w).length>width) { if(line)lines.push(line); line=w; }
      else line=line?`${line} ${w}`:w;
    }
    if (line) lines.push(line);
    return lines.length?lines:[''];
  }

  _addHelp() {
    this.messages.push({ role:'assistant', content:'## Help\n\n`/clear` new chat · `/help` commands · `/exit` quit\n\n`Enter` send · `↑↓` history · `PgUp/Dn` scroll · `Ctrl+C` quit' });
    this._dirty=true; this._render();
  }
}