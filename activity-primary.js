/**
 * Primary (representative) ongoing activity — display only.
 * Synced as preferences.activityUi: { primaryActivityId, primaryUpdatedAt, primaryUpdatedBy }
 * Conflict policy: LWW on primaryUpdatedAt, then lexical primaryUpdatedBy. Never mutates logs.
 */

export const ACTIVITY_UI_ID='activityUi';
export const DEVICE_ID_KEY='hazeflow-device-id-v1';

export function primaryStorageKey(ownerKey){
 return String(ownerKey||'')+'-primary-activity';
}

export function readPrimaryActivityId(storage,ownerKey){
 try{
  const raw=storage?.getItem?.(primaryStorageKey(ownerKey));
  if(!raw||typeof raw!=='string'||!raw.length||raw.length>200)return null;
  // IndexedDB migration marker must never be treated as an activity id.
  if(raw==='hazeflow-indexeddb-v1'||raw.startsWith('hazeflow-gzip-v1:'))return null;
  return raw;
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

/** Stable per-browser id for LWW tie-breaks and audit. Not an account secret. */
export function readDeviceId(storage){
 try{
  const raw=storage?.getItem?.(DEVICE_ID_KEY);
  if(raw&&typeof raw==='string'&&raw.length&&raw.length<=80)return raw;
 }catch{}
 const id=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():('device-'+Math.random().toString(36).slice(2)+Date.now().toString(36));
 try{storage?.setItem?.(DEVICE_ID_KEY,id)}catch{}
 return id;
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

export function validActivityUiPreference(row){
 if(row==null)return true;
 if(!row||typeof row!=='object'||Array.isArray(row))return false;
 const id=row.primaryActivityId;
 if(!(id===null||(typeof id==='string'&&id.length>0&&id.length<=200&&!['__proto__','constructor','prototype'].includes(id))))return false;
 if(!Number.isFinite(row.primaryUpdatedAt)||row.primaryUpdatedAt<=0)return false;
 if(typeof row.primaryUpdatedBy!=='string'||row.primaryUpdatedBy.length>80)return false;
 return Object.keys(row).every(k=>['primaryActivityId','primaryUpdatedAt','primaryUpdatedBy'].includes(k));
}

/** -1 if a is older, 1 if a is newer, 0 if equal for LWW. */
export function comparePrimaryPreference(a,b){
 const at=Number(a?.primaryUpdatedAt)||0,bt=Number(b?.primaryUpdatedAt)||0;
 if(at!==bt)return at<bt?-1:1;
 const aby=String(a?.primaryUpdatedBy||''),bby=String(b?.primaryUpdatedBy||'');
 if(aby===bby)return 0;
 return aby<bby?-1:1;
}

function samePreference(a,b){
 if(a===b)return true;
 if(!a||!b)return false;
 return a.primaryActivityId===b.primaryActivityId
  &&Number(a.primaryUpdatedAt)===Number(b.primaryUpdatedAt)
  &&String(a.primaryUpdatedBy||'')===String(b.primaryUpdatedBy||'');
}

/**
 * Three-way merge for preferences.activityUi. Never reports conflict — LWW when both diverge.
 * Preferring higher primaryUpdatedAt limits damage from concurrent edits; clocks may still skew.
 */
export function mergePrimaryPreference(base,local,remote){
 if(local===undefined)return {value:remote};
 if(remote===undefined)return {value:local};
 if(samePreference(local,remote))return {value:local};
 if(samePreference(local,base))return {value:remote};
 if(samePreference(remote,base))return {value:local};
 return {value:comparePrimaryPreference(local,remote)>=0?local:remote};
}

export function primaryIdFromState(state){
 const row=state?.preferences?.[ACTIVITY_UI_ID];
 const id=row?.primaryActivityId;
 return id&&typeof id==='string'?id:null;
}

/** Write preference into account state (syncable). Does not touch logs. */
export function setPrimaryPreference(state,id,{at=Date.now(),deviceId=''}={}){
 state.preferences??={};
 state.preferences[ACTIVITY_UI_ID]=primaryPreferencePayload(id,at,deviceId);
 return state.preferences[ACTIVITY_UI_ID];
}

/** Mirror syncable preference id into the local display cache for this owner. */
export function mirrorPrimaryPreference(storage,ownerKey,state){
 return writePrimaryActivityId(storage,ownerKey,primaryIdFromState(state));
}
