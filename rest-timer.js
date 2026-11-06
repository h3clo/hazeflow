export const remainingSeconds=(deadline,now=Date.now())=>Number.isFinite(deadline)&&Number.isFinite(now)?Math.max(0,Math.ceil((deadline-now)/1000)):0;
export function installRestTimer({notify,storage}={}){
 const key='hazeflow-workout-rest-v1';let deadline=0,timer=null,lastSeconds=-1;try{storage??=globalThis.sessionStorage;const value=Number(storage.getItem(key));if(value>Date.now())deadline=value}catch{storage=null}
 const widget=document.createElement('section');widget.className='workout-rest-widget';widget.hidden=true;widget.setAttribute('aria-label','운동 휴식 타이머');widget.innerHTML='<div><small>REST TIMER</small><b>세트 사이 휴식</b></div><strong class="rest-countdown" aria-label="남은 휴식 시간"></strong><button type="button" data-rest-action="extend">+30초</button><button type="button" data-rest-action="close" aria-label="휴식 타이머 닫기">✕</button>';document.body.append(widget);
 const save=()=>{try{deadline?storage?.setItem(key,String(deadline)):storage?.removeItem(key)}catch{}};
 function stop(){deadline=0;clearInterval(timer);timer=null;widget.hidden=true;save()}
 function tick(){const seconds=remainingSeconds(deadline);if(!deadline)return;if(seconds!==lastSeconds){widget.querySelector('.rest-countdown').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');lastSeconds=seconds}widget.hidden=false;if(seconds===0){stop();notify?.('휴식 시간이 끝났어요. 다음 세트를 준비하세요.')}}
 function start(seconds){if(!Number.isFinite(seconds)||seconds<1||seconds>3600)return;deadline=Date.now()+seconds*1000;lastSeconds=-1;save();clearInterval(timer);timer=setInterval(tick,1000);tick()}
 widget.addEventListener('click',e=>{const action=e.target.closest('[data-rest-action]')?.dataset.restAction;if(action==='close')stop();if(action==='extend'&&deadline){deadline+=30000;save();tick()}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});if(deadline){timer=setInterval(tick,1000);tick()}
 return {start,stop};
}
