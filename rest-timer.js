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

export function installRestTimer({notify,storage}={}){
 const key='hazeflow-workout-rest-v1';
 let mode='idle',deadline=0,startedAt=0,targetSeconds=0,timer=null,lastSeconds=-1,anchor=null;
 try{
  storage??=globalThis.sessionStorage;
  const raw=storage.getItem(key);
  if(raw){
   const saved=JSON.parse(raw);
   anchor=normalizeRestAnchor(saved?.anchor);
   if(saved?.mode==='countdown'&&Number(saved.deadline)>Date.now()){
    mode='countdown';deadline=Number(saved.deadline);targetSeconds=Number(saved.targetSeconds)||0;startedAt=Number(saved.startedAt)||deadline-(targetSeconds||0)*1000;
   }else if(saved?.mode==='elapsed'&&Number(saved.startedAt)>0){
    mode='elapsed';startedAt=Number(saved.startedAt);
   }else anchor=null;
  }
 }catch{storage=null}

 const widget=document.createElement('section');
 widget.className='workout-rest-widget';
 widget.hidden=true;
 widget.setAttribute('aria-label','운동 휴식');
 widget.innerHTML='<div class="workout-rest-status"><small>휴식</small><b class="rest-title">휴식 중</b><strong class="rest-countdown" aria-live="polite"></strong></div><div class="workout-rest-actions"><button type="button" class="small-button primary" data-rest-action="start-next">다음 세트 시작</button><button type="button" class="small-button" data-rest-action="extend" hidden>+30초</button><details class="workout-rest-target"><summary>목표 휴식</summary><div class="workout-rest-controls">'+[60,90,120].map(n=>`<button type="button" class="small-button" data-rest-action="target" data-seconds="${n}">${n}초</button>`).join('')+'</div><p class="hint">끝나도 다음 세트는 자동으로 시작되지 않아요.</p></details><button type="button" data-rest-action="close" aria-label="휴식 닫기">✕</button></div>';
 document.body.append(widget);

 const save=()=>{
  try{
   if(mode==='countdown'&&deadline)storage?.setItem(key,JSON.stringify({mode,deadline,startedAt,targetSeconds,anchor}));
   else if(mode==='elapsed'&&startedAt)storage?.setItem(key,JSON.stringify({mode,startedAt,anchor}));
   else storage?.removeItem(key);
  }catch{}
 };

 function stop(){
  mode='idle';deadline=0;startedAt=0;targetSeconds=0;anchor=null;clearInterval(timer);timer=null;lastSeconds=-1;widget.hidden=true;widget.classList.remove('is-inline');save();
  if(widget.parentElement!==document.body)document.body.append(widget);
 }

 function paint(seconds,title,showExtend){
  widget.querySelector('.rest-title').textContent=title;
  widget.querySelector('.rest-countdown').textContent=formatRestClock(seconds);
  widget.querySelector('[data-rest-action=extend]').hidden=!showExtend;
  widget.hidden=false;
  attach();
 }

 function tick(){
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

 /** Optional target countdown. Does not change set completion state. */
 function start(seconds,nextAnchor){
  if(!Number.isFinite(seconds)||seconds<1||seconds>3600)return;
  if(nextAnchor)setAnchor(nextAnchor);
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
  if(action==='close'||action==='start-next'){
   const ending=action==='start-next';
   stop();
   if(ending)notify?.('휴식 측정을 끝냈어요.');
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
 return {start,startElapsed,stop,attach,matches,get mode(){return mode},get startedAt(){return startedAt},get anchor(){return anchor}};
}
