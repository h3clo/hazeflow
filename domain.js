import {validTaxPayment} from './tax-payments.js';
import {validTaxDocument} from './tax-documents.js';
import {validIncomeDocument} from './income-documents.js';
import {validSubject} from './study-subjects.js';
import {validStudy,studyMarkdown} from './study.js';
import {validNutrition,nutritionText} from './nutrition.js';
import {validWorkoutFeedback} from './workout-feedback.js';
import {validAsset} from './assets.js';
import {validMoney} from './money.js';
import {expenseForMeal} from './meal-money.js';
import {validPhotoRefs,photoMarkdown} from './photos.js';
export const weekdays = ['일','월','화','수','목','금','토'];
export const todayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const uid = () => typeof crypto.randomUUID==='function'?crypto.randomUUID():'record-'+[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
export const isDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T12:00:00')) && todayKey(new Date(s+'T12:00:00'))===s;
export const isTime = s => typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const emptyState = () => ({schemaVersion:2,events:[],tasks:[],routines:[],checks:{},diary:{},exercises:[],logs:[],life:{},routineTemplates:[],routineRuns:{},favorites:[],weeklyReviews:{},studySubjects:[]});
const clone = v => structuredClone(v);
export function migrate(input){
 const d={...emptyState(),...clone(input)};
 if(input.schemaVersion!==2){
  for(const r of d.routines){
   if(!d.routineTemplates.some(t=>t.id===r.id))d.routineTemplates.push({id:r.id,versions:[{effectiveFrom:r.createdOn||'1900-01-01',title:r.title,time:'',days:[0,1,2,3,4,5,6],steps:[{id:'legacy-'+r.id,title:r.title,minutes:0}],archived:!!r.archived}]});
  }
  for(const [key,checked] of Object.entries(d.checks)){
   if(!checked)continue;const date=key.slice(0,10),id=key.slice(10),t=d.routineTemplates.find(t=>t.id===id);if(!t||!isDate(date))continue;
   d.routineRuns[date]??={};if(!d.routineRuns[date][id]){const snap=clone(t.versions[0]);d.routineRuns[date][id]={snapshot:snap,checked:snap.steps.map(s=>s.id),status:'done',startedAt:null,endedAt:null};}
  }
 }
 if(input.schemaVersion!==2)for(const l of d.logs){if(!l.eventId||l.sourceId)continue;const e=d.events.find(e=>e.id===l.eventId);if(!e)continue;if(l.text===e.title+' 시작'){l.sourceId='event-start:'+e.id;e.actualStart=l.time||undefined;}if(l.text===e.title+' 완료'){l.sourceId='event-end:'+e.id;e.actualEnd=l.time||undefined;}}
 for(const t of d.tasks){
  if(t.dueDate===undefined)t.dueDate=t.date||null;
  t.dueTime??='';t.note??='';t.listName??='할 일';if(['미리알림','Reminder','reminder'].includes(t.listName))t.listName='할 일';t.flagged??=false;
  if(t.completedOn===undefined)t.completedOn=t.done?(t.date||null):null;
  t.date=t.dueDate;
 }
 delete d.photoData;d.schemaVersion=2;return d;
}
export function versionAt(template,date){return template.versions.filter(v=>v.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]}
export function routinesForDate(d,date){
 const dow=new Date(date+'T12:00:00').getDay(),runs=d.routineRuns[date]||{};
 const result=[];
 for(const template of d.routineTemplates){const run=runs[template.id],v=run?.snapshot||versionAt(template,date);if(v&&(run||(!v.archived&&v.days.includes(dow))))result.push({id:template.id,...clone(v),run:run||null});}
 return result.sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
export function setRoutineVersion(d,id,version){
 let t=d.routineTemplates.find(t=>t.id===id);if(!t){t={id,versions:[]};d.routineTemplates.push(t)}
 t.versions=t.versions.filter(v=>v.effectiveFrom!==version.effectiveFrom);t.versions.push(clone(version));
}
export function archiveRoutine(d,id,date,archived){
 const t=d.routineTemplates.find(t=>t.id===id);if(!t)throw Error('루틴을 찾을 수 없어요.');const v=versionAt(t,date)||t.versions.at(-1);
 if(archived)t.versions=t.versions.filter(v=>v.effectiveFrom<date);
 setRoutineVersion(d,id,{...v,effectiveFrom:date,archived});
}
export function routineAction(d,date,id,action,stepId=null,time=null){
 const routine=routinesForDate(d,date).find(r=>r.id===id);if(!routine)throw Error('이 날짜의 루틴을 찾을 수 없어요.');
 d.routineRuns[date]??={};let run=d.routineRuns[date][id];
 if(action==='reset'){delete d.routineRuns[date][id];if(!Object.keys(d.routineRuns[date]).length)delete d.routineRuns[date];syncLog(d,'routine:'+date+':'+id,null);return}
 if(!run){const {run:_,id:__,...snapshot}=routine;run={snapshot,checked:[],status:'pending',startedAt:null,endedAt:null};d.routineRuns[date][id]=run;}
 if(action==='start'){run.status='doing';run.startedAt??=time;run.endedAt=null;}
 if(action==='skip'){run.status='skipped';run.endedAt=null;}
 if(action==='done'){run.checked=run.snapshot.steps.map(s=>s.id);run.status='done';run.endedAt=time;}
 if(action==='step'){
  if(!run.snapshot.steps.some(s=>s.id===stepId))throw Error('단계를 찾을 수 없어요.');
  run.checked=run.checked.includes(stepId)?run.checked.filter(id=>id!==stepId):[...run.checked,stepId];
  run.status=run.checked.length===run.snapshot.steps.length?'done':run.checked.length?'doing':'pending';
  if(!run.checked.length)run.startedAt=null;else run.startedAt??=time;run.endedAt=run.status==='done'?time:null;
 }
 syncLog(d,'routine:'+date+':'+id,run.status==='done'?{date,time:run.endedAt||'',kind:'루틴',text:run.snapshot.title+' 완료'}:null);
}
export function syncLog(d,sourceId,record){
 const old=d.logs.find(l=>l.sourceId===sourceId);
 d.logs=d.logs.filter(l=>l.sourceId!==sourceId);
 if(record)d.logs.push({id:old?.id||uid(),...record,sourceId});
}
export function eventAction(d,id,action,time){
 const e=d.events.find(e=>e.id===id);if(!e)return;
 e.status=action;
 if(action==='planned'){delete e.actualStart;delete e.actualEnd;syncLog(d,'event-start:'+id,null);syncLog(d,'event-end:'+id,null);return}
 if(action==='doing'){e.actualStart??=time;syncLog(d,'event-start:'+id,{date:e.date,time:e.actualStart,kind:'일정',text:e.title+' 시작'});}
 if(action==='done'){e.actualEnd=time;syncLog(d,'event-end:'+id,{date:e.date,time,kind:'일정',text:e.title+' 완료'});}
}
export function workoutSummary(log){
 if(log.kind&&log.kind!=='운동')return '';
 if(String(log.text||'').includes('\n'))return String(log.text).split(/\r?\n/).map(text=>workoutSummary({...log,text})).filter(Boolean).join('\n');
 const text=String(log.text||'').trim(),m=text.match(/^(?:운동\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?$/);if(!m)return '';
 const [,name,a,b,c]=m,n=name.replace(/\s/g,'');
 if(n==='마이마운틴')return c?`${name} · 각도 ${a} · 속도 ${b} · ${c}분`:'';
 if(['러닝머신','런닝머신','천계','천국의계단'].includes(n))return c?'':`${name} · 속도 ${a} · ${b}분`;
 if(c&&(text.startsWith('운동 ')||log.kind==='운동'||/랫풀다운|풀업|로우|프레스|스쿼트|데드리프트|컬|익스텐션|레그|플라이|케이블/.test(n))&&+b>0&&+c>0&&Number.isInteger(+b)&&Number.isInteger(+c))return `${name} · ${a}kg × ${b}회 × ${c}세트`;
 return '';
}
export function inferKind(text,kind='일상'){if(kind!=='일상')return kind;if(workoutSummary({text}))return '운동';if(/^식사\s/.test(text))return '식사';return kind}
export function recordsForDate(d,date){
 return [...d.logs.filter(l=>l.date===date&&!l.asset&&!l.incomeDocument&&!l.taxDocument&&!l.taxPayment),...d.exercises.filter(e=>e.date===date).map(e=>({id:e.id,date:e.date,time:'',kind:'운동',text:`${e.name} · ${e.minutes}분${e.effort?' · '+e.effort:''}${e.note?'\n'+e.note:''}`,legacy:true}))].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
// Existing manual records also form activity intervals. Source logs and memos never interrupt them.
export function activityIntervals(d,now=new Date()){
 const records=d.logs.filter(l=>!l.sourceId&&!l.memo&&isDate(l.date)&&isTime(l.time)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.id.localeCompare(b.id));
 const result=new Map();
 records.forEach((l,i)=>{const start=new Date(l.date+'T'+l.time),next=records[i+1],explicit=isDate(l.endDate)&&isTime(l.endTime),end=explicit?new Date(l.endDate+'T'+l.endTime):next?new Date(next.date+'T'+next.time):null,ongoing=!end&&start<=now;
 result.set(l.id,{start,end,ongoing,automatic:!explicit,minutes:Math.max(0,Math.floor(((end||now)-start)/60000)),endDate:end?todayKey(end):'',endTime:end?String(end.getHours()).padStart(2,'0')+':'+String(end.getMinutes()).padStart(2,'0'):''});});
 return result;
}
export function activityEndForEdit(current,submitted,opened){
 if(submitted.mode==='memo')return {endDate:'',endTime:''};
 const clean=value=>value||'',changed=clean(submitted.endDate)!==clean(opened.endDate)||clean(submitted.endTime)!==clean(opened.endTime);
 const chosen=changed?submitted:current,endDate=clean(chosen.endDate),endTime=clean(chosen.endTime);
 if((endDate||endTime)&&(!isDate(endDate)||!isTime(endTime)||!isTime(submitted.time)||new Date(endDate+'T'+endTime)<new Date(submitted.date+'T'+submitted.time)))throw Error('다른 화면에서 저장한 종료 시간과 시작 시간이 맞지 않아요. 시작·종료 시간을 함께 확인해주세요.');
 return {endDate,endTime};
}
export function activityTimeLabel(l,interval){
 if(!interval)return l.time||'시간 미기록';
 const end=interval.end?(interval.endDate!==l.date?interval.endDate+' ':'')+interval.endTime:interval.ongoing?'진행 중':'시작 예정';
 return l.time+' ~ '+end+' · '+interval.minutes+'분';
}
export function recordedDates(d){return [...new Set([...d.events.map(x=>x.date),...d.tasks.flatMap(x=>[x.dueDate||x.date,x.completedOn]),...d.logs.map(x=>x.date),...d.exercises.map(x=>x.date),...Object.keys(d.diary),...Object.keys(d.life),...Object.keys(d.routineRuns)])].filter(isDate).sort()}
const plain = v => v&&typeof v==='object'&&!Array.isArray(v);
const safeId = v => typeof v==='string'&&!['__proto__','constructor','prototype'].includes(v)&&/^[-a-zA-Z0-9_]+$/.test(v);
const str = v => typeof v==='string';
function validVersion(v){return plain(v)&&(v.archived===undefined||typeof v.archived==='boolean')&&isDate(v.effectiveFrom)&&str(v.title)&&v.title.trim()&&(v.time===''||isTime(v.time))&&Array.isArray(v.days)&&v.days.length&&v.days.every(n=>Number.isInteger(n)&&n>=0&&n<=6)&&Array.isArray(v.steps)&&v.steps.length&&v.steps.every(s=>plain(s)&&safeId(s.id)&&str(s.title)&&s.title.trim()&&Number.isFinite(s.minutes)&&s.minutes>=0)}
export function validateBackup(v){
 if(!plain(v)||!['events','tasks','routines','logs','exercises','routineTemplates'].some(k=>Array.isArray(v[k])))throw Error('Haze Flow 백업 파일이 아니에요.');
 if(v.schemaVersion&&v.schemaVersion>2)throw Error('더 최신 버전에서 만든 백업이에요.');
 for(const key of ['events','tasks','routines','logs','exercises']){
  if(v[key]!==undefined&&!Array.isArray(v[key]))throw Error('기록 형식이 올바르지 않아요.');
  for(const x of v[key]||[]){if(!plain(x)||!safeId(x.id))throw Error('기록 식별자가 올바르지 않아요.');
   if(!['routines','tasks'].includes(key)&&!isDate(x.date))throw Error('기록 날짜가 올바르지 않아요.');
   if(['events','tasks','routines'].includes(key)&&!str(x.title))throw Error('제목이 없어요.');
   if(key==='tasks'&&(['note','listName'].some(k=>x[k]!==undefined&&!str(x[k]))||['flagged','done'].some(k=>x[k]!==undefined&&typeof x[k]!=='boolean')))throw Error('할 일 내용 형식을 확인해주세요.');
   if(key==='tasks'&&((x.dueDate===undefined?!isDate(x.date):x.dueDate!==null&&!isDate(x.dueDate))||(x.dueTime!==undefined&&x.dueTime!==''&&(!isTime(x.dueTime)||!x.dueDate))||(x.completedOn!=null&&!isDate(x.completedOn))))throw Error('할 일 날짜와 시간을 확인해주세요.');
   if(key==='events'&&(!isTime(x.start)||!isTime(x.end)||x.end<=x.start))throw Error('일정 시간이 올바르지 않아요.');
   if(key==='logs'&&((x.memo!==undefined&&typeof x.memo!=='boolean')||((x.endTime||x.endDate)&&(!isTime(x.time)||!isTime(x.endTime)||!isDate(x.endDate)||new Date(x.endDate+'T'+x.endTime)<new Date(x.date+'T'+x.time)))))throw Error('활동 종료 시간을 확인해주세요.');
   if(key==='logs'&&x.asset!==undefined&&(!validAsset(x.asset)||x.kind!=='자산'||!x.memo||x.money!==undefined))throw Error('자산 잔액 기록을 확인해주세요.');
   if(key==='logs'&&x.money!==undefined&&(!validMoney(x.money)||(!x.memo&&x.kind!=='식사')||(x.kind==='식사'&&x.money.type!=='expense')))throw Error('가계부 거래 형식을 확인해주세요.');
   if(key==='logs'&&x.expenseId!==undefined&&(x.kind!=='식사'||typeof x.expenseId!=='string'||!x.expenseId||x.expenseId.length>200||x.expenseId===x.id||x.money!==undefined))throw Error('식사와 지출 연결을 확인해주세요.');
   if(key==='logs'&&x.nutrition!==undefined&&(x.kind!=='식사'||!validNutrition(x.nutrition)))throw Error('식사 영양정보를 확인해주세요.');
   if(key==='logs'&&x.taxPayment!==undefined&&(x.kind!=='세금납부'||!x.memo||x.money!==undefined||!validTaxPayment(x.taxPayment)))throw Error('납부·환급 자료를 확인해주세요.');
   if(key==='logs'&&x.taxDocument!==undefined&&(x.kind!=='세금자료'||!x.memo||x.money!==undefined||!validTaxDocument(x.taxDocument)))throw Error('연간 소비·세금 자료를 확인해주세요.');
   if(key==='logs'&&x.incomeDocument!==undefined&&(x.kind!=='소득자료'||!x.memo||x.money!==undefined||!validIncomeDocument(x.incomeDocument)))throw Error('연간 소득 자료를 확인해주세요.');
   if(key==='logs'&&x.study!==undefined&&(x.kind!=='공부'||!validStudy(x.study)))throw Error('공부 기록의 과목·복습·링크 형식을 확인해주세요.');
   if(key==='logs'&&x.workoutFeedback!==undefined&&!validWorkoutFeedback(x.workoutFeedback))throw Error('운동 느낌 기록을 확인해주세요.');
   if(key==='logs'&&!validPhotoRefs(x.photos))throw Error('사진 정보를 확인해주세요.');
   if(key==='logs'&&(!(x.time===''||isTime(x.time))||!str(x.text)||!str(x.kind)))throw Error('활동 기록이 올바르지 않아요.');
   if(key==='exercises'&&(!str(x.name)||!Number.isFinite(+x.minutes)||+x.minutes<=0))throw Error('운동 기록이 올바르지 않아요.');
  }
 }
 for(const key of ['checks','diary','life'])if(v[key]!==undefined){if(!plain(v[key]))throw Error('저장 형식이 올바르지 않아요.');if(key==='checks'){if(Object.values(v[key]).some(x=>typeof x!=='boolean'))throw Error('체크 기록이 올바르지 않아요.')}else for(const [date,row]of Object.entries(v[key]))if(!isDate(date)||!plain(row)||Object.entries(row).some(([k,x])=>((key==='diary'&&k==='photos')||(key==='life'&&k==='bodyPhotos'))?!validPhotoRefs(x):x!==null&&!['string','number','boolean'].includes(typeof x)))throw Error('생활 기록이 올바르지 않아요.');}
 if(v.studySubjects!==undefined&&(!Array.isArray(v.studySubjects)||v.studySubjects.length>100||v.studySubjects.some(s=>!validSubject(s))||new Set(v.studySubjects.map(s=>s.id)).size!==v.studySubjects.length))throw Error('공부 과목 목록을 확인해주세요.');
 if(v.routineTemplates!==undefined){if(!Array.isArray(v.routineTemplates))throw Error('루틴 형식이 올바르지 않아요.');for(const t of v.routineTemplates)if(!plain(t)||!safeId(t.id)||!Array.isArray(t.versions)||!t.versions.length||!t.versions.every(validVersion))throw Error('루틴 설정이 올바르지 않아요.');}
 if(v.routineRuns!==undefined){if(!plain(v.routineRuns))throw Error('루틴 실행 기록이 올바르지 않아요.');for(const [date,runs]of Object.entries(v.routineRuns)){if(!isDate(date)||!plain(runs))throw Error('루틴 날짜가 올바르지 않아요.');for(const [id,r]of Object.entries(runs))if(!safeId(id)||!plain(r)||!validVersion(r.snapshot)||!Array.isArray(r.checked)||!r.checked.every(x=>r.snapshot.steps.some(s=>s.id===x))||!['pending','doing','done','skipped'].includes(r.status)||![r.startedAt,r.endedAt].every(x=>x==null||x===''||isTime(x)))throw Error('루틴 실행 내용이 올바르지 않아요.');}}
 if(v.favorites?.some?.(t=>t?.nutrition!==undefined&&(t.kind!=='식사'||!validNutrition(t.nutrition))))throw Error('즐겨찾기 영양정보를 확인해주세요.');
 if(v.favorites!==undefined){if(!Array.isArray(v.favorites)||v.favorites.some(t=>!plain(t)||!safeId(t.id)||!['식사','운동'].includes(t.kind)||!str(t.title)||!t.title.trim()||t.title.length>100||!str(t.text)||!t.text.trim()||t.text.length>5000))throw Error('즐겨찾기 형식을 확인해주세요.');}
 if(v.weeklyReviews!==undefined){if(!plain(v.weeklyReviews))throw Error('주간 회고 형식을 확인해주세요.');for(const [date,row]of Object.entries(v.weeklyReviews))if(!isDate(date)||new Date(date+'T12:00:00').getDay()!==1||!plain(row)||Object.entries(row).some(([k,x])=>!['remember','adjust','next'].includes(k)||!str(x)||x.length>5000))throw Error('주간 회고 내용을 확인해주세요.');}
 return migrate(v);
}
export function mergeBackup(current,incoming){
 const result=clone(current),source=validateBackup(incoming);
 for(const key of ['events','tasks','routines','logs','exercises','routineTemplates','favorites','studySubjects']){result[key]??=[];const ids=new Set(result[key].map(x=>x.id));result[key].push(...source[key].filter(x=>!ids.has(x.id)));}
 for(const key of ['checks','diary','life','weeklyReviews'])result[key]={...source[key],...result[key]};
 for(const [date,runs]of Object.entries(source.routineRuns))result.routineRuns[date]={...runs,...result.routineRuns[date]};
 return result;
}
export const lifeLabels={height:'키 (cm)',fitnessGoal:'운동 목표',bed:'취침',wake:'기상',sleep:'수면 만족도',energy:'기운',mood:'감정',stress:'스트레스',trigger:'마음에 남은 일',care:'나에게 필요한 것',breakfast:'아침',lunch:'점심',dinner:'저녁',snack:'간식',water:'물 (ml)',weight:'체중 (kg)',muscle:'골격근량 (kg)',fat:'체지방량 (kg)',fatPercent:'체지방률 (%)',condition:'컨디션',progress:'운동 변화',focus:'집중한 일',study:'집중 시간 (분)',next:'다음 행동',home:'살림',people:'관계',expense:'지출 (원)',other:'메모'};
export const recordKindLabel=kind=>['미리알림','Reminder','reminder','할 일'].includes(kind)?'할 일':kind;
export function dayDocument(d,date){
 const out=[`# ${date} · Haze Flow`,''],section=(name,rows)=>{if(rows.length)out.push(`## ${name}`,'',...rows,'')};
 section('일정 · 계획',d.events.filter(e=>e.date===date).sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`- ${e.start}–${e.end} ${e.title} (${({done:'완료',doing:'진행 중',skipped:'건너뜀'})[e.status]||'예정'})${e.actualStart?' · 실제 시작 '+e.actualStart:''}${e.actualEnd?' · 실제 완료 '+e.actualEnd:''}`));
 section('루틴 · 반복 계획과 실행',routinesForDate(d,date).map(r=>`### ${r.time||'시간 미정'} ${r.title} · ${({done:'완료',doing:'진행 중',skipped:'건너뜀'})[r.run?.status]||'아직 실행 기록 없음'}\n\n${r.steps.map(s=>`- [${r.run?.checked.includes(s.id)?'x':' '}] ${s.title}${s.minutes?' · '+s.minutes+'분':''}`).join('\n')}\n`));
 section('할 일',d.tasks.filter(t=>t.dueDate===date||t.completedOn===date).map(t=>`- [${t.done?'x':' '}] ${t.title}${t.dueTime?' · '+t.dueTime:''}${t.dueDate?' · 기한 '+t.dueDate:' · 기한 없음'}${t.note?'\n  '+t.note:''}`));
 section('실제 세금 납부·환급 자료',d.logs.filter(l=>l.date===date&&l.taxPayment).map(l=>'- '+l.text));
 section('등록한 연간 소비·세금 자료',d.logs.filter(l=>l.date===date&&l.taxDocument).map(l=>'- '+l.text));
 section('등록한 소득 자료 · 귀속연도는 본문 참고',d.logs.filter(l=>l.date===date&&l.incomeDocument).map(l=>'- '+l.text));
 section('자산 잔액 기록',d.logs.filter(l=>l.date===date&&l.asset).map(l=>'- '+l.text));
 section('실제 활동',recordsForDate(d,date).map(l=>`### ${activityTimeLabel(l,activityIntervals(d).get(l.id))} · ${recordKindLabel(l.kind)}\n\n${l.text}${l.kind==='식사'&&l.money?'\n\n식사 지출: '+l.money.amount.toLocaleString('ko-KR')+'원 · '+l.money.merchant+' · '+l.money.category+(l.money.payment?' · '+l.money.payment:'')+(l.money.splits?' · '+l.money.splits.map(s=>s.method+' '+s.amount+'원').join(' + '):''):''}${l.expenseId?'\n\n연결된 지출: '+(expenseForMeal(d.logs,l)?.money.merchant||'연결된 거래를 찾을 수 없음')+' · 가계부에서 한 번 집계':''}${l.study?'\n\n'+studyMarkdown(l,false,d):''}${l.nutrition?'\n\n영양정보: '+nutritionText(l.nutrition):''}${l.workoutFeedback?'\n\n운동 느낌: 자극 '+(l.workoutFeedback.muscles.join(' · ')||'미입력')+(l.workoutFeedback.effort?' · 힘듦 '+l.workoutFeedback.effort+'/5':'')+(l.workoutFeedback.soreness?' · 근육통 '+l.workoutFeedback.soreness:'')+(l.workoutFeedback.note?'\n'+l.workoutFeedback.note:''):''}${l.photos?.length?'\n\n'+photoMarkdown(l.photos):''}${workoutSummary(l)?'\n\n운동 정리: '+workoutSummary(l):''}\n`));
 if(d.life[date]?.bodyPhotos?.length)section('인바디 결과지',[photoMarkdown(d.life[date].bodyPhotos)]);
 section('생활 기록',Object.entries(d.life[date]||{}).filter(([k,v])=>k!=='bodyPhotos'&&v!==''&&v!=null).map(([k,v])=>`- ${lifeLabels[k]||k}: ${v}`));
 const diary=d.diary[date];if(diary){if(diary.closedDay)section('하루 마감',['마감 표시됨']);if(diary.tomorrow)section('내일 기억할 일',[diary.tomorrow]);section('일기',[diary.mood?'기분: '+({great:'좋았어',okay:'평온해',tired:'지쳤어',hard:'힘들었어'}[diary.mood]||diary.mood):'',diary.note||'',diary.entry||'',photoMarkdown(diary.photos)].filter(Boolean));}

 if(out.length===2)out.push('저장된 기록이 없어요.');return out.join('\n');
}

export function taskMatches(t,scope,day=todayKey()){
 if(scope==='completed')return !!t.done;
 if(t.done)return false;
 if(scope==='today')return !!t.dueDate&&t.dueDate<=day;
 if(scope==='scheduled')return !!t.dueDate;
 if(scope==='noDate')return !t.dueDate;
 if(scope==='flagged')return !!t.flagged;
 return true;
}
export function taskComplete(d,id,done,day,time){const t=d.tasks.find(t=>t.id===id);if(!t)return;t.done=done;t.completedOn=done?day:null;syncLog(d,'task:'+id,done?{date:day,time,kind:'미리알림',text:t.title+' 완료'}:null)}
export function sortTasks(tasks){return [...tasks].sort((a,b)=>Number(!!a.done)-Number(!!b.done)||(a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31')||(a.dueTime||'99:99').localeCompare(b.dueTime||'99:99')||Number(!!b.flagged)-Number(!!a.flagged))}

export function allDocument(d){const dates=recordedDates(d),undated=d.tasks.filter(t=>!t.dueDate);const sections=[];if(d.favorites.length)sections.push('# 식사·운동 즐겨찾기\n\n'+d.favorites.map(t=>`## ${t.kind} · ${t.title}\n\n${t.text}${t.nutrition?'\n\n'+nutritionText(t.nutrition):''}`).join('\n\n'));for(const [week,r]of Object.entries(d.weeklyReviews).sort(([a],[b])=>a.localeCompare(b)))sections.push(`# ${week} 주간 회고\n\n`+[['remember','기억할 것'],['adjust','바꾸고 싶은 것'],['next','다음 주 나에게']].filter(([k])=>r[k]).map(([k,title])=>`## ${title}\n\n${r[k]}`).join('\n\n'));if(undated.length)sections.push('# 기한 없는 할 일\n\n'+undated.map(t=>`- [${t.done?'x':' '}] ${t.title} · ${t.listName}${t.note?'\n  '+t.note:''}`).join('\n'));sections.push(...dates.map(k=>dayDocument(d,k)));return sections.length?sections.join('\n\n---\n\n'):'# Haze Flow\n\n저장된 기록이 없어요.'}
