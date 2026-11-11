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
  const start=parsedInstant(l.startedAt)||new Date(l.date+'T'+l.time);
  const explicit=isDate(l.endDate)&&isTime(l.endTime);
  let end=null;
  if(explicit)end=parsedInstant(l.endedAt)||new Date(l.endDate+'T'+l.endTime);
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
 return {endDate:todayKey(at),endTime:padTime(at),endedAt:at.toISOString()};
}

export function parsedInstant(value){
 if(typeof value!=='string'||!value)return null;
 const date=new Date(value);
 return Number.isNaN(+date)?null:date;
}

export function validActivityInstant(value){
 return value===undefined||(typeof value==='string'&&value.length<=40&&parsedInstant(value)!==null);
}

/** Keep an existing absolute instant when the visible minute did not change. */
export function preservedInstant(existing,previousDate,previousTime,nextDate,nextTime){
 if(!isDate(nextDate)||!isTime(nextTime))return '';
 const next=new Date(nextDate+'T'+nextTime);
 if(Number.isNaN(+next))return '';
 const previous=isDate(previousDate)&&isTime(previousTime)?new Date(previousDate+'T'+previousTime):null;
 const kept=parsedInstant(existing);
 if(kept&&previous&&!Number.isNaN(+previous)&&+previous===+next)return kept.toISOString();
 return next.toISOString();
}

export const LONG_ACTIVITY_MS=8*60*60*1000;
export const DAY_ELAPSED_CAP_MINUTES=24*60;

export function isLongRunning(interval,now=new Date()){
 return !!interval?.ongoing&&interval.start instanceof Date&&now-interval.start>=LONG_ACTIVITY_MS;
}

/** Ask once per ongoing run. An acknowledgement before this start does not count. */
export function longRunNeedsConfirm(log,interval,now=new Date()){
 if(!isLongRunning(interval,now))return false;
 const ack=parsedInstant(log?.longRunAckAt);
 return !ack||ack<interval.start;
}

export function longRunAckFields(at=new Date()){
 return {longRunAckAt:at.toISOString()};
}

export function localTimeZone(){
 try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}
}

export function shiftDateKey(dateKey,days){
 const [year,month,day]=dateKey.split('-').map(Number);
 return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);
}

/** Local wall-clock time in a zone, as an absolute instant. */
export function zonedDateTime(dateKey,time,timeZone=localTimeZone()){
 if(!isDate(dateKey)||!isTime(time))return null;
 const [year,month,day]=dateKey.split('-').map(Number);
 const [hour,minute]=time.split(':').map(Number);
 let guess=Date.UTC(year,month-1,day,hour,minute,0);
 const format=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<4;i++){
  const parts=Object.fromEntries(format.formatToParts(new Date(guess)).map(part=>[part.type,part.value]));
  const got=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  const want=Date.UTC(year,month-1,day,hour,minute,0);
  if(got===want)return new Date(guess);
  guess+=want-got;
 }
 return new Date(guess);
}

export function zonedDayBounds(dateKey,timeZone=localTimeZone()){
 return {start:zonedDateTime(dateKey,'00:00',timeZone),end:zonedDateTime(shiftDateKey(dateKey,1),'00:00',timeZone)};
}

/**
 * Per-day minutes from one original interval.
 * sumMinutes counts each activity, including overlap.
 * elapsedMinutes is the union and never exceeds 24 hours.
 */
export function dayActivityStats(intervals,dateKey,now=new Date(),timeZone=localTimeZone()){
 const bounds=zonedDayBounds(dateKey,timeZone);
 if(!bounds.start||!bounds.end)return {sumMinutes:0,elapsedMinutes:0};
 const slices=[];
 for(const row of intervals.values?intervals.values():intervals){
  if(!row?.start)continue;
  const rangeEnd=row.end||(row.ongoing?now:null);
  if(!rangeEnd)continue;
  const from=Math.max(+row.start,+bounds.start),to=Math.min(+rangeEnd,+bounds.end);
  if(!(to>from))continue;
  slices.push({start:new Date(from),end:new Date(to),minutes:Math.floor((to-from)/60000)});
 }
 return {
  sumMinutes:slices.reduce((total,slice)=>total+slice.minutes,0),
  elapsedMinutes:Math.min(DAY_ELAPSED_CAP_MINUTES,mergedElapsedMinutes(slices,now))
 };
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
