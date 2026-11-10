import {parseWorkout,workoutSession} from './workout.js';

function sameSet(a,b){return a.kg===b.kg&&a.reps===b.reps}
function formatNumber(n){return Number.isInteger(n)?String(n):String(n)}

export function expandStrengthSets(row){
 if(!row||row.type!=='strength')return [];
 const count=Math.max(1,Number(row.sets)||1);
 return Array.from({length:count},()=>({kg:row.kg,reps:row.reps}));
}

/** Collapse set list to one or more grammar lines without inventing values. */
export function formatStrengthSets(name,sets){
 const list=(sets||[]).filter(s=>Number.isFinite(s.kg)&&Number.isFinite(s.reps)&&s.reps>0&&Number.isInteger(s.reps));
 if(!list.length)return '';
 const lines=[];
 let i=0;
 while(i<list.length){
  let j=i+1;
  while(j<list.length&&sameSet(list[i],list[j]))j++;
  const count=j-i;
  lines.push(`${name} ${formatNumber(list[i].kg)} ${list[i].reps} ${count}`);
  i=j;
 }
 return lines.join('\n');
}

export function formatExerciseItem(item){
 if(!item)return '';
 if(item.kind==='memo')return item.raw||'';
 if(item.kind==='cardio')return `${item.name} ${formatNumber(item.speed)} ${formatNumber(item.minutes)}`;
 if(item.kind==='incline')return `${item.name} ${formatNumber(item.angle)} ${formatNumber(item.speed)} ${formatNumber(item.minutes)}`;
 if(item.kind==='strength')return formatStrengthSets(item.name,item.sets);
 return item.raw||'';}

export function serializeWorkoutItems(items){
 return (items||[]).map(formatExerciseItem).filter(Boolean).join('\n');
}

/**
 * Build editable items from workout text.
 * Consecutive strength rows with the same key are one exercise with per-set values.
 */
export function workoutItems(text){
 const rows=parseWorkout(text);
 const items=[];
 for(let i=0;i<rows.length;i++){
  const row=rows[i];
  if(!row.type){items.push({kind:'memo',raw:row.raw});continue}
  if(row.type==='cardio'){items.push({kind:'cardio',name:row.name,key:row.key,speed:row.speed,minutes:row.minutes,raw:row.raw});continue}
  if(row.type==='incline'){items.push({kind:'incline',name:row.name,key:row.key,angle:row.angle,speed:row.speed,minutes:row.minutes,raw:row.raw});continue}
  if(row.type==='strength'){
   const sets=expandStrengthSets(row);
   let j=i+1;
   while(j<rows.length&&rows[j].type==='strength'&&rows[j].key===row.key){
    sets.push(...expandStrengthSets(rows[j]));
    j++;
   }
   items.push({
    kind:'strength',
    name:row.name,
    key:row.key,
    sets,
    goalSets:sets.length,
    goalKg:sets[0]?.kg,
    goalReps:sets[0]?.reps
   });
   i=j-1;
  }
 }
 return items;
}

export function updateStrengthSet(items,itemIndex,setIndex,patch={}){
 const next=structuredClone(items||[]);
 const item=next[itemIndex];
 if(!item||item.kind!=='strength')throw Error('수정할 근력 운동을 찾지 못했어요.');
 const set=item.sets[setIndex];
 if(!set)throw Error('수정할 세트를 찾지 못했어요.');
 if(patch.kg!==undefined){
  const kg=Number(patch.kg);
  if(!Number.isFinite(kg)||kg<0)throw Error('중량은 0 이상의 숫자로 적어주세요.');
  set.kg=kg;
 }
 if(patch.reps!==undefined){
  const reps=Number(patch.reps);
  if(!Number.isInteger(reps)||reps<1)throw Error('횟수는 1 이상의 정수로 적어주세요.');
  set.reps=reps;
 }
 if(patch.done!==undefined)set.done=!!patch.done;
 return next;
}

