export const remainingSeconds=(deadline,now=Date.now())=>Number.isFinite(deadline)&&Number.isFinite(now)?Math.max(0,Math.ceil((deadline-now)/1000)):0;
export const elapsedSeconds=(startedAt,now=Date.now())=>Number.isFinite(startedAt)&&Number.isFinite(now)?Math.max(0,Math.floor((now-startedAt)/1000)):0;
function formatClock(seconds){return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')}

export function installRestTimer({notify,storage}={}){
 const key='hazeflow-workout-rest-v1';
 let mode='idle',deadline=0,startedAt=0,timer=null,lastSeconds=-1;
 try{
  storage??=globalThis.sessionStorage;
  const raw=storage.getItem(key);
  if(raw){
   const saved=JSON.parse(raw);
   if(saved?.mode==='countdown'&&Number(saved.deadline)>Date.now()){mode='countdown';deadline=Number(saved.deadline)}
   else if(saved?.mode==='elapsed'&&Number(saved.startedAt)>0){mode='elapsed';startedAt=Number(saved.startedAt)}
  }
 }catch{storage=null}

 const widget=document.createElement('section');
 widget.className='workout-rest-widget';
 widget.hidden=true;
 widget.setAttribute('aria-label','운동 휴식 타이머');
 widget.innerHTML='<div><small>REST</small><b class="rest-title">세트 사이 휴식</b></div><strong class="rest-countdown" aria-live="polite"></strong><button type="button" data-rest-action="extend">+30초</button><button type="button" data-rest-action="close" aria-label="휴식 타이머 닫기">✕</button>';
 document.body.append(widget);

 const save=()=>{
  try{
   if(mode==='countdown'&&deadline)storage?.setItem(key,JSON.stringify({mode,deadline}));
   else if(mode==='elapsed'&&startedAt)storage?.setItem(key,JSON.stringify({mode,startedAt}));
   else storage?.removeItem(key);
  }catch{}
 };

 function stop(){
  mode='idle';deadline=0;startedAt=0;clearInterval(timer);timer=null;lastSeconds=-1;widget.hidden=true;save();
 }

 function paint(seconds,title,showExtend){
  widget.querySelector('.rest-title').textContent=title;
  widget.querySelector('.rest-countdown').textContent=formatClock(seconds);
  widget.querySelector('[data-rest-action=extend]').hidden=!showExtend;
  widget.hidden=false;
 }

 function tick(){
  if(mode==='countdown'){
   const seconds=remainingSeconds(deadline);
   if(seconds!==lastSeconds){paint(seconds,'세트 사이 휴식',true);lastSeconds=seconds}
   if(seconds===0){stop();notify?.('휴식 시간이 끝났어요. 다음 세트를 준비하세요.')}
   return;
  }
  if(mode==='elapsed'){
   const seconds=elapsedSeconds(startedAt);
   if(seconds!==lastSeconds){paint(seconds,'휴식 경과',false);lastSeconds=seconds}
  }
 }

 function arm(){clearInterval(timer);timer=setInterval(tick,1000);tick()}

 /** Legacy optional countdown (not used for set-complete flow). */
 function start(seconds){
  if(!Number.isFinite(seconds)||seconds<1||seconds>3600)return;
  mode='countdown';deadline=Date.now()+seconds*1000;startedAt=0;lastSeconds=-1;save();arm();
 }

 /** Set-complete rest: elapsed from startedAt until next set / stop. */
 function startElapsed(at=Date.now()){
  if(!Number.isFinite(at))return;
  mode='elapsed';startedAt=at;deadline=0;lastSeconds=-1;save();arm();
 }

 widget.addEventListener('click',e=>{
  const action=e.target.closest('[data-rest-action]')?.dataset.restAction;
  if(action==='close')stop();
  if(action==='extend'&&mode==='countdown'&&deadline){deadline+=30000;save();tick()}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode!=='idle')tick()});
 if(mode!=='idle')arm();
 return {start,startElapsed,stop,get mode(){return mode},get startedAt(){return startedAt}};
}
