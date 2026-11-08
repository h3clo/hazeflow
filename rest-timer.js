export const remainingSeconds=(deadline,now=Date.now())=>Number.isFinite(deadline)&&Number.isFinite(now)?Math.max(0,Math.ceil((deadline-now)/1000)):0;
export const elapsedSeconds=(startedAt,now=Date.now())=>Number.isFinite(startedAt)&&Number.isFinite(now)?Math.max(0,Math.floor((now-startedAt)/1000)):0;
export function formatRestClock(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
export function normalizeRestAnchor(anchor){
 if(!anchor||!Number.isInteger(Number(anchor.itemIndex))||Number(anchor.itemIndex)<0)return null;
 return {source:anchor.source==='log'?'log':'capture',logId:String(anchor.logId||''),itemIndex:Number(anchor.itemIndex)};
}
export function sameRestAnchor(a,b){
 const left=normalizeRestAnchor(a),right=normalizeRestAnchor(b);
 return !!(left&&right&&left.source===right.source&&left.logId===right.logId&&left.itemIndex===right.itemIndex);
}
export function restPrimaryControl(mode){
 if(mode==='ready')return {action:'complete-set',label:'세트 완료'};
 return {action:'start-next',label:'다음 세트 시작'};
}
export function restModeAfterStartNext(hasNext){return hasNext?'ready':'idle'}
/** Keep rest only while its log activity is still ongoing, or the capture draft still hosts that set. */
export function shouldKeepRestTimer(anchor,intervals,captureLive=true){
 const current=normalizeRestAnchor(anchor);
 if(!current)return false;
 if(current.source!=='log')return captureLive!==false;
 return !!intervals?.get?.(current.logId)?.ongoing;
}
/** After the capture draft is saved, move an in-progress rest onto the new ongoing log or stop it. */
export function captureRestAfterSave({anchor,kind,mode,ended,itemKind}={}){
 const current=normalizeRestAnchor(anchor);
 if(!current||current.source==='log')return 'keep';
 if(kind==='운동'&&mode!=='memo'&&!ended&&itemKind==='strength')return 'retarget';
 return 'stop';
}
/** Restore a same-tab rest. Expired countdowns and unknown modes do not resume. */
export function restoreRestSession(saved,now=Date.now()){
 const anchor=normalizeRestAnchor(saved?.anchor);
 if(!anchor)return null;
 if(saved?.mode==='countdown'&&Number(saved.deadline)>now){
  const targetSeconds=Number(saved.targetSeconds)||0;
  return {mode:'countdown',deadline:Number(saved.deadline),targetSeconds,startedAt:Number(saved.startedAt)||Number(saved.deadline)-targetSeconds*1000,anchor,readyRestSeconds:0};
 }
 if(saved?.mode==='elapsed'&&Number(saved.startedAt)>0)return {mode:'elapsed',startedAt:Number(saved.startedAt),deadline:0,targetSeconds:0,anchor,readyRestSeconds:0};
 const seconds=Number(saved?.readyRestSeconds);
 if(saved?.mode==='ready'&&Number.isFinite(seconds)&&seconds>=0&&seconds<=86400)return {mode:'ready',startedAt:0,deadline:0,targetSeconds:0,anchor,readyRestSeconds:Math.floor(seconds)};
 return null;
}
/** Set-done marks are `logId:item:set`. Only ongoing logs stay. Not part of backup or sync. */
export function readSetDoneMap(raw){
 const out={};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 for(const [mark,on] of Object.entries(raw)){
  if(!on)continue;
  const parts=String(mark).split(':');
  if(parts.length<3)continue;
  const set=parts.pop(),item=parts.pop(),id=parts.join(':');
  if(id&&/^\d+$/.test(item)&&/^\d+$/.test(set))out[mark]=true;
 }
 return out;
}
export function pruneSetDoneMap(map,ongoingIds){
 const keep=new Set(ongoingIds||[]);
 return Object.fromEntries(Object.entries(readSetDoneMap(map)).filter(([mark])=>keep.has(mark.split(':').slice(0,-2).join(':'))));
}
/** Drop a removed set and close the gap so a later set does not inherit its completion. */
export function shiftSetDoneMarks(map,itemIndex,removedSetIndex,logId=''){
 if(!map||typeof map!=='object'||Array.isArray(map))return {};
 if(!Number.isInteger(itemIndex)||itemIndex<0||!Number.isInteger(removedSetIndex)||removedSetIndex<0)return {...map};
 const next={};
 for(const [mark,on] of Object.entries(map)){
  if(!on)continue;
  const parts=String(mark).split(':');
  if(parts.length<2)continue;
  const set=Number(parts.pop()),item=Number(parts.pop()),id=parts.join(':');
  if(!Number.isInteger(set)||!Number.isInteger(item))continue;
  if(id!==logId||item!==itemIndex){next[mark]=true;continue}
  if(set===removedSetIndex)continue;
  const shifted=set>removedSetIndex?set-1:set;
  next[id?`${id}:${item}:${shifted}`:`${item}:${shifted}`]=true;
 }
 return next;
}

export function installRestTimer({notify,storage,hasNextIncompleteSet,onCompleteNextSet}={}){
 const key='hazeflow-workout-rest-v1';
 let mode='idle',deadline=0,startedAt=0,targetSeconds=0,timer=null,lastSeconds=-1,anchor=null,readyRestSeconds=0;
 try{
  storage??=globalThis.sessionStorage;
  const raw=storage.getItem(key);
  if(raw){
   const restored=restoreRestSession(JSON.parse(raw));
   if(restored){mode=restored.mode;deadline=restored.deadline;startedAt=restored.startedAt;targetSeconds=restored.targetSeconds;anchor=restored.anchor;readyRestSeconds=restored.readyRestSeconds}
  }
 }catch{storage=null}

 const widget=document.createElement('section');
 widget.className='workout-rest-widget';
 widget.hidden=true;
 widget.setAttribute('aria-label','운동 휴식');
 widget.innerHTML='<div class="workout-rest-status"><small>휴식</small><b class="rest-title">휴식 중</b><strong class="rest-countdown" aria-live="polite"></strong></div><div class="workout-rest-actions"><button type="button" class="small-button primary" data-rest-primary data-rest-action="start-next">다음 세트 시작</button><button type="button" class="small-button" data-rest-action="extend" hidden>+30초</button><details class="workout-rest-target"><summary>목표 휴식</summary><div class="workout-rest-controls">'+[60,90,120].map(n=>`<button type="button" class="small-button" data-rest-action="target" data-seconds="${n}">${n}초</button>`).join('')+'</div><p class="hint">끝나도 다음 세트는 자동으로 시작되지 않아요.</p></details><button type="button" data-rest-action="close" aria-label="휴식 닫기">✕</button></div>';
 document.body.append(widget);

 const save=()=>{
  try{
   if(mode==='countdown'&&deadline)storage?.setItem(key,JSON.stringify({mode,deadline,startedAt,targetSeconds,anchor}));
   else if(mode==='elapsed'&&startedAt)storage?.setItem(key,JSON.stringify({mode,startedAt,anchor}));
   else if(mode==='ready'&&anchor)storage?.setItem(key,JSON.stringify({mode,readyRestSeconds,anchor}));
   else storage?.removeItem(key);
  }catch{}
 };

 const primaryButton=()=>widget.querySelector('[data-rest-primary]');

 function setPrimary(action,label){
  const button=primaryButton();
  if(!button)return;
  const next=action&&label?{action,label}:restPrimaryControl(mode);
  button.dataset.restAction=next.action;
  button.textContent=next.label;
 }

 function stop(){
  mode='idle';deadline=0;startedAt=0;targetSeconds=0;readyRestSeconds=0;anchor=null;clearInterval(timer);timer=null;lastSeconds=-1;widget.hidden=true;widget.classList.remove('is-inline','is-ready');save();
  setPrimary('start-next','다음 세트 시작');
  const target=widget.querySelector('.workout-rest-target');
  if(target)target.hidden=false;
  if(widget.parentElement!==document.body)document.body.append(widget);
 }

 function paint(seconds,title,showExtend,{ready=false}={}){
  widget.querySelector('.rest-title').textContent=title;
  widget.querySelector('.rest-countdown').textContent=formatRestClock(seconds);
  widget.querySelector('[data-rest-action=extend]').hidden=!showExtend;
  const target=widget.querySelector('.workout-rest-target');
  if(target)target.hidden=ready;
  widget.classList.toggle('is-ready',ready);
  setPrimary();
  widget.hidden=false;
  attach();
 }

 function tick(){
  if(mode==='ready'){
   paint(readyRestSeconds,'다음 세트',false,{ready:true});
   return;
  }
  if(mode==='countdown'){
   const seconds=remainingSeconds(deadline);
   if(seconds!==lastSeconds){paint(seconds,'목표 휴식',true);lastSeconds=seconds}
   if(seconds===0){
    // Keep resting visible; never auto-complete or auto-start the next set.
    mode='elapsed';
    if(!Number.isFinite(startedAt)||startedAt<=0)startedAt=Date.now()-(targetSeconds||0)*1000;
    deadline=0;lastSeconds=-1;save();
    notify?.('목표 휴식이 끝났어요. 준비되면 다음 세트를 시작하세요.');
    tick();
   }
   return;
  }
  if(mode==='elapsed'){
   const seconds=elapsedSeconds(startedAt);
   if(seconds!==lastSeconds){paint(seconds,'휴식 중',false);lastSeconds=seconds}
  }
 }

 function arm(){clearInterval(timer);timer=setInterval(tick,1000);tick()}

 function setAnchor(next){anchor=normalizeRestAnchor(next)}
 function retarget(nextAnchor){
  const next=normalizeRestAnchor(nextAnchor);
  if(mode==='idle'||!next)return false;
  anchor=next;save();return true;
 }

 function currentRestSeconds(){
  if(mode==='elapsed')return elapsedSeconds(startedAt);
  if(mode==='countdown')return Math.max(0,(targetSeconds||0)-remainingSeconds(deadline));
  return readyRestSeconds;
 }

 function beginReady(){
  readyRestSeconds=currentRestSeconds();
  mode='ready';deadline=0;startedAt=0;targetSeconds=0;lastSeconds=-1;clearInterval(timer);timer=null;save();
  paint(readyRestSeconds,'다음 세트',false,{ready:true});
 }

 /** Optional target countdown. Does not change set completion state. */
 function start(seconds,nextAnchor){
  if(!Number.isFinite(seconds)||seconds<1||seconds>3600)return;
  if(nextAnchor)setAnchor(nextAnchor);
  readyRestSeconds=0;
  targetSeconds=Math.floor(seconds);
  mode='countdown';
  startedAt=Date.now();
  deadline=startedAt+targetSeconds*1000;
  lastSeconds=-1;save();arm();
 }

 /** Default free rest after set complete. */
 function startElapsed(at=Date.now(),nextAnchor){
  if(!Number.isFinite(at))return;
  if(nextAnchor)setAnchor(nextAnchor);
  readyRestSeconds=0;
  mode='elapsed';startedAt=at;deadline=0;targetSeconds=0;lastSeconds=-1;save();arm();
 }

 function attach(){
  if(mode==='idle'||!anchor){
   widget.classList.remove('is-inline');
   if(widget.parentElement!==document.body)document.body.append(widget);
   return;
  }
  const hosts=[...document.querySelectorAll('[data-rest-host]')];
  const host=hosts.find(el=>el.dataset.restSource===anchor.source&&el.dataset.restLog===anchor.logId&&Number(el.dataset.restItem)===anchor.itemIndex);
  if(host){
   widget.classList.add('is-inline');
   if(widget.parentElement!==host)host.append(widget);
   return;
  }
  widget.classList.remove('is-inline');
  if(widget.parentElement!==document.body)document.body.append(widget);
 }

 function matches(source,logId,itemIndex){
  return mode!=='idle'&&sameRestAnchor(anchor,{source,logId,itemIndex});
 }

 widget.addEventListener('click',e=>{
  const action=e.target.closest('[data-rest-action]')?.dataset.restAction;
  if(!action)return;
  if(action==='close'){
   stop();
   return;
  }
  if(action==='start-next'){
   if(mode!=='elapsed'&&mode!=='countdown')return;
   const current=normalizeRestAnchor(anchor);
   if(restModeAfterStartNext(!!(current&&hasNextIncompleteSet?.(current)))==='ready'){
    beginReady();
    notify?.('휴식을 끝냈어요. 같은 자리의 세트 완료를 누르세요.');
    return;
   }
   stop();
   notify?.('휴식 측정을 끝냈어요.');
   return;
  }
  if(action==='complete-set'){
   if(mode!=='ready')return;
   const current=normalizeRestAnchor(anchor);
   if(!current){stop();return}
   // Leave ready immediately so a double tap cannot complete two sets.
   mode='idle';clearInterval(timer);timer=null;lastSeconds=-1;setPrimary();
   Promise.resolve(onCompleteNextSet?.(current)).catch(error=>{
    stop();
    notify?.(error?.message||'세트를 완료하지 못했어요.');
   });
   return;
  }
  if(action==='extend'&&mode==='countdown'&&deadline){deadline+=30000;targetSeconds+=30;save();tick();return}
  if(action==='target'){
   const seconds=Number(e.target.closest('[data-rest-action=target]')?.dataset.seconds);
   start(seconds,anchor);
  }
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode!=='idle')tick()});
 if(mode!=='idle')arm();
 return {start,startElapsed,stop,attach,matches,beginReady,retarget,get mode(){return mode},get startedAt(){return startedAt},get anchor(){return anchor}};
}
