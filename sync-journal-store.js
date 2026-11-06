// IndexedDB transactions complete before the engine considers its journal saved.
export async function openSyncJournal({key,legacy,indexedDB=globalThis.indexedDB,dbName='hazeflow-records-v1'}){
 if(!indexedDB)throw Error('이 브라우저에서 큰 기록 저장소를 열 수 없어요. 기존 기록은 유지했어요.');
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,1);request.onupgradeneeded=()=>request.result.createObjectStore('journals');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('이전 Haze Flow 창을 닫고 다시 열어주세요.'))});
 db.onversionchange=()=>db.close();
 const read=()=>new Promise((resolve,reject)=>{const tx=db.transaction('journals','readonly'),r=tx.objectStore('journals').get(key);tx.oncomplete=()=>resolve(r.result??null);tx.onabort=()=>reject(tx.error||Error('동기화 보관 내용을 읽지 못했어요.'))});
 const put=value=>new Promise((resolve,reject)=>{const tx=db.transaction('journals','readwrite');tx.objectStore('journals').put(value,key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('동기화 보관 내용을 저장하지 못했어요.'))});
 let value=await read(),queue=Promise.resolve();const old=legacy.getItem(key);
 if(value===null&&old!==null){JSON.parse(old);await put(old);if(await read()!==old)throw Error('동기화 보관 내용의 이전을 확인하지 못했어요. 기존 기록은 유지했어요.');value=old;legacy.removeItem(key)}
 return {getItem:()=>value,setItem(next){const task=queue.catch(()=>{}).then(async()=>{await put(next);value=next});queue=task;return task},close:()=>queue.then(()=>db.close(),()=>db.close())};
}
