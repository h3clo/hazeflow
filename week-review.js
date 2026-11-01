import {weekSummary,numericValue} from './insights.js';
export function weekTimeline(data,anchor,today){return weekSummary(data,anchor,today).days.map(day=>{
 const actual=day.logs.filter(l=>!l.sourceId),diary=day.diary;
 const sleep=numericValue(day.life.sleep),strength=day.workoutRows.filter(r=>r.type==='strength'),cardio=day.workoutRows.filter(r=>r.type!=='strength');
 const expenses=data.logs.filter(l=>l.date===day.date&&l.money?.type==='expense');
 return {date:day.date,future:day.future,activity:actual.length>0,diary:!!(diary.entry?.trim()||diary.note?.trim()||diary.mood),photos:!!(day.logs.some(l=>l.photos?.length)||diary.photos?.length||day.life.bodyPhotos?.length),
 sets:!day.future&&strength.length?strength.reduce((n,r)=>n+r.sets,0):null,
 cardio:!day.future&&cardio.length?cardio.reduce((n,r)=>n+r.minutes,0):null,
 sleep:!day.future&&sleep>=1&&sleep<=5?sleep:null,
 expense:!day.future&&expenses.length?expenses.reduce((n,l)=>n+l.money.amount,0):null};
 })}
export function weeklyCharts(days){const metrics=[['sets','근력 운동','세트',null],['cardio','유산소 운동','분',null],['sleep','수면 만족도','/5',5],['expense','기록된 지출','원',null]];return `<div class="weekly-metric-grid">${metrics.map(([key,title,unit,fixed])=>{const peak=fixed||Math.max(1,...days.map(d=>d[key]??0));return `<section class="weekly-metric"><h3>${title} <small>${unit}</small></h3><div class="weekly-metric-bars">${days.map((d,i)=>{const value=d[key],text=d.future?'예정':value===null?'기록 없음':value.toLocaleString('ko-KR')+unit;return `<button type="button" data-act="open-day" data-id="${d.date}" aria-label="${d.date} ${title} ${text}"><span class="metric-value">${d.future?'·':value===null?'—':value.toLocaleString('ko-KR')}</span><span class="metric-track ${value===null?'missing':''}">${value===null?'':`<i style="height:${Math.max(2,value/peak*100)}%"></i>`}</span><small>${['월','화','수','목','금','토','일'][i]}</small></button>`}).join('')}</div></section>`}).join('')}</div><p class="hint">— 기록 없음 · 미래 날짜는 집계하지 않아요. 수면은 시간 대신 직접 남긴 만족도(1~5)예요. 각 차트는 별도 눈금이며, 막대를 누르면 그날로 이동해요.</p>`}
