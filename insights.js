import {validNutrition} from './nutrition.js';
import {todayKey,isDate,recordsForDate,routinesForDate} from './domain.js';

export function shiftDate(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return todayKey(d)}
export function monthBefore(date,months=1){const d=new Date(date+'T12:00:00'),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()-months);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return todayKey(d)}
export function weekStart(date){const d=new Date(date+'T12:00:00');return shiftDate(date,-((d.getDay()+6)%7))}
export const moodNames={great:'😊 좋았어',okay:'😌 평온해',tired:'😮‍💨 지쳤어',hard:'🌧 힘들었어'};
export function hasActual(d,date){const diary=d.diary[date]||{};return !!(recordsForDate(d,date).length||diary.note?.trim()||diary.entry?.trim()||diary.mood||diary.photos?.length||Object.values(d.life[date]||{}).some(x=>Array.isArray(x)?x.length>0:x!==''&&x!=null)||Object.keys(d.routineRuns[date]||{}).length||d.events.some(e=>e.date===date&&['doing','done','skipped'].includes(e.status))||d.tasks.some(t=>t.done&&t.completedOn===date))}
export function parseWorkout(log){
 if(log.kind!=='운동')return null;
 const m=String(log.text||'').trim().match(/^(?:운동\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?$/);if(!m)return null;
 const [,name,as,bs,cs]=m,a=+as,b=+bs,c=cs===undefined?null:+cs,normalized=name.replace(/\s/g,'');
 const key=normalized==='런닝머신'?'러닝머신':normalized==='천국의계단'?'천계':normalized;
 if(key==='마이마운틴')return c>0?{key,name,type:'mountain',angle:a,speed:b,minutes:c}:null;
 if(['러닝머신','천계'].includes(key))return c===null&&b>0?{key,name,type:'cardio',speed:a,minutes:b}:null;
 return c>0&&b>0&&Number.isInteger(b)&&Number.isInteger(c)?{key,name,type:'strength',kg:a,reps:b,sets:c,volume:a*b*c}:null;
}
export function dayStats(d,date){const logs=recordsForDate(d,date),actual=logs.filter(l=>!l.sourceId);return {date,hasActual:hasActual(d,date),logs,meals:actual.filter(l=>l.kind==='식사').length,workouts:actual.filter(l=>l.kind==='운동').length,activities:actual.length,events:d.events.filter(e=>e.date===date),routines:routinesForDate(d,date),diary:d.diary[date]||{},life:d.life[date]||{},workoutRows:actual.flatMap(l=>String(l.text||'').split(/\r?\n/).map(text=>({...parseWorkout({...l,text}),id:l.id}))).filter(w=>w.type)}}
export function compareWorkouts(d,left,right){const a=dayStats(d,left).workoutRows,b=dayStats(d,right).workoutRows,keys=[...new Set([...a,...b].map(w=>w.type+':'+w.key))];return keys.map(k=>{const left=a.filter(w=>w.type+':'+w.key===k),right=b.filter(w=>w.type+':'+w.key===k);return {name:(left[0]||right[0]).name,type:(left[0]||right[0]).type,left,right}})}
export function numericValue(value){if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null}
export function numericComparison(a,b){a=numericValue(a);b=numericValue(b);return a===null||b===null?null:Math.round((b-a)*100)/100}
export function weekSummary(d,anchor,today=todayKey()){
 const start=weekStart(anchor),dates=Array.from({length:7},(_,i)=>shiftDate(start,i)),elapsed=dates.filter(k=>k<=today),days=dates.map(k=>({...dayStats(d,k),future:k>today})),past=days.filter(x=>!x.future),prevDates=Array.from({length:elapsed.length},(_,i)=>shiftDate(start,-7+i));
 const events=past.flatMap(x=>x.events),routines=past.flatMap(x=>x.routines),moods={};for(const day of past){if(moodNames[day.diary.mood])moods[day.diary.mood]=(moods[day.diary.mood]||0)+1}
 const averages={};for(const key of ['sleep','energy','stress']){const values=past.map(x=>numericValue(x.life[key])).filter(x=>x!==null&&x>=1&&x<=5);averages[key]={value:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null,count:values.length}}
 const workoutRows=past.flatMap(x=>x.workoutRows),workoutTotals={sessions:past.reduce((n,x)=>n+x.workouts,0),exercises:workoutRows.length,sets:workoutRows.filter(r=>r.type==='strength').reduce((n,r)=>n+r.sets,0),minutes:workoutRows.filter(r=>r.type!=='strength').reduce((n,r)=>n+r.minutes,0)};
 const spending=dates=>d.logs.filter(l=>dates.includes(l.date)&&l.money?.type==='expense').reduce((n,l)=>n+l.money.amount,0),categories=new Map();for(const l of d.logs.filter(l=>elapsed.includes(l.date)&&l.money?.type==='expense')){const key=l.money.category||'미분류';categories.set(key,(categories.get(key)||0)+l.money.amount)}const money={expense:spending(elapsed),previousExpense:spending(prevDates),top:[...categories].sort((a,b)=>b[1]-a[1])[0]||null};
 return {money,workoutTotals,start,end:dates[6],days,elapsed:elapsed.length,recordedDays:past.filter(x=>x.hasActual).length,previousRecordedDays:prevDates.filter(k=>hasActual(d,k)).length,workoutDays:past.filter(x=>x.workouts>0).length,meals:past.reduce((n,x)=>n+x.meals,0),events:{total:events.length,done:events.filter(e=>e.status==='done').length,skipped:events.filter(e=>e.status==='skipped').length},routines:{total:routines.length,done:routines.filter(r=>r.run?.status==='done').length,skipped:routines.filter(r=>r.run?.status==='skipped').length},tasks:d.tasks.filter(t=>t.done&&elapsed.includes(t.completedOn)).length,moods,averages};
}
export function templateEntry(values,id){const kind=values.kind,title=values.title?.trim(),text=values.text?.trim();if(!['식사','운동'].includes(kind)||!title||title.length>100||!text||text.length>5000)throw Error('분류·이름·내용을 확인해주세요.');if(values.nutrition!==undefined&&(kind!=='식사'||!validNutrition(values.nutrition)))throw Error('식사 영양정보를 확인해주세요.');return {id,kind,title,text,...(values.nutrition?{nutrition:values.nutrition}:{})}}
