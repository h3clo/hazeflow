import {recordsForDate,routinesForDate,lifeLabels} from './domain.js';
import {stable} from './sync-state.js';
export function journalDraft(d,date){
 const parts=[],records=recordsForDate(d,date),activities=records.filter(l=>(!l.money||l.kind==='식사')&&!l.sourceId),money=records.filter(l=>l.money),note=d.diary[date]?.note?.trim();
 if(activities.length)parts.push('오늘 남긴 활동\n'+activities.map(l=>`- ${l.time||'시간 미기록'} · ${l.kind}: ${l.text||'사진 기록'}${l.photos?.length?' (사진 '+l.photos.length+'장)':''}`).join('\n'));
 const events=d.events.filter(e=>e.date===date&&['doing','done'].includes(e.status));if(events.length)parts.push('실행한 일정\n'+events.map(e=>`- ${e.title} · ${e.status==='done'?'완료':'진행 중'}${e.actualStart?' · 시작 '+e.actualStart:''}${e.actualEnd?' · 종료 '+e.actualEnd:''}`).join('\n'));
 const routines=routinesForDate(d,date).filter(r=>r.run&&['doing','done'].includes(r.run.status));if(routines.length)parts.push('실행한 루틴\n'+routines.map(r=>`- ${r.title} · ${r.run.checked.length}/${r.steps.length}단계`).join('\n'));
 if(money.length){const total=type=>money.filter(l=>l.money.type===type).reduce((s,l)=>s+l.money.amount,0);parts.push(`오늘 기록한 돈\n- 지출 ${total('expense').toLocaleString('ko-KR')}원 · 수입 ${total('income').toLocaleString('ko-KR')}원 · 이체 ${total('transfer').toLocaleString('ko-KR')}원`)}
 const life=Object.entries(d.life[date]||{}).filter(([k,v])=>k!=='bodyPhotos'&&v!==''&&v!=null);if(life.length)parts.push('몸과 생활\n'+life.map(([k,v])=>`- ${lifeLabels[k]||k}: ${v}`).join('\n'));
 if(note)parts.push('오늘의 메모\n'+note);if(!parts.length)return '';
 let text=date+' 하루 기록\n\n'+parts.join('\n\n');if(text.length>18000)text=text.slice(0,17800)+'\n\n(기록이 많아 초안 일부만 담았어요. 원본 활동은 그대로 보관돼요.)';return text;
}
export function applyJournalDraft(existing,draft,replace=false){const value=draft.trim();if(!value)throw Error('초안 내용을 적어주세요.');if(value.length>20000)throw Error('초안은 20,000자 이내로 적어주세요.');if(replace||!existing?.trim())return value;if(existing.includes(value))return existing;return existing+'\n\n'+value;}
export function assertSameDiary(current,opened){if(stable(current??null)!==stable(opened??null))throw Error('다른 기기나 화면에서 바뀐 기록이에요. 입력 내용을 따로 보관한 뒤 편집창을 다시 열어주세요.');}
export function toggleDiaryClosed(day,opened){if(!day&&opened)throw Error('다른 화면에서 삭제된 기록이에요. 목록을 다시 확인해주세요.');return {...(day||{}),closedDay:!opened?.closedDay}}
export function applyOpenedJournalDraft(day,openedEntry,draft,replace=false){const current=day?.entry||'';if(current!==(openedEntry||''))throw Error('다른 기기나 화면에서 바뀐 기록이에요. 입력 내용을 따로 보관한 뒤 편집창을 다시 열어주세요.');return {...(day||{}),entry:applyJournalDraft(current,draft,replace)};}
