import {emptyState,validateBackup,isDate} from './domain.js';
import {ACTIVITY_UI_ID,mergePrimaryPreference} from './activity-primary.js';

const arrays=['events','tasks','routines','logs','exercises','routineTemplates','favorites','studySubjects'];
const maps=['checks','diary','life','weeklyReviews','preferences'];
const dateMaps=['diary','life','weeklyReviews'];
export function stable(value){if(value===undefined)return 'undefined';if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stable).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'}
const same=(a,b)=>stable(a)===stable(b);
export const itemKey=(...parts)=>JSON.stringify(parts);
export const activityUiItemKey=()=>itemKey('preferences',ACTIVITY_UI_ID);
function canonicalValue(key,value){if(value===undefined)return value;const copy=structuredClone(value);if(JSON.parse(key)[0]==='logs')for(const name of ['endDate','endTime'])if(copy[name]===null||copy[name]==='')delete copy[name];return copy}
export function flattenState(state){const entries={};for(const key of arrays)for(const row of state[key]||[])entries[itemKey(key,row.id)]=canonicalValue(itemKey(key,row.id),row);for(const key of maps)for(const [id,value]of Object.entries(state[key]||{}))entries[itemKey(key,id)]=structuredClone(value);for(const [date,runs]of Object.entries(state.routineRuns))for(const [id,value]of Object.entries(runs))entries[itemKey('routineRuns',date,id)]=structuredClone(value);return entries}
export function unflattenState(entries){const state=emptyState();for(const [key,value]of Object.entries(entries)){if(value===undefined)continue;const parts=JSON.parse(key),[collection,id,runId]=parts;if(typeof id!=='string'||['__proto__','constructor','prototype'].includes(id)||runId&&['__proto__','constructor','prototype'].includes(runId))throw Error('동기화 식별자가 올바르지 않아요.');if((dateMaps.includes(collection)||collection==='routineRuns')&&!isDate(id))throw Error('동기화 날짜가 올바르지 않아요.');if(arrays.includes(collection)&&parts.length===2&&id===value.id)state[collection].push(value);else if(maps.includes(collection)&&parts.length===2)state[collection][id]=value;else if(collection==='routineRuns'&&parts.length===3){state.routineRuns[id]??={};state.routineRuns[id][runId]=value}else throw Error('동기화 기록의 형식을 확인해주세요.')}return validateBackup(state)}
export function rowValue(row){return !row||row.deleted?undefined:canonicalValue(row.item_key,row.payload)}
export function validateRows(rows){const result={};for(const row of rows){if(!row||typeof row.item_key!=='string'||!Number.isSafeInteger(row.version)||row.version<1||typeof row.deleted!=='boolean'||typeof row.mutation_id!=='string')throw Error('서버 기록 형식이 올바르지 않아요.');result[row.item_key]=row}unflattenState(Object.fromEntries(Object.entries(result).filter(([,r])=>!r.deleted).map(([key,r])=>[key,r.payload])));return result}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}
function mergeValue(base,local,remote,{preferenceKey=false}={}){
 if(preferenceKey)return mergePrimaryPreference(base,local,remote);
 if(same(local,base))return {value:remote};if(same(remote,base)||same(local,remote))return {value:local};
 if(object(local)&&object(remote)&&(base===undefined||object(base))){const value={};for(const key of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){const child=mergeValue(base?.[key],local[key],remote[key]);if(child.conflict)return {value:local,conflict:true};if(child.value!==undefined)value[key]=child.value}return {value};}
 return {value:local,conflict:true};
}
export function reconcile(state,base,remote,pending={}){
 const local=flattenState(state),next={},nextBase={...remote},conflicts=[],prefKey=activityUiItemKey();
 for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
  const acknowledged=pending[key]?.mutation_id===remote[key]?.mutation_id&&same(pending[key]?.deleted?undefined:canonicalValue(key,pending[key]?.payload),rowValue(remote[key]));
  const before=acknowledged?rowValue(remote[key]):rowValue(base[key]),result=mergeValue(before,local[key],rowValue(remote[key]),{preferenceKey:key===prefKey});
  if(result.value!==undefined)next[key]=result.value;
  if(result.conflict){conflicts.push({key,local:local[key]===undefined?null:local[key],localDeleted:local[key]===undefined,remote:remote[key]||null});if(base[key])nextBase[key]=base[key];else delete nextBase[key];}
 }
 return {state:unflattenState(next),base:nextBase,conflicts};
}
export function pendingChanges(state,base,pending={}){const local=flattenState(state),ops=[];for(const key of new Set([...Object.keys(local),...Object.keys(base)])){const value=local[key];if(same(value,rowValue(base[key])))continue;const draft={item_key:key,payload:value??null,deleted:value===undefined,base_version:base[key]?.version||0};const old=pending[key];ops.push({...draft,mutation_id:old&&same(draft,{item_key:old.item_key,payload:old.payload,deleted:old.deleted,base_version:old.base_version})?old.mutation_id:crypto.randomUUID()})}return ops}
export function resolveConflict(state,base,conflict,choice){const entries=flattenState(state);if(choice==='remote'){const value=rowValue(conflict.remote);if(value===undefined)delete entries[conflict.key];else entries[conflict.key]=value}const next={...base};if(conflict.remote)next[conflict.key]=conflict.remote;else delete next[conflict.key];return {state:unflattenState(entries),base:next}}
export function conflictTitle(conflict){const [collection,id]=JSON.parse(conflict.key),labels={events:'일정',tasks:'할 일',logs:'활동 기록',diary:'일기',life:'생활 상태',routineTemplates:'루틴 설정',routineRuns:'루틴 실행',favorites:'즐겨찾기',weeklyReviews:'주간 회고',studySubjects:'공부 과목',checks:'체크',routines:'기존 루틴',exercises:'기존 운동',preferences:'환경설정'};const value=conflict.local||conflict.remote?.payload;return `${labels[collection]||'기록'} · ${value?.title||value?.name||value?.primaryActivityId||value?.text?.slice(0,50)||id}`}
