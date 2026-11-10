import {emptyState,validateBackup} from './domain.js';
// Queue a fresh IndexedDB read behind in-flight saves before preparing any export.
export async function readBackupState({storage,key,getKey}){const raw=await storage.read(key);if(getKey()!==key)throw Error('계정이 바뀌어 내보내기를 중단했어요.');return raw?validateBackup(JSON.parse(raw)):emptyState()}

export function assertBackupIdle(accountLoading,action='export'){
 if(accountLoading)throw Error(`계정과 기록을 확인 중이에요. 확인이 끝난 뒤 ${action==='import'?'불러와':'내보내'}주세요.`);
}

export function assertBackupOwner(startedAs,current,actionLabel='내보내기'){
 if(startedAs!==current)throw Error(`계정이 바뀌어 ${actionLabel}를 중단했어요.`);
}

export function assertBackupFileSize(size,limit=100*1024*1024){
 if(size>limit)throw Error('백업 파일이 너무 커요. 100MB 이하 파일을 선택해주세요.');
}

/** recovery raw present → replace path; otherwise merge into live records. */
export function resolveImportMode(recovery){return recovery?'restore':'merge'}

/** Only clear recovery after the restore write succeeded. */
export function importCommitOutcome({saved,mode}){
 if(!saved)throw Error('기록 저장을 완료하지 못했어요. 다시 시도해주세요.');
 return {clearRecovery:mode==='restore',status:'불러오기 완료'};
}

export function emptyBackupFallback(){return emptyState()}
