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
 const eventPct=events?Math.round((eventDoneN/events)*100):0;
 const routinePct=steps?Math.round((checked/steps)*100):0;
 const overall=dayGoalProgress({eventDone:eventDoneN,eventTotal:events,routineDone:checked,routineTotal:steps});
 const bar=(pct,tone)=>`<span class="life-progress-track" aria-hidden="true"><span class="life-progress-fill life-tone-${tone}" style="width:${pct}%"></span></span>`;
 return `<section class="life-progress-panel" aria-label="오늘 진행 현황">
  <div class="life-progress-overall">
   <div class="life-progress-ring" style="--life-pct:${overall.pct}" aria-hidden="true"><span>${overall.pct}%</span></div>
   <div>
    <strong>오늘 진행</strong>
    <p>목표가 있는 일정·루틴 기준 ${overall.goalDone} / ${overall.goalTotal||0}</p>
   </div>
  </div>
  <div class="life-progress-metrics">
   <div class="life-metric">
    <div class="life-metric-head"><span>일정</span><b>${eventDoneN} / ${events}</b></div>
    ${events?bar(eventPct,'mint'):'<p class="life-metric-empty">오늘 일정 없음</p>'}
   </div>
   <div class="life-metric">
    <div class="life-metric-head"><span>루틴</span><b>${checked} / ${steps}</b></div>
    ${steps?bar(routinePct,'sky'):'<p class="life-metric-empty">오늘 루틴 단계 없음</p>'}
   </div>
   <div class="life-metric life-metric-count">
    <div class="life-metric-head"><span>기록</span><b>${Math.max(0,Number(recordCount)||0)}건</b></div>
    <p class="life-metric-note">목표 없는 건수</p>
   </div>
   <div class="life-metric life-metric-count">
    <div class="life-metric-head"><span>할 일</span><b>남은 ${Math.max(0,Number(taskDue)||0)}</b></div>
    <p class="life-metric-note">미완료 개수</p>
   </div>
  </div>
 </section>`;
}
