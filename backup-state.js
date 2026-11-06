import {emptyState,validateBackup} from './domain.js';
// Queue a fresh IndexedDB read behind in-flight saves before preparing any export.
export async function readBackupState({storage,key,getKey}){const raw=await storage.read(key);if(getKey()!==key)throw Error('계정이 바뀌어 내보내기를 중단했어요.');return raw?validateBackup(JSON.parse(raw)):emptyState()}
