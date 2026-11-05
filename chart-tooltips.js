// One delegated tooltip survives view rerenders and supports mouse, touch and keyboard.
export function installChartTooltips(){
 const tip=document.createElement('div');tip.id='chart-value-tooltip';tip.className='chart-value-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);let active=null,oldDescription=null;
 function hide(){if(active){if(oldDescription===null)active.removeAttribute('aria-describedby');else active.setAttribute('aria-describedby',oldDescription)}active=null;tip.hidden=true}
 function show(target){if(active!==target){hide();active=target;oldDescription=target.getAttribute('aria-describedby');target.setAttribute('aria-describedby',[oldDescription,tip.id].filter(Boolean).join(' '))}tip.textContent=target.dataset.chartValue;tip.hidden=false;const r=target.getBoundingClientRect(),box=tip.getBoundingClientRect();const x=Math.max(8,Math.min(innerWidth-box.width-8,r.left+r.width/2-box.width/2)),above=r.top-box.height-10;tip.style.left=x+'px';tip.style.top=Math.max(8,Math.min(innerHeight-box.height-8,above>=8?above:r.bottom+10))+'px'}
 const target=e=>e.target.closest?.('[data-chart-value]');
 document.addEventListener('pointerover',e=>{if(e.pointerType!=='touch'&&target(e))show(target(e))});
 document.addEventListener('pointerout',e=>{if(e.pointerType!=='touch'&&active&&e.target.closest?.('[data-chart-value]')===active&&!active.contains(e.relatedTarget))hide()});
 document.addEventListener('focusin',e=>{if(target(e))show(target(e));else hide()});
 document.addEventListener('click',e=>{if(target(e))show(target(e));else hide()});
 document.addEventListener('focusout',e=>{if(target(e))hide()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
 new MutationObserver(()=>{if(active&&!active.isConnected)hide()}).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
}
