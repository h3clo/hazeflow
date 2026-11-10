import {isDate,isTime,todayKey} from './domain-time.js';

/** Per-log timing. Absent = legacy chain. Only 'independent' is stored for new mode. */
export const INDEPENDENT_TIMING = 'independent';

export function isIndependentTiming(log){
 return log?.activityTiming===INDEPENDENT_TIMING;
}

export function isActivityIntervalLog(log){
 return !!log&&!log.sourceId&&!log.memo&&!log.healthDaily&&log.kind!=='건강운동'&&isDate(log.date)&&isTime(log.time);
}

function padTime(d){
 return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

function intervalEndFields(end){
 return end?{endDate:todayKey(end),endTime:padTime(end)}:{endDate:'',endTime:''};
}

/**
 * Build start/end/ongoing map for timed non-memo logs.
 * Legacy (no activityTiming): end = explicit or next *legacy* start (independent neighbors skipped).
 * Independent: end = explicit only; otherwise ongoing when start<=now.
 * Skipping independent as legacy chain neighbors preserves legacy inferred ends when new
 * independent logs are added — no materialization required for mixed data.
 */
export function activityIntervals(d,now=new Date()){
 const records=(d.logs||[]).filter(isActivityIntervalLog).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.id.localeCompare(b.id));
 const result=new Map();
 records.forEach((l,i)=>{
  const independent=isIndependentTiming(l);
  const start=new Date(l.date+'T'+l.time);
  const explicit=isDate(l.endDate)&&isTime(l.endTime);
  let end=null;
  if(explicit)end=new Date(l.endDate+'T'+l.endTime);
  else if(!independent){
   const next=records.slice(i+1).find(x=>!isIndependentTiming(x));
   if(next)end=new Date(next.date+'T'+next.time);
  }
  const ongoing=!end&&start<=now;
  const fields=intervalEndFields(end);
  result.set(l.id,{
   start,
   end,
   ongoing,
   automatic:!explicit&&!independent,
   timing:independent?INDEPENDENT_TIMING:'legacy',
   minutes:Math.max(0,Math.floor(((end||now)-start)/60000)),
   ...fields
  });
 });
 return result;
}

/** Ongoing interval logs with their computed intervals (stable id order by start). */
export function ongoingActivities(d,now=new Date()){
 const intervals=activityIntervals(d,now);
 return (d.logs||[]).filter(l=>intervals.get(l.id)?.ongoing).map(l=>({log:l,interval:intervals.get(l.id)}))
  .sort((a,b)=>(a.log.date+a.log.time).localeCompare(b.log.date+b.log.time)||a.log.id.localeCompare(b.log.id));
}

/** Explicit end payload for finish-activity style writes. Does not mutate state. */
export function finishActivityFields(at=new Date()){
 return {endDate:todayKey(at),endTime:padTime(at)};
}

/** Sum of each activity's own minutes (overlaps counted more than once). */
export function sumActivityMinutes(intervals){
 let total=0;
 for(const r of intervals.values?intervals.values():intervals)total+=Math.max(0,r.minutes|0);
 return total;
}

/**
 * Wall-clock elapsed: merge overlapping [start, end||now] ranges then sum minutes.
 * Use for "실제 경과 시간"; prefer sumActivityMinutes for per-activity totals.
 */
export function mergedElapsedMinutes(intervals,now=new Date()){
 const ranges=[];
 for(const r of intervals.values?intervals.values():intervals){
  if(!r?.start)continue;
  const start=+r.start,end=+(r.end||now);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
  ranges.push([start,end]);
 }
 ranges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const merged=[];
 for(const range of ranges){
  const last=merged.at(-1);
  if(!last||range[0]>last[1])merged.push(range.slice());
  else last[1]=Math.max(last[1],range[1]);
 }
 return merged.reduce((n,[a,b])=>n+Math.max(0,Math.floor((b-a)/60000)),0);
}

/** Optional field for writers of new independent activities (PR B+). */
export function independentTimingFields(){
 return {activityTiming:INDEPENDENT_TIMING};
}

export function validActivityTiming(value){
 return value===undefined||value===INDEPENDENT_TIMING;
}
