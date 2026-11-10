// The value painted on a control outranks a record refreshed in memory while the screen waits to redraw.
export function originalAttribute(esc,value){return `data-original="${esc(JSON.stringify(value))}"`}
export function renderedOriginal(control,live=null){const own=control?.getAttribute?.('data-original');if(own)return JSON.parse(own);const form=control?.closest?.('form[data-original]');const painted=form?.getAttribute?.('data-original');if(painted)return JSON.parse(painted);return live}
export function applyShownFlag(tasks,id,control,setTaskFlag){const shown=control?.getAttribute?.('aria-pressed');if(shown!=='true'&&shown!=='false')throw Error('화면의 중요 표시를 다시 확인해주세요.');return setTaskFlag(tasks,id,{id,flagged:shown==='true'})}
export function applyShownClose(day,control,toggleDiaryClosed){const closed=control?.getAttribute?.('data-closed');if(closed!=='0'&&closed!=='1')throw Error('화면의 마감 표시를 다시 확인해주세요.');return toggleDiaryClosed(day,{closedDay:closed==='1',existed:control.getAttribute('data-existed')==='1'})}
export function shownStatusAttribute(status){return `data-shown-status="${status}"`}
export function applyShownEventAction(d,id,control,action,time,eventAction){
 const shown=control?.getAttribute?.('data-shown-status');
 if(!shown)throw Error('화면의 일정 상태를 다시 확인해주세요.');
 const e=d.events.find(item=>item.id===id);
 if(!e)throw Error('삭제된 일정이거나 찾을 수 없어요.');
 const current=e.status||'planned';
 if(current===action)return;
 if(current!==shown)throw Error('다른 기기나 화면에서 일정이 바뀌었어요. 화면을 다시 확인해주세요.');
 eventAction(d,id,action,time);
}
export function applyShownRoutineAction(d,date,id,control,action,time,routineAction){
 const shown=control?.getAttribute?.('data-shown-status');
 if(!shown)throw Error('화면의 루틴 상태를 다시 확인해주세요.');
 const target={start:'doing',done:'done',skip:'skipped',reset:'pending'}[action];
 if(!target)throw Error('화면의 루틴 상태를 다시 확인해주세요.');
 const run=d.routineRuns?.[date]?.[id];
 const current=run?.status||'pending';
 if(action==='reset'){
  if(!run)return;
  if(current!==shown)throw Error('다른 기기나 화면에서 루틴이 바뀌었어요. 화면을 다시 확인해주세요.');
  routineAction(d,date,id,'reset',null,time);
  return;
 }
 if(current===target)return;
 if(current!==shown)throw Error('다른 기기나 화면에서 루틴이 바뀌었어요. 화면을 다시 확인해주세요.');
 routineAction(d,date,id,action,null,time);
}
export function draftContext(control){return {entry:control?.getAttribute?.('data-entry')??'',existed:control?.getAttribute?.('data-existed')==='1'}}
export function controlFromMarkup(html){const attrs={};for(const match of html.matchAll(/\s([:\w-]+)="([^"]*)"/g))attrs[match[1]]=match[2].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');return {attrs,getAttribute(name){return attrs[name]??null},closest(){return null}}}
