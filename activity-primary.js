/**
 * Primary (representative) ongoing activity — display only.
 * PR C stores preference locally. Future account sync shape (not wired yet):
 * { primaryActivityId, primaryUpdatedAt, primaryUpdatedBy } with LWW on updatedAt.
 */

export function primaryStorageKey(ownerKey){
 return String(ownerKey||'')+'-primary-activity';
}

export function readPrimaryActivityId(storage,ownerKey){
 try{
  const raw=storage?.getItem?.(primaryStorageKey(ownerKey));
  return raw&&typeof raw==='string'&&raw.length&&raw.length<=200?raw:null;
 }catch{return null}
}

export function writePrimaryActivityId(storage,ownerKey,id){
 const key=primaryStorageKey(ownerKey);
 try{
  if(!id){storage?.removeItem?.(key);return null}
  storage?.setItem?.(key,String(id));
  return String(id);
 }catch{return null}
}

/** Prefer stored id when it is still ongoing; otherwise newest-by-start (last in sorted list). */
export function resolvePrimaryActivity(ongoingLogs,preferredId){
 const list=Array.isArray(ongoingLogs)?ongoingLogs:[];
 if(!list.length)return null;
 if(preferredId){
  const hit=list.find(l=>l.id===preferredId);
  if(hit)return hit;
 }
 return list.at(-1)||null;
}

export function primaryPreferencePayload(id,at=Date.now(),deviceId=''){
 return {primaryActivityId:id||null,primaryUpdatedAt:Number(at)||Date.now(),primaryUpdatedBy:String(deviceId||'')};
}
