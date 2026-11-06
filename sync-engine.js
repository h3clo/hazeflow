import {collectPhotoRefs} from './photos.js';
import {flattenState,reconcile,pendingChanges,resolveConflict,validateRows,stable} from './sync-state.js';

const refsForRow=(key,value)=>{const kind=JSON.parse(key)[0];return kind==='life'?value?.bodyPhotos||[]:['logs','diary'].includes(kind)?value?.photos||[]:[]};
export function createSyncEngine({transport,storage,photoStore,read,write,onStatus=()=>{},online=()=>true,now=()=>new Date().toISOString(),timeoutMs=20000,refresh=null}){
 let stopped=false,running=false,again=false,timer,meta;
 try{meta=JSON.parse(storage.getItem()||'null')}catch{}meta={base:{},pending:{},uploaded:[],lastSync:null,...meta};
 let conflicts=[];const uploaded=new Set(meta.uploaded);
 const save=()=>{meta.uploaded=[...uploaded];return storage.setItem(JSON.stringify(meta))};
 const status=(phase,extra={})=>{let pending=0;try{pending=pendingChanges(read(),meta.base,meta.pending).length}catch{}if(!stopped)onStatus({phase,lastSync:meta.lastSync,pending,conflicts,...extra})};
 const active=()=>{if(stopped)throw new Error('SYNC_STOPPED')};
 async function bounded(work,label){let clock;try{return await Promise.race([work(),new Promise((_,reject)=>{clock=setTimeout(()=>reject(Error(label+' 응답이 늦어요. 기기에 보관하고 다시 시도해요.')),timeoutMs);clock.unref?.()})])}finally{clearTimeout(clock)}}
 async function journal(){for(const op of pendingChanges(read(),meta.base,meta.pending))meta.pending[op.item_key]=op;await save()}
 const remotePhotoRefs=remote=>new Map(Object.entries(remote).filter(([,r])=>!r.deleted).flatMap(([key,r])=>refsForRow(key,r.payload).map(ref=>[ref.id,ref])));
 async function prepareUploads(ops,remote,errors){
  const known=remotePhotoRefs(remote),ready=[];
  for(const op of ops){try{for(const ref of refsForRow(op.item_key,op.payload)){active();if(known.has(ref.id)||uploaded.has(ref.id))continue;const blob=await bounded(()=>photoStore.get(ref.id),'사진 저장소');active();if(!blob)throw Error('기기에 없는 사진이 있어요. 사진 포함 백업을 불러와주세요.');await bounded(()=>transport.uploadPhoto(ref,blob),'사진 업로드');active();uploaded.add(ref.id)}ready.push(op)}catch(error){active();errors.push(error.message)}}
  return ready;
 }
 async function downloadPhotos(remote,errors){
  const known=remotePhotoRefs(remote);
  for(const ref of collectPhotoRefs(read())){if(again)return false;if(!known.has(ref.id))continue;try{active();let blob=await bounded(()=>photoStore.get(ref.id),'사진 저장소');active();if(!blob){blob=await bounded(()=>transport.downloadPhoto(ref),'사진 다운로드');active();if(blob.size!==ref.bytes)throw Error('사진 파일의 크기가 기록과 일치하지 않아요.');await bounded(()=>photoStore.put(ref.id,blob),'사진 저장소');active()}uploaded.add(ref.id)}catch(error){active();errors.push(error.message);break}}return true;
 }
 async function sync(){
  if(stopped)return;if(running){again=true;return}clearTimeout(timer);if(!online()){status('offline');return}running=true;
  try{
   status('syncing');if(refresh)await refresh();active();const remote=validateRows(await bounded(()=>transport.pull(),'기록 불러오기'));active();const previous=read(),merged=reconcile(previous,meta.base,remote,meta.pending);conflicts=merged.conflicts;
   // Persist data before its baseline: a crash must never turn an unseen remote item into a local deletion.
   if(stable(flattenState(previous))!==stable(flattenState(merged.state)))await write(merged.state,previous);
   meta.base=merged.base;for(const [key,op]of Object.entries(meta.pending))if(remote[key]?.mutation_id===op.mutation_id)delete meta.pending[key];await save();
   // A disputed record or missing photo must not block unrelated records (including activity completion).
   const blocked=new Set(conflicts.map(c=>c.key)),ops=pendingChanges(read(),meta.base,meta.pending).filter(op=>!blocked.has(op.item_key));for(const op of ops)meta.pending[op.item_key]=op;await save();
   const errors=[],known=remotePhotoRefs(remote),fast=ops.filter(op=>refsForRow(op.item_key,op.payload).every(ref=>known.has(ref.id)||uploaded.has(ref.id))),slow=ops.filter(op=>!fast.includes(op));
   async function pushOps(batch){for(let offset=0;offset<batch.length;offset+=500){const result=await bounded(()=>transport.push(batch.slice(offset,offset+500)),'기록 전송');active();if(!result.applied){again=true;return false}const rows=validateRows(result.rows);for(const [key,row]of Object.entries(rows)){meta.base[key]=row;remote[key]=row;if(meta.pending[key]?.mutation_id===row.mutation_id)delete meta.pending[key]}await save()}return true}
   if(!await pushOps(fast))return;
   const ready=await prepareUploads(slow,remote,errors);active();await save();if(!await pushOps(ready))return;
   // Metadata is already saved in the cloud; an old photo download cannot undo or delay its upload.
   const photosComplete=await downloadPhotos(remote,errors);active();
   const pending=pendingChanges(read(),meta.base,meta.pending).filter(op=>!blocked.has(op.item_key));
   if(!pending.length&&!conflicts.length)meta.lastSync=now();await save();
   if(conflicts.length)status('conflict',errors.length?{error:errors[0]}:{});
   else if(errors.length)status(pending.length?'error':'photos',{error:(pending.length?'사진이 있는 일부 기록이 전송을 기다리고 있어요. ':'기록은 동기화했고 일부 사진은 다시 확인해야 해요. ')+errors[0]});
   else if(pending.length||!photosComplete){again=true;status(pending.length?'pending':'syncing')}
   else status('synced');
   if(errors.length&&!stopped){timer=setTimeout(sync,30000);timer.unref?.()}
  }catch(error){if(!stopped){status(online()?'error':'offline',{error:error.message});if(online()){timer=setTimeout(sync,15000);timer.unref?.()}}}finally{running=false;if(again&&!stopped){again=false;schedule(150)}}
 }
 async function schedule(delay=700){if(stopped)return;try{await journal();if(stopped)return}catch(error){status('error',{error:'동기화 대기 내용을 보관하지 못했어요. '+error.message});return}if(running){again=true;return}clearTimeout(timer);status(online()?'pending':'offline');timer=setTimeout(sync,delay)}
 async function resolve(key,choice){const conflict=conflicts.find(c=>c.key===key);if(!conflict||!['local','remote'].includes(choice))return;const result=resolveConflict(read(),meta.base,conflict,choice);await write(result.state,read());meta.base=result.base;conflicts=conflicts.filter(c=>c.key!==key);await save();schedule(0)}
 return {sync,schedule,resolve,getStatus:()=>({conflicts,lastSync:meta.lastSync,pending:pendingChanges(read(),meta.base,meta.pending).length}),stop(){stopped=true;clearTimeout(timer);storage.close?.()}};
}
