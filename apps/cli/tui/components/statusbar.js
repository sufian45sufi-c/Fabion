import { c, sym, visibleLength } from '../theme.js';
export class StatusBar {
  render(width, ctx={}) {
    const model=ctx.modelName??'no model'; const msgs=ctx.messageCount??0; const session=ctx.session??'session 1';
    const left=`${sym.fabio} ${c.bold(c.blue('Fabion'))}  ${c.gray('│')}  ${c.grayMid(model)}  ${c.gray('│')}  ${ctx.activityLabel??c.gray('idle')}`;
    const right=`${c.gray(msgs+' msg'+(msgs!==1?'s':''))}  ${c.gray('│')}  ${c.gray(session)}`;
    const gap=Math.max(1,width-visibleLength(left)-visibleLength(right)-4);
    return c.bgDark(` ${left}${' '.repeat(gap)}${right} `);
  }
}
