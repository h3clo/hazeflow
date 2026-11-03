import {stable} from './sync-state.js';
// Compare against the record loaded inside the save transaction, not a stale
// copy from the screen. Deletion must never turn an edit into a new record.
export function assertRecordUnchanged(current,opened){
 if(!current)throw Error('다른 화면에서 삭제된 기록이에요. 목록을 다시 확인해주세요.');
 const comparable=r=>{const copy={...r};for(const key of ['endDate','endTime'])if(copy[key]===null||copy[key]==='')delete copy[key];return stable(copy)};
 if(comparable(current)!==comparable(opened))throw Error('다른 기기나 화면에서 바뀐 기록이에요. 입력 내용을 따로 보관한 뒤 편집창을 다시 열어주세요.');
}
