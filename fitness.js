import {mixedWorkoutEnergy} from './workout-energy.js';
import {nutritionSummary} from './nutrition.js';
import {workoutSession} from './workout.js';
import {shiftDate} from './insights.js';
const muscles={랫풀다운:['등','이두'],시티드로우:['등','이두'],케이블로우:['등','이두'],바벨로우:['등','이두'],풀업:['등','이두'],어시스트풀업:['등','이두'],체스트프레스:['가슴','삼두'],벤치프레스:['가슴','삼두'],푸시업:['가슴','삼두'],펙덱플라이:['가슴'],숄더프레스:['어깨','삼두'],사이드레터럴레이즈:['어깨'],레터럴레이즈:['어깨'],스쿼트:['허벅지','둔근'],레그프레스:['허벅지','둔근'],레그익스텐션:['허벅지'],레그컬:['햄스트링'],힙쓰러스트:['둔근'],루마니안데드리프트:['햄스트링','둔근'],데드리프트:['둔근','등'],암컬:['이두'],바이셉컬:['이두'],트라이셉스푸시다운:['삼두'],크런치:['복부'],카프레이즈:['종아리'],힙어브덕션:['둔근'],힙어덕션:['내전근'],힙어드덕션:['내전근']};
export function exerciseMuscles(name){const key=String(name).replace(/\s/g,'');return muscles[key]||[]}
export function relatedExercises(name,limit=3){const key=String(name).replace(/\s/g,''),main=exerciseMuscles(name)[0];return main?Object.keys(muscles).filter(n=>n!==key&&muscles[n][0]===main).slice(0,limit):[]}
export function fitnessProfile(data,date){const result={};for(const [day,row]of Object.entries(data.life).filter(([day])=>day<=date).sort(([a],[b])=>a.localeCompare(b)))for(const key of ['height','weight','fitnessGoal']){if(key==='height'&&row[key]===''){delete result.height;continue}if(row[key]!==undefined&&row[key]!=='')result[key]={value:row[key],date:day}};return result}
export function strengthCalories(data,log){
 const session=workoutSession(log.text),profile=fitnessProfile(data,log.date).weight,weight=Number(profile?.value);
 if(!session.exercises.length)return {reason:'운동 종목과 시간 또는 세트를 입력하면 칼로리를 계산해요.'};
 if(!(weight>0&&weight<=500))return {reason:'운동일 기준 체중을 입력하면 칼로리를 추정할 수 있어요.',missing:'weight'};
 const elapsed=!log.memo&&log.time&&log.endDate&&log.endTime?(new Date(log.endDate+'T'+log.endTime)-new Date(log.date+'T'+log.time))/60000:null;
 if(elapsed!==null&&!(elapsed>0&&elapsed<=240))return {reason:'운동 시간을 1~240분 범위에서 확인해주세요.',missing:'time'};
 if(session.exercises.some(r=>r.type!=='strength')){const energy=mixedWorkoutEnergy({...session,knownStrengthKeys:new Set(session.exercises.filter(r=>r.type==='strength'&&exerciseMuscles(r.name).length).map(r=>r.key))},weight,elapsed);return energy.low===undefined?energy:{...energy,weight,weightDate:profile.date}}
 if(session.exercises.some(e=>e.kg<0||!exerciseMuscles(e.name).length))return {reason:'이 근력 종목의 계산 기준을 준비 중이에요.'};
 if(elapsed===null)return {reason:'시작·종료 시간을 입력하면 칼로리를 추정할 수 있어요.',missing:'time'};
 return {low:Math.round(3.5*weight*elapsed/60),high:Math.round(6*weight*elapsed/60),minutes:elapsed,weight,weightDate:profile.date};
}
export function fitnessPeriod(data,date){const start=shiftDate(date,-29),logs=data.logs.filter(l=>l.date>=start&&l.date<=date&&!l.sourceId),dates=[...new Set([...logs.filter(l=>['운동','식사'].includes(l.kind)).map(l=>l.date),...Object.keys(data.life).filter(k=>k>=start&&k<=date&&['weight','muscle','fatPercent'].some(f=>data.life[k][f]!==undefined&&data.life[k][f]!==''))])].sort();return {start,rows:dates.map(day=>{const workouts=logs.filter(l=>l.date===day&&l.kind==='운동'),meals=logs.filter(l=>l.date===day&&l.kind==='식사');return {date:day,workouts,meals,sets:workouts.reduce((n,l)=>n+workoutSession(l.text).sets,0),minutes:workouts.reduce((n,l)=>n+workoutSession(l.text).cardioMinutes,0),body:data.life[day]||{}}})}}

export function workoutElapsed(log,now=new Date()){if(!log.endDate||!log.endTime)return null;const hours=Math.floor((now-new Date(log.endDate+'T'+log.endTime))/3600000);return Number.isFinite(hours)&&hours>=0?hours:null}

// Compare completed measurement intervals; a weight-only profile is not an InBody test.
export function measurementReview(data,date){const number=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
 const healthApplied=new Map(data.logs.filter(l=>l.healthDaily).map(l=>[l.date,l.healthDaily]));
 const measurements=Object.entries(data.life).filter(([day,row])=>day<=date&&['muscle','fat','fatPercent'].some(k=>number(row[k])!==null&&!(healthApplied.get(day)?.bodyApplied?.includes(k)&&String(row[k])===String(healthApplied.get(day)?.body?.[k])))).sort(([a],[b])=>a.localeCompare(b));
 if(measurements.length<2)return null;
 const [from,a]=measurements.at(-2),[to,b]=measurements.at(-1),logs=data.logs.filter(l=>!l.sourceId&&l.date>from&&l.date<=to),workouts=logs.filter(l=>l.kind==='운동'),meals=logs.filter(l=>l.kind==='식사'),deltas=Object.fromEntries(['weight','muscle','fat','fatPercent'].map(k=>[k,number(a[k])!==null&&number(b[k])!==null?Math.round((Number(b[k])-Number(a[k]))*100)/100:null]));
 return {from,to,a,b,deltas,nutrition:nutritionSummary(meals),workoutDays:new Set(workouts.map(l=>l.date)).size,mealDays:new Set(meals.map(l=>l.date)).size,sessions:workouts.length,sets:workouts.reduce((n,l)=>n+workoutSession(l.text).sets,0),cardio:workouts.reduce((n,l)=>n+workoutSession(l.text).cardioMinutes,0),feedback:workouts.filter(l=>l.workoutFeedback).length};
}
