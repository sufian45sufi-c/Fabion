import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_MIN_TERMINAL_WIDTH } from './components/sidebar.js';
import { Chat }      from './components/chat.js';
import { Input }     from './components/input.js';
import { StatusBar } from './components/statusbar.js';
import { c, activityLabel } from './theme.js';
const INPUT_HEIGHT=3, STATUSBAR_HEIGHT=1;
export class FabionTUI {
  constructor({agent,modelName='unknown'}){
    this.agent=agent; this.modelName=modelName;
    this.sidebar=new Sidebar(); this.chat=new Chat(); this.input=new Input(); this.statusBar=new StatusBar();
    this.activity='idle'; this.activityText=activityLabel.idle;
    this.streamBuffer=''; this.isGenerating=false; this.sessionCount=1;
    this.width=process.stdout.columns??120; this.height=process.stdout.rows??30;
    this.agent.on(e=>this._onAgentEvent(e));
  }
  async start(){ this._setupTerminal(); this._setupResize(); this._render(); await this._inputLoop(); }
  _setupTerminal(){
    process.stdout.write('\x1b[?1049h\x1b[?25l');
    if(process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume(); process.stdin.setEncoding('utf8');
    const cleanup=()=>{ process.stdout.write('\x1b[?25h\x1b[?1049l'); if(process.stdin.isTTY)process.stdin.setRawMode(false); process.exit(0); };
    process.on('SIGINT',cleanup); process.on('SIGTERM',cleanup);
  }
  _setupResize(){ process.stdout.on('resize',()=>{ this.width=process.stdout.columns??120; this.height=process.stdout.rows??30; this.chat._dirty=true; this._render(); }); }
  async _inputLoop(){ return new Promise(()=>{ process.stdin.on('data',k=>this._handleKey(k)); }); }
  _handleKey(key){
    if(key==='\x03'){process.emit('SIGINT');return;}
    if(key==='\x02'){this.sidebar.toggle();this.chat._dirty=true;this._render();return;}
    if(this.isGenerating){this._render();return;}
    if(key==='\r'||key==='\n'){this._submit();return;}
    if(key==='\x7f'||key==='\x08'){this.input.backspace();this._render();return;}
    if(key==='\x1b[3~'){this.input.delete();this._render();return;}
    if(key==='\x1b[A'){this.input.historyUp();this._render();return;}
    if(key==='\x1b[B'){this.input.historyDown();this._render();return;}
    if(key==='\x1b[C'){this.input.moveRight();this._render();return;}
    if(key==='\x1b[D'){this.input.moveLeft();this._render();return;}
    if(key==='\x1b[H'||key==='\x01'){this.input.moveHome();this._render();return;}
    if(key==='\x1b[F'||key==='\x05'){this.input.moveEnd();this._render();return;}
    if(key==='\x1b[5~'){this.chat.pageUp(this._chatH());this._render();return;}
    if(key==='\x1b[6~'){this.chat.pageDown(this._chatH());this._render();return;}
    if(key==='\x15'){this.input.clear();this._render();return;}
    if(key.length===1&&key>=' '){this.input.insert(key);this._render();return;}
    if(key.length>1&&!key.startsWith('\x1b')){this.input.insert(key);this._render();return;}
  }
  async _submit(){
    const text=this.input.submit(); if(!text)return;
    if(text==='/clear'){this.chat.clearMessages();this._render();return;}
    if(text==='/help'){this._showHelp();return;}
    if(text==='/exit'||text==='exit'){process.emit('SIGINT');return;}
    this.chat.addUserMessage(text);
    this.isGenerating=true; this.input.disabled=true; this.streamBuffer='';
    this._setActivity('thinking'); this._render();
    try{ const r=await this.agent.run(text); this.chat.updateLastAssistant(r); }
    catch(e){ this.chat.addError(e.message??String(e)); }
    finally{ this.isGenerating=false; this.input.disabled=false; this._setActivity('idle'); this._render(); }
  }
  _onAgentEvent(e){
    switch(e.type){
      case 'thinking':       this._setActivity('thinking'); break;
      case 'tool_call':      this.chat.addActivity(`Using: ${e.toolName}`); this._setActivity('running'); break;
      case 'tool_result':    this._setActivity(e.success?'done':'error'); break;
      case 'response_chunk': this.streamBuffer+=e.delta??''; this.chat.updateLastAssistant(this.streamBuffer); break;
      case 'done':           this._setActivity('done'); break;
      case 'error':          this._setActivity('error'); break;
    }
    this._render();
  }
  _setActivity(s){ this.activity=s; this.activityText=activityLabel[s]??activityLabel.idle; }
  _render(){
    const W=this.width,H=this.height;
    const showSidebar=this.sidebar.shouldShow(W);
    const sidebarW=showSidebar?SIDEBAR_WIDTH:0;
    const chatW=W-sidebarW-(showSidebar?1:0);
    const chatH=H-INPUT_HEIGHT-STATUSBAR_HEIGHT;
    const ctx={ modelName:this.modelName, activity:this.activity, activityLabel:this.activityText, messageCount:this.chat.messages.filter(m=>m.role==='user').length, session:`session ${this.sessionCount}` };
    const sidebarLines=showSidebar?this.sidebar.render(chatH,ctx):[];
    const chatLines=this.chat.render(chatW,chatH);
    const inputLines=this.input.render(W);
    const statusLine=this.statusBar.render(W,ctx);
    const frameLines=[];
    for(let i=0;i<chatH;i++){
      let row='';
      if(showSidebar){ row+=sidebarLines[i]??' '.repeat(sidebarW); row+='\x1b[38;2;90;90;100m│\x1b[0m'; }
      const cl=chatLines[i]??''; const vis=cl.replace(/\x1b\[[0-9;]*m/g,'').length;
      row+=cl+' '.repeat(Math.max(0,chatW-vis));
      frameLines.push(row);
    }
    for(const l of inputLines) frameLines.push(l);
    frameLines.push(statusLine);
    process.stdout.write('\x1b[H'+frameLines.slice(0,H).join('\r\n'));
  }
  _chatH(){ return this.height-INPUT_HEIGHT-STATUSBAR_HEIGHT; }
  _showHelp(){
    this.chat.addAssistantMessage('## Fabion Help\n\n**Shortcuts:**\n- `Enter` send\n- `↑↓` history\n- `PgUp/Dn` scroll\n- `Ctrl+B` sidebar\n- `Ctrl+U` clear input\n- `Ctrl+C` quit\n\n**Commands:**\n- `/clear` clear chat\n- `/help` this help\n- `/exit` quit');
    this._render();
  }
}
