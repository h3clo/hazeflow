import {createRecordStorage} from './record-storage.js';
const marker='hazeflow-indexeddb-v1';
export async function openRecordStorage({local,indexedDB=globalThis.indexedDB,namespace,dbName='hazeflow-snapshots-v1',channelFactory=name=>typeof BroadcastChannel==='function'?new BroadcastChannel(name):null}){
 if(!indexedDB)throw Error('기기 기록 보관함을 열 수 없어요. 기존 기록은 그대로 유지했어요.');
 const legacy=createRecordStorage(local),cache=new Map(),listeners=new Set();
 const managed=key=>(key===namespace||key.startsWith(namespace+'-'))&&!key.endsWith('-theme')&&!key.endsWith('-sync');
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('다른 Haze Flow 창을 닫고 다시 열어주세요.'))});db.onversionchange=()=>db.close();
 const remember=(key,row)=>{if(row&&(!cache.has(key)||row.version>=cache.get(key).version))cache.set(key,row);return row?.value??null};
 const read=key=>new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').get(key);tx.oncomplete=()=>resolve(remember(key,r.result));tx.onabort=()=>reject(tx.error||Error('기기 기록을 읽지 못했어요.'))});
 const write=(key,mutate)=>new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.get(key);let next,result,problem;r.onsuccess=()=>{try{const old=r.result;result=mutate(old?.value??null);if(typeof result!=='string')throw Error('기기 기록의 저장 형식을 확인하지 못했어요.');next={version:(old?.version||0)+1,value:result};store.put(next,key)}catch(error){problem=error;tx.abort()}};tx.oncomplete=()=>{remember(key,next);resolve(result)};tx.onabort=()=>reject(problem||tx.error||Error('기기 기록을 저장하지 못했어요. 기존 기록은 유지했어요.'))});
 await new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(managed(String(c.key)))remember(String(c.key),c.value);c.continue()}};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
 const keys=Array.from({length:local.length},(_,i)=>local.key(i)).filter(k=>k&&managed(k));
 for(const key of keys){const raw=local.getItem(key);if(raw===marker)continue;const value=legacy.getItem(key);if(value===null)continue;
  // Preserve any late legacy writer separately instead of discarding its unsent work.
  if(cache.has(key)&&cache.get(key).value!==value){const rescue=key+'-legacy-rescue';await write(rescue,()=>value);if(await read(rescue)!==value)throw Error('이전 기록의 보관을 확인하지 못했어요. 원본을 유지했어요.')}else if(!cache.has(key))await write(key,old=>old??value);
  if(await read(key)===null)throw Error('기록 이전을 확인하지 못했어요. 이전 원본을 유지했어요.');
  // Old app versions must fail closed rather than treating a removed key as an empty account.
  local.setItem(key,marker);
 }
 const channel=channelFactory(dbName),announce=key=>{try{local.setItem(key,marker)}catch{}channel?.postMessage({key})};if(channel)channel.onmessage=async({data})=>{if(!data||typeof data.key!=='string'||!managed(data.key))return;try{await read(data.key);for(const fn of listeners)await fn(data.key)}catch{}};
 return {getItem:key=>managed(key)?cache.get(key)?.value??null:legacy.getItem(key),async read(key){return managed(key)?read(key):legacy.getItem(key)},async update(key,fn){const value=await write(key,fn);announce(key);return value},async setItem(key,value){if(!managed(key)){legacy.setItem(key,value);return}await write(key,()=>String(value));announce(key)},removeItem:key=>legacy.removeItem(key),subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)},close(){channel?.close();db.close()}};
}
