import {SaxesParser} from 'saxes';
import {createHealthCollector} from './apple-health.js';
export function createHealthXMLParser(progress=()=>{}){const collector=createHealthCollector(),parser=new SaxesParser({xmlns:false});let current=null,rootSeen=false;
 parser.on('opentag',tag=>{const a=tag.attributes;if(tag.name==='HealthData')rootSeen=true;if(tag.name==='Record'){collector.record(a);if(collector.records%10000===0)progress(collector.records)}else if(tag.name==='ActivitySummary')collector.activitySummary(a);else if(tag.name==='Workout')current={a,stats:[]};else if(tag.name==='WorkoutStatistics'&&current)current.stats.push(a)});
 parser.on('closetag',tag=>{if(tag.name==='Workout'&&current){collector.workout(current.a,current.stats);current=null}});parser.on('error',error=>{throw error});
 return {write:text=>parser.write(text),finish(){parser.close();if(!rootSeen)throw Error('Apple 건강 내보내기 XML이 아니에요.');return collector.finish()}};
}
