import {escapeRecordFilterKey} from './cloud-query.js';
import {validateRows} from './sync-state.js';
// Keep full records in memory for this account/space. Poll only record versions after boot.
export function createRecordCache({loadAll,loadManifest,loadKeys}){
 let loaded=false,cache={};
 const validate=rows=>validateRows(rows);
 return {
  async pull(){
   if(!loaded){const rows=validate(await loadAll());cache=structuredClone(rows);loaded=true;return Object.values(structuredClone(cache))}
   const manifest=await loadManifest();if(!Array.isArray(manifest)||manifest.some(r=>typeof r.item_key!=='string'||!Number.isSafeInteger(r.version)||r.version<1))throw Error('동기화 버전 정보를 확인하지 못했어요.');
   const keys=[...new Set(manifest.filter(r=>cache[r.item_key]?.version!==r.version).map(r=>r.item_key))];const fetched=[];let batch=[],bytes=0;
   async function flush(){if(batch.length){fetched.push(...await loadKeys(batch));batch=[];bytes=0}}
   for(const key of keys){const size=encodeURIComponent(escapeRecordFilterKey(key)).length+3;if(batch.length&&(batch.length>=80||bytes+size>5000))await flush();batch.push(key);bytes+=size}await flush();
   let changes=validate(fetched);const versions=new Map(manifest.map(r=>[r.item_key,r.version]));
   // Never report a successful pull while a known newer record is absent or stale.
   if(keys.some(key=>!changes[key]||changes[key].version<versions.get(key))){
    changes=validate(await loadAll());
    if(keys.some(key=>!changes[key]||changes[key].version<versions.get(key)))throw Error('새 기록의 상세 내용이 빠졌거나 오래됐어요. 다시 동기화해요.');
   }
   for(const [key,row] of Object.entries(changes))if(cache[key]&&row.version<cache[key].version)throw Error('이전 버전의 기록을 받아 다시 확인해요.');
   cache={...cache,...structuredClone(changes)};
   // Records are soft-deleted. Absence in a paginated manifest must never delete cached data.
   return Object.values(structuredClone(cache));
  },
  accept(rows){const changes=validate(rows);cache={...cache,...structuredClone(changes)}}
 };
}
