import {collectPhotoRefs} from './photos.js';
import {flattenState,reconcile,pendingChanges,resolveConflict,validateRows,stable} from './sync-state.js';

export function createSyncEngine({transport,storage,photoStore,read,write,onStatus=()=>{},online=()=>true,now=()=>new Date().toISOString()}){
 let stopped=false,running=false,again=false,timer,meta;
 try{meta=JSON.parse(storage.getItem()||'null')}catch{}meta={base:{},pending:{},uploaded:[],lastSync:null,...meta};
 let conflicts=[];const uploaded=new Set(meta.uploaded);
 const save=()=>{meta.uploaded=[...uploaded];storage.setItem(JSON.stringify(meta))};
 const status=(phase,extra={})=>{let pending=0;try{pending=pendingChanges(read(),meta.base,meta.pending).length}catch{}if(!stopped)onStatus({phase,lastSync:meta.lastSync,pending,conflicts,...extra})};
 const active=()=>{if(stopped)throw new Error('SYNC_STOPPED')};
 async function photos(state,remote){
  const remoteState=Object.fromEntries(Object.entries(remote).filter(([,row])=>!row.deleted).map(([key,row])=>[key,row.payload]));
  const remotePhotos=new Set();for(const value of Object.values(remoteState))for(const ref of value?.photos||[])remotePhotos.add(ref.id);
  for(const ref of collectPhotoRefs(state)){active();let blob=await photoStore.get(ref.id);active();if(remotePhotos.has(ref.id)){if(!blob){blob=await transport.downloadPhoto(ref);active();if(blob.size!==ref.bytes)throw Error('사진 파일의 크기가 기록과 일치하지 않아요.');await photoStore.put(ref.id,blob);active()}uploaded.add(ref.id)}else if(!uploaded.has(ref.id)){if(!blob)throw Error('기기에 없는 사진이 있어요. 사진 포함 백업을 불러와주세요.');await transport.uploadPhoto(ref,blob);active();uploaded.add(ref.id)}}
 }
 async function sync(){
  if(stopped)return;if(running){again=true;return}clearTimeout(timer);if(!online()){status('offline');return}running=true;
  try{status('syncing');const remote=validateRows(await transport.pull());active();const previous=read(),merged=reconcile(previous,meta.base,remote,meta.pending);conflicts=merged.conflicts;
   // Persist data before its baseline: a crash must never turn an unseen remote item into a local deletion.
   if(stable(flattenState(previous))!==stable(flattenState(merged.state)))write(merged.state);
   meta.base=merged.base;for(const [key,op]of Object.entries(meta.pending))if(remote[key]?.mutation_id===op.mutation_id)delete meta.pending[key];save();
   if(conflicts.length){status('conflict');return}
   const snapshot=read(),ops=pendingChanges(snapshot,meta.base,meta.pending);for(const op of ops)meta.pending[op.item_key]=op;save();await photos(snapshot,remote);active();
   for(let offset=0;offset<ops.length;offset+=500){const result=await transport.push(ops.slice(offset,offset+500));active();if(!result.applied){again=true;return}const rows=validateRows(result.rows);for(const [key,row]of Object.entries(rows)){meta.base[key]=row;delete meta.pending[key]}save()}
   meta.lastSync=now();save();if(pendingChanges(read(),meta.base,meta.pending).length)again=true;status('synced');
  }catch(error){if(!stopped)status(online()?'error':'offline',{error:error.message})}finally{running=false;if(again&&!stopped){again=false;schedule(150)}}
 }
 function schedule(delay=700){if(stopped)return;if(running){again=true;return}clearTimeout(timer);status(online()?'pending':'offline');timer=setTimeout(sync,delay)}
 function resolve(key,choice){const conflict=conflicts.find(c=>c.key===key);if(!conflict||!['local','remote'].includes(choice))return;const result=resolveConflict(read(),meta.base,conflict,choice);write(result.state);meta.base=result.base;conflicts=conflicts.filter(c=>c.key!==key);save();if(!conflicts.length)schedule(0);else status('conflict')}
 return {sync,schedule,resolve,getStatus:()=>({conflicts,lastSync:meta.lastSync,pending:pendingChanges(read(),meta.base,meta.pending).length}),stop(){stopped=true;clearTimeout(timer)}};
}