export function addStrengthSet(items,itemIndex,{kg,reps}={}){
 const next=structuredClone(items||[]);
 const item=next[itemIndex];
 if(!item||item.kind!=='strength')throw Error('세트를 추가할 근력 운동을 찾지 못했어요.');
 const last=item.sets.at(-1)||{kg:item.goalKg??0,reps:item.goalReps||1};
 const nextKg=kg===undefined?last.kg:Number(kg);
 const nextReps=reps===undefined?last.reps:Number(reps);
 if(!Number.isFinite(nextKg)||nextKg<0)throw Error('중량은 0 이상의 숫자로 적어주세요.');
 if(!Number.isInteger(nextReps)||nextReps<1)throw Error('횟수는 1 이상의 정수로 적어주세요.');
 item.sets.push({kg:nextKg,reps:nextReps});
 return next;
}

export function removeStrengthSet(items,itemIndex,setIndex){
 const next=structuredClone(items||[]);
 const item=next[itemIndex];
 if(!item||item.kind!=='strength')throw Error('세트를 지울 근력 운동을 찾지 못했어요.');
 if(item.sets.length<=1)throw Error('마지막 세트는 운동을 삭제해서 비워주세요.');
 if(!item.sets[setIndex])throw Error('지울 세트를 찾지 못했어요.');
 item.sets.splice(setIndex,1);
 return next;
}

export function appendWorkoutLine(text,line){
 const next=String(line||'').trim();
 if(!next)throw Error('추가할 운동 한 줄을 적어주세요.');
 const parsed=parseWorkout(next).filter(r=>r.type);
 if(!parsed.length)throw Error('운동명과 숫자 형식(예: 레그프레스 25 10 3)으로 적어주세요.');
 const joined=[String(text||'').trim(),next].filter(Boolean).join('\n');
 if(joined.length>5000)throw Error('기록할 수 있는 길이를 넘었어요.');
 return joined;
}

export function applyPlanGoals(items,planText){
 if(!planText)return items;
 const planItems=workoutItems(planText).filter(i=>i.kind==='strength');
 const byKey=new Map();
 for(const item of planItems)if(!byKey.has(item.key))byKey.set(item.key,item);
 return (items||[]).map(item=>{
  if(item.kind!=='strength')return item;
  const plan=byKey.get(item.key);
  if(!plan)return item;
  return {...item,goalSets:plan.sets.length,goalKg:plan.sets[0]?.kg,goalReps:plan.sets[0]?.reps,planLabel:formatStrengthSets(plan.name,plan.sets)};
 });
}

export function snapshotWorkoutPlan(existingPlan,text){
 const plan=String(existingPlan||'').trim();
 if(plan)return plan;
 const body=String(text||'').trim();
 return workoutSession(body).exercises.length?body:'';
}

/** First unfinished set in one strength item. Used by the same-spot rest → complete button. */
export function nextIncompleteSetIndex(items,doneMap={},itemIndex=0){
 const item=(items||[])[itemIndex];
 if(!item?.sets?.length)return null;
 for(let setIndex=0;setIndex<item.sets.length;setIndex++){
  if(!doneMap[`${itemIndex}:${setIndex}`])return setIndex;
 }
 return null;
}

/** True when every set row for a strength item is marked done in the UI map. */
export function strengthItemComplete(item,itemIndex,doneMap={}){
 return item?.kind==='strength'&&Array.isArray(item.sets)&&item.sets.length>0&&item.sets.every((_,setIndex)=>!!doneMap[`${itemIndex}:${setIndex}`]);
}

/** After marking a set done, keep inter-set rest only while this item still has unfinished sets. */
export function shouldContinueRestAfterSet(items,doneMap={},itemIndex=0){
 return nextIncompleteSetIndex(items,doneMap,itemIndex)!=null;
}

/** Last finished strength item index, or -1. Used to park append/feeling cues near that card. */
export function lastCompletedStrengthIndex(items,doneMap={}){
 let last=-1;
 (items||[]).forEach((item,index)=>{if(strengthItemComplete(item,index,doneMap))last=index});
 return last;
}
