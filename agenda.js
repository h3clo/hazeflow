import {isTime,recordsForDate,routinesForDate} from './domain.js';

// A view model only: keep original records intact for history, export, and sync.
export function buildDayAgenda(state,date){
 const events=state.events.filter(e=>e.date===date),routines=routinesForDate(state,date),records=recordsForDate(state,date),attached=new Set();
 const eventItems=events.map(event=>{const keys=new Set(['event-start:'+event.id,'event-end:'+event.id]);const executionRecords=records.filter(l=>keys.has(l.sourceId));executionRecords.forEach(l=>attached.add(l));return {type:'event',id:event.id,time:event.start,event,executionRecords}});
 const routineItems=routines.map(routine=>{const executionRecords=records.filter(l=>l.sourceId==='routine:'+date+':'+routine.id);executionRecords.forEach(l=>attached.add(l));return {type:'routine',id:routine.id,time:routine.time||'',routine,executionRecords}});
 const plans=[...eventItems,...routineItems],activities=records.filter(l=>!attached.has(l)).map(record=>({type:'activity',id:record.id,time:record.time||'',record}));
 const rank={event:0,routine:1,activity:2};
 const timed=[...plans,...activities].filter(item=>isTime(item.time)).sort((a,b)=>a.time.localeCompare(b.time)||rank[a.type]-rank[b.type]||a.id.localeCompare(b.id));
 return {timed,unscheduledPlans:plans.filter(item=>!isTime(item.time)),untimedRecords:activities.filter(item=>!isTime(item.time))};
}
