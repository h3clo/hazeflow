import {isDate,isTime} from './domain.js';
import {validPhotoRefs} from './photos.js';
import {validWorkoutRests} from './workout-rests.js';
const kinds=['일상','식사','운동','업무','휴식','감정','공부'];
export function restoreCaptureDrafts(raw){let source;try{source=JSON.parse(raw||'{}')}catch{return {}}if(!source||typeof source!=='object'||Array.isArray(source))return {};const drafts={};for(const [day,d]of Object.entries(source)){if(!isDate(day)||!d||typeof d!=='object'||Array.isArray(d))continue;if(!validPhotoRefs(d.photos)||typeof(d.text??'')!=='string'||(d.text||'').length>5000)continue;const plan=typeof d.workoutPlan==='string'&&d.workoutPlan.length<=5000?d.workoutPlan:'';
 const rests=validWorkoutRests(d.workoutRests)?d.workoutRests:undefined;
 const endDate=isDate(d.endDate)?d.endDate:'',endTime=isTime(d.endTime)?d.endTime:'';
 drafts[day]={text:d.text||'',kind:kinds.includes(d.kind)?d.kind:'일상',mode:d.mode==='memo'?'memo':'activity',time:isTime(d.time)?d.time:'',manual:!!d.manual&&isTime(d.time),manualKind:!!d.manualKind,photos:d.photos||[],...(plan?{workoutPlan:plan}:{}),...(rests?.length?{workoutRests:rests}:{}),...(endDate?{endDate}:{}),...(endTime?{endTime}:{}),...Object.fromEntries(['mealAmount','mealMerchant','mealPayment','mealCategory','mealkcal','mealprotein','mealcarbs','mealfat'].map(k=>[k,String(d[k]??'').slice(0,200)]))}}return drafts}
export function serializeCaptureDrafts(drafts){return JSON.stringify(Object.fromEntries(Object.entries(drafts).filter(([,d])=>d.text?.trim()||d.photos?.length||d.mealAmount||d.workoutPlan||d.workoutRests?.length||['mealkcal','mealprotein','mealcarbs','mealfat'].some(k=>d[k]!==undefined&&d[k]!=='')).map(([day,d])=>{const row={...d};delete row.workoutSetDone;return [day,row]})))}
