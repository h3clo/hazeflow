/** Inter-set rest intervals measured from 세트 완료 → 다음 세트 시작. No manual seconds field. */

export function normalizeWorkoutRest(entry,now=Date.now()){
 if(!entry||typeof entry!=='object'||Array.isArray(entry))return null;
 const itemIndex=Number(entry.itemIndex);
 const seconds=Math.floor(Number(entry.seconds));
 const endedAt=Number(entry.endedAt)||now;
 if(!Number.isInteger(itemIndex)||itemIndex<0||itemIndex>200)return null;
 if(!Number.isFinite(seconds)||seconds<1||seconds>86400)return null;
 if(!Number.isFinite(endedAt)||endedAt<=0)return null;
 const row={itemIndex,seconds,endedAt};
 if(entry.setIndex!==undefined&&entry.setIndex!==null&&entry.setIndex!==''){
  const setIndex=Number(entry.setIndex);
  if(!Number.isInteger(setIndex)||setIndex<0||setIndex>200)return null;
  row.setIndex=setIndex;
 }
 return row;
}

export function validWorkoutRests(list){
 if(!Array.isArray(list)||list.length>200)return false;
 return list.every(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row))return false;
  return !!normalizeWorkoutRest(row,row.endedAt);
 });
}

export function appendWorkoutRest(list,entry,now=Date.now()){
 const row=normalizeWorkoutRest(entry,now);
 if(!row)throw Error('휴식 시간을 확인해주세요.');
 const next=[...(Array.isArray(list)?list:[]),row];
 if(next.length>200)throw Error('휴식 기록이 너무 많아요.');
 return next;
}

export function averageRestSeconds(list){
 const rows=(list||[]).map(row=>normalizeWorkoutRest(row,row?.endedAt)).filter(Boolean);
 if(!rows.length)return null;
 return Math.round(rows.reduce((n,row)=>n+row.seconds,0)/rows.length);
}

export function mergeWorkoutRests(a,b){
 const next=[...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])];
 if(!validWorkoutRests(next)&&next.length){
  const cleaned=next.map(row=>normalizeWorkoutRest(row,row?.endedAt)).filter(Boolean);
  if(cleaned.length>200)return cleaned.slice(-200);
  return cleaned;
 }
 return next.length>200?next.slice(-200):next;
}
