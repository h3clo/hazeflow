import {liveActivityCommand} from './live-activity.js';

/**
 * Watch snapshots follow the signed-in account.
 * A hold replaces any previous activity with "pending" and blocks ready snapshots
 * until the new account's records are loaded.
 */
export function createWatchSnapshotGate({send}){
 let ready=false;
 let generation=0;
 function emit(command){
  return send({...command,generation});
 }
 return {
  isReady:()=>ready,
  hold(){
   ready=false;
   generation+=1;
   return emit({phase:'pending'});
  },
  publish(state,preferredId,now=new Date()){
   if(!ready)return emit({phase:'pending'});
   return emit(liveActivityCommand(state,preferredId,now));
  },
  release(state,preferredId,now=new Date()){
   ready=true;
   return emit(liveActivityCommand(state,preferredId,now));
  }
 };
}
