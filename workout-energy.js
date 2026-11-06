// MET references: 2024 Adult Compendium, Walking and Conditioning Exercise.
// https://pacompendium.com/walking/ https://pacompendium.com/conditioning-exercise/
export function cardioMET(row){
 if(row.key==='천계')return {low:9.3,high:9.3,note:'천계 일반 운동 기준'};
 if(row.type==='incline'){if(row.angle===0)return cardioMET({...row,type:'cardio',key:'러닝머신'});return row.angle>=5&&row.angle<=20&&row.speed>=2.5&&row.speed<=5.5?{low:5,high:8.8,note:'마이마운틴 경사 5~20% · 속도 2.5~5.5km/h 기준 · 5~8.8 MET 범위'}:null;}
 if(row.key!=='러닝머신'||row.speed<=0||row.speed>8.9)return null;
 const table=[[3.2,2.3],[4,3],[4.8,3.5],[5.6,3.8],[6.4,4.8],[7.2,5.8],[8,6.8],[9,8.3]];
 const met=table.find(([limit])=>row.speed<limit)?.[1];return met?{low:met,high:met,note:'러닝머신 km/h · 경사 0% 기준'}:null;
}
export function mixedWorkoutEnergy(session,weight,elapsed){
 const cardio=session.exercises.filter(r=>r.type!=='strength'),known=cardio.map(row=>({row,met:cardioMET(row)})).filter(x=>x.met),minutes=known.reduce((n,{row})=>n+row.minutes,0);
 if(!known.length)return {reason:'이 유산소의 속도·경사 설정에 맞는 계산 기준을 준비 중이에요.'};
 if(minutes>240)return {reason:'입력한 유산소 시간을 1~240분 범위에서 확인해주세요.',missing:'time'};
 const hasStrength=session.exercises.some(r=>r.type==='strength'),hasUnknown=known.length!==cardio.length||session.exercises.some(r=>r.type==='strength'&&!session.knownStrengthKeys?.has(r.key));
 if(elapsed!==null&&elapsed<minutes)return {reason:'입력한 유산소 시간이 전체 운동 시간보다 길어요. 시작·종료 시간과 종목별 시간을 확인해주세요.',missing:'time'};
 let low=known.reduce((n,{row,met})=>n+met.low*row.minutes,0),high=known.reduce((n,{row,met})=>n+met.high*row.minutes,0),counted=minutes,partial=hasStrength||hasUnknown,note=[...new Set(known.map(x=>x.met.note))].join(' · ');
 if(hasStrength&&elapsed!==null&&!hasUnknown){const rest=elapsed-minutes;const hasOther=session.rows.some(r=>!r.type);low+=rest*(hasOther?1.3:3.5);high+=rest*6;counted=elapsed;partial=false;note+=` · 유산소 ${minutes}분 + 나머지 ${rest}분은 ${hasOther?'근력·휴식·기타 활동':'근력·휴식'} 범위로 계산`}
 if(partial)note+=' · 시간과 기준이 확인된 유산소만 합산';
 return {low:Math.round(low*weight/60),high:Math.round(high*weight/60),minutes:counted,partial,note};
}
