/** Today UI skin preference (classic | life). Not part of backup schema. */

export function readUiDesign(raw){
 return raw==='life'?'life':'classic';
}

export function dayGoalProgress({eventDone=0,eventTotal=0,routineDone=0,routineTotal=0}={}){
 const goalTotal=Math.max(0,Number(eventTotal)||0)+Math.max(0,Number(routineTotal)||0);
 const goalDone=Math.max(0,Number(eventDone)||0)+Math.max(0,Number(routineDone)||0);
 const pct=goalTotal?Math.round((goalDone/goalTotal)*100):0;
 return {goalDone,goalTotal,pct:Math.min(100,Math.max(0,pct))};
}

const metricIcon={
 schedule:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4M16 3v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
 routine:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h7l3 5-3 5H7l3-5Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 19c2.5 0 4-.8 5.5-2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
 record:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15 3v4h4M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
 tasks:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="m4 7 1.4 1.4L8 5.8M4 12l1.4 1.4L8 10.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

export function dayProgressPanelHtml({
 esc=v=>String(v??''),
 eventDone=0,
 eventTotal=0,
 routineDone=0,
 routineTotal=0,
 recordCount=0,
 taskDue=0
}={}){
 const events=Math.max(0,Number(eventTotal)||0);
 const eventDoneN=Math.min(events,Math.max(0,Number(eventDone)||0));
 const steps=Math.max(0,Number(routineTotal)||0);
 const checked=Math.min(steps,Math.max(0,Number(routineDone)||0));
 const records=Math.max(0,Number(recordCount)||0);
 const due=Math.max(0,Number(taskDue)||0);
 const eventPct=events?Math.round((eventDoneN/events)*100):0;
 const routinePct=steps?Math.round((checked/steps)*100):0;
 const overall=dayGoalProgress({eventDone:eventDoneN,eventTotal:events,routineDone:checked,routineTotal:steps});
 const bar=(pct,tone,enabled)=>enabled
  ?`<span class="life-metric-bar" aria-hidden="true"><span class="life-metric-bar-fill life-tone-${tone}" style="width:${pct}%"></span></span>`
  :`<span class="life-metric-bar life-metric-bar-empty" aria-hidden="true"></span>`;
 const row=(tone,icon,label,value,barHtml,done)=>`<div class="life-metric-row ${done?'is-complete':''}">
   <span class="life-metric-icon life-tone-${tone}">${icon}</span>
   <div class="life-metric-copy"><span class="life-metric-label">${esc(label)}</span>${barHtml}</div>
   <b class="life-metric-value">${value}</b>
  </div>`;
 return `<section class="life-progress-panel" aria-label="오늘 진행 현황">
  <div class="life-progress-overall">
   <div class="life-progress-ring" style="--life-pct:${overall.pct}" aria-hidden="true">
    <strong>${overall.goalDone} / ${overall.goalTotal||0}</strong>
   </div>
   <div class="life-progress-overall-copy">
    <strong>오늘의 진행</strong>
    <p>일정·루틴 목표 기준</p>
   </div>
  </div>
  <div class="life-progress-metrics" role="list">
   ${row('mint',metricIcon.schedule,'일정',`${eventDoneN} / ${events}`,bar(eventPct,'mint',!!events),events>0&&eventDoneN>=events)}
   ${row('sky',metricIcon.routine,'루틴',`${checked} / ${steps}`,bar(routinePct,'sky',!!steps),steps>0&&checked>=steps)}
   ${row('lemon',metricIcon.record,'기록',`${records}건`,'<span class="life-metric-note">목표 없는 건수</span>',false)}
   ${row('mint',metricIcon.tasks,'할 일',`남은 ${due}`,'<span class="life-metric-note">미완료 개수</span>',false)}
  </div>
 </section>`;
}
