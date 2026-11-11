import {Capacitor, registerPlugin} from '@capacitor/core';
import {ongoingActivities} from './domain.js';
import {resolvePrimaryActivity} from './activity-primary.js';

const NativeLiveActivity = registerPlugin('HazeLiveActivity');

/** First line, same length as the in-app primary bar. */
export function liveActivityTitle(log){
 const line=String(log?.text||'').split('\n').map(part=>part.trim()).find(Boolean)||'활동';
 return [...line].slice(0,42).join('');
}

/**
 * One payload for the single Live Activity.
 * Ongoing selection and the primary fallback are resolvePrimaryActivity, not a new rule.
 */
export function liveActivityPayload(state,preferredId,now=new Date()){
 const rows=ongoingActivities(state,now);
 const primary=resolvePrimaryActivity(rows.map(row=>row.log),preferredId);
 if(!primary)return null;
 const interval=rows.find(row=>row.log.id===primary.id)?.interval;
 const startedAt=interval?.start instanceof Date&&!Number.isNaN(interval.start.getTime())?interval.start.toISOString():null;
 if(!startedAt)return null;
 return {
  recordId:primary.id,
  title:liveActivityTitle(primary),
  kind:String(primary.kind||'일상').slice(0,20),
  startedAt,
  primary:true
 };
}

export function createLiveActivityClient({isNative,bridge}){
 let chain=Promise.resolve();
 let generation=0;
 return {
  sync(state,preferredId,now=new Date()){
   const payload=liveActivityPayload(state,preferredId,now);
   const ticket=++generation;
   const run=async()=>{
    if(ticket!==generation)return {status:'stale',recordId:payload?.recordId||null};
    if(!isNative())return {status:'skipped',recordId:payload?.recordId||null};
    try{
     const result=await bridge.sync(payload||{end:true});
     return {status:result?.status||'unsupported',recordId:payload?.recordId||result?.recordId||null,count:result?.count??null};
    }catch{
     return {status:'unsupported',recordId:payload?.recordId||null};
    }
   };
   const pending=chain.then(run,run);
   chain=pending.then(()=>{},()=>{});
   return pending;
  }
 };
}

const nativeClient=createLiveActivityClient({
 isNative:()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios',
 bridge:NativeLiveActivity
});

export function syncLiveActivity(state,preferredId,now=new Date()){
 return nativeClient.sync(state,preferredId,now);
}

/** iPhone asks the web view for a fresh snapshot when the watch opens. */
export function listenForLiveActivityRefresh(onRefresh){
 if(!(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios'))return;
 NativeLiveActivity.addListener('refresh',()=>onRefresh());
}
