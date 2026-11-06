import {stable} from './sync-state.js';
// Compare against the record loaded inside the save transaction, not a stale
// copy from the screen. Deletion must never turn an edit into a new record.
export function assertRecordUnchanged(current,opened){
 if(!opened||typeof opened!=='object')throw Error('기록을 다시 확인해주세요.');
 if(!current)throw Error('다른 화면에서 삭제된 기록이에요. 목록을 다시 확인해주세요.');
 const comparable=r=>{const copy={...r};for(const key of ['endDate','endTime'])if(copy[key]===null||copy[key]==='')delete copy[key];return stable(copy)};
 if(comparable(current)!==comparable(opened))throw Error('다른 기기나 화면에서 바뀐 기록이에요. 입력 내용을 따로 보관한 뒤 편집창을 다시 열어주세요.');
}
export function removeUnchangedLog(logs,id,opened){
 assertRecordUnchanged(logs.find(l=>l.id===id),opened);
 return logs.filter(l=>l.id!==id).map(l=>{if(l.expenseId!==id)return l;const copy={...l};delete copy.expenseId;return copy});
}
export function removeUnchangedItem(items,id,opened){
 assertRecordUnchanged(items.find(item=>item.id===id),opened);
 return items.filter(item=>item.id!==id);
}
export function removeUnchangedAssetAccount(logs,accountId,openedLogs){
 if(!accountId||!Array.isArray(openedLogs)||!openedLogs.length)throw Error('삭제할 자산을 다시 확인해주세요.');
 const current=logs.filter(l=>l.asset?.accountId===accountId);
 if(current.length!==openedLogs.length)throw Error('다른 기기나 화면에서 바뀐 기록이에요. 입력 내용을 따로 보관한 뒤 편집창을 다시 열어주세요.');
 const opened=new Map(openedLogs.map(l=>[l.id,l]));
 for(const row of current)assertRecordUnchanged(row,opened.get(row.id));
 return logs.filter(l=>l.asset?.accountId!==accountId);
}
export function linkHealthWorkout(logs,{healthId,targetId,openedHealth,openedTarget}){
 if(!openedTarget)throw Error('연결할 운동을 다시 확인해주세요.');
 const row=logs.find(l=>l.id===healthId),target=logs.find(l=>l.id===targetId);
 assertRecordUnchanged(row,openedHealth);
 assertRecordUnchanged(target,openedTarget);
 if(row.kind!=='건강운동'||target.kind!=='운동'||row.date!==target.date)throw Error('연결할 운동을 다시 확인해주세요.');
 target.healthWorkouts=[...(target.healthWorkouts||[]),...(row.healthWorkouts||[]).filter(w=>!target.healthWorkouts?.some(x=>x.id===w.id))];
 return logs.filter(l=>l.id!==healthId);
}
// End-only updates may safely arrive while editing text: keep the latest end via
// activityEndForEdit. All other concurrent changes must be reviewed first.
export function assertActivityEditSafe(current,opened,submitted){
 const withoutEnd=r=>{if(!r)return r;const {endDate,endTime,...rest}=r;return rest};
 assertRecordUnchanged(withoutEnd(current),withoutEnd(opened));
 const end=r=>[r?.endDate||'',r?.endTime||''];
 const same=(a,b)=>JSON.stringify(end(a))===JSON.stringify(end(b));
 if(!same(submitted,opened)&&!same(current,opened)&&!same(current,submitted))throw Error('다른 기기에서 종료 시간을 수정했어요. 입력 내용을 보관하고 시작·종료 시간을 다시 확인해주세요.');
}
