// Keep the original note; derive per-exercise rows without inventing missing values.
export function parseWorkout(text){
 return String(text||'').split(/\r?\n/).map(raw=>{const line=raw.trim(),m=line.match(/^(?:운동\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?$/);if(!m)return {raw:line};const [,name,a,b,c]=m,normalized=name.replace(/\s/g,''),key=normalized==='런닝머신'?'러닝머신':normalized==='천국의계단'?'천계':normalized;
 if(key==='마이마운틴'&&c&&+c>0)return {raw:line,name,key,type:'incline',angle:+a,speed:+b,minutes:+c,label:`각도 ${a} · 속도 ${b} · ${c}분`};
 if(['러닝머신','런닝머신','천계','천국의계단'].includes(key)&&!c&&+b>0)return {raw:line,name,key,type:'cardio',speed:+a,minutes:+b,label:`속도 ${a} · ${b}분`};
 if(c&&key!=='마이마운틴'&&!['러닝머신','런닝머신','천계','천국의계단'].includes(key)&&+b>0&&+c>0&&Number.isInteger(+b)&&Number.isInteger(+c))return {raw:line,name,key,type:'strength',kg:+a,reps:+b,sets:+c,label:`${a}kg × ${b}회 × ${c}세트`};
 return {raw:line};}).filter(r=>r.raw);
}
export function workoutSession(text){const rows=parseWorkout(text),exercises=rows.filter(r=>r.type);return {rows,exercises,sets:exercises.filter(r=>r.type==='strength').reduce((s,r)=>s+r.sets,0),cardioMinutes:exercises.filter(r=>r.type!=='strength').reduce((s,r)=>s+r.minutes,0)}}
export function previousExercise(logs,current,exercise){
 const before=current.date+(current.time||'99:99');return logs.filter(l=>l.id!==current.id&&l.kind==='운동'&&!l.sourceId&&l.date+(l.time||'99:99')<before).sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||''))).flatMap(l=>parseWorkout(l.text).filter(r=>r.key===exercise.key&&r.type===exercise.type).map(r=>({...r,date:l.date}))).at(0);
}
