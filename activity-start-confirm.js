import {isDate,isTime} from './domain-time.js';
import {finishActivityFields,independentTimingFields} from './activity-timing.js';

/** New activity starts need a keep/end prompt only when something is already ongoing. */
export function shouldConfirmOngoingStart(mode,ongoingCount){
 return mode==='activity'&&Number(ongoingCount)>0;
}

/**
 * Checkbox name=endId: checked → end that activity. Unchecked → keep.
 * Never ends an id that was not listed as ongoing when the dialog opened.
 */
export function resolveOngoingEndChoices(ongoingIds,endIds){
 const ongoing=new Set((ongoingIds||[]).filter(Boolean));
 const end=new Set((endIds||[]).filter(id=>ongoing.has(id)));
 return {
  endIds:[...ongoing].filter(id=>end.has(id)),
  keepIds:[...ongoing].filter(id=>!end.has(id))
 };
}

/** Mutate logs: write explicit end only for chosen ids. Leaves others untouched. */
export function applyOngoingEnds(logs,endIds,at=new Date()){
 const ends=new Set(endIds||[]);
 const fields=finishActivityFields(at);
 let changed=0;
 for(const log of logs||[]){
  if(!ends.has(log.id))continue;
  if(isDate(log.endDate)&&isTime(log.endTime))continue;
  Object.assign(log,fields);
  changed++;
 }
 return changed;
}

/** Fields for a newly started activity under Activity System 2.0. Memo stays unmarked. */
export function captureTimingFields(mode){
 return mode==='activity'?independentTimingFields():{};
}
