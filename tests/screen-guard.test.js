import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderedOriginal,originalAttribute,applyShownFlag,applyShownClose,draftContext,controlFromMarkup,applyShownEventAction,applyShownRoutineAction,shownStatusAttribute} from '../screen-guard.js';
import {setTaskFlag,emptyState,eventAction,routineAction,setRoutineVersion} from '../domain.js';
import {removeUnchangedItem} from '../record-edit.js';
import {toggleDiaryClosed,applyOpenedJournalDraft} from '../journal.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
test('화면 재그리기가 보류된 삭제 버튼은 갱신된 최신 기록을 지우지 않는다',()=>{const painted={id:'t',title:'예전'},live={id:'t',title:'최신'},html=`<button data-act="delete-task" data-id="t" ${originalAttribute(esc,painted)}></button>`,opened=renderedOriginal(controlFromMarkup(html),live),tasks=[live];assert.equal(opened.title,'예전');assert.throws(()=>removeUnchangedItem(tasks,'t',opened),/바뀐 기록/);assert.equal(tasks[0].title,'최신')});
test('중요 표시와 하루 마감은 화면에 보인 값의 반대로 저장하고 원격 값을 다시 뒤집지 않는다',()=>{const tasks=[{id:'t',title:'최신',flagged:true}];applyShownFlag(tasks,'t',controlFromMarkup('<button data-act="flag-task" aria-pressed="false"></button>'),setTaskFlag);assert.equal(tasks[0].flagged,true);assert.equal(tasks[0].title,'최신');const closed=applyShownClose({entry:'다른 화면',closedDay:true},controlFromMarkup('<button data-act="close-day" data-closed="0" data-existed="1"></button>'),toggleDiaryClosed);assert.equal(closed.closedDay,true);assert.equal(closed.entry,'다른 화면');assert.throws(()=>applyShownClose(undefined,controlFromMarkup('<button data-closed="0" data-existed="1"></button>'),toggleDiaryClosed),/삭제된 기록/)});
test('본문 없이 지워진 일기는 초안으로 다시 만들지 않는다',()=>{const ctx=draftContext(controlFromMarkup('<form data-entry="" data-existed="1"></form>'));assert.equal(ctx.existed,true);assert.throws(()=>applyOpenedJournalDraft(undefined,ctx.entry,'초안',false,ctx.existed),/삭제된 기록/);const kept=applyOpenedJournalDraft({note:'메모',photos:[{id:'p'}]},'','초안',false,true);assert.equal(kept.note,'메모');assert.equal(kept.photos[0].id,'p');assert.equal(applyOpenedJournalDraft(undefined,'','초안',false,false).entry,'초안')});
test('오래된 일정 시작 버튼은 이미 완료된 최신 상태를 덮지 않는다',()=>{
 const d=emptyState();
 d.events=[{id:'e',title:'공부',date:'2026-11-10',start:'09:00',end:'10:00',status:'done',actualStart:'09:05',actualEnd:'10:00'}];
 const before=structuredClone(d);
 const btn=controlFromMarkup(`<button data-act="event-doing" data-id="e" ${shownStatusAttribute('planned')}></button>`);
 assert.throws(()=>applyShownEventAction(d,'e',btn,'doing','09:10',eventAction),/일정이 바뀌었어요/);
 assert.deepEqual(d,before);
});
test('일정 실행은 화면 상태와 같을 때만 적용하고 이미 목표면 다시 쓰지 않는다',()=>{
 const d=emptyState();
 d.events=[{id:'e',title:'공부',date:'2026-11-10',start:'09:00',end:'10:00',status:'planned'}];
 applyShownEventAction(d,'e',controlFromMarkup(`<button ${shownStatusAttribute('planned')}></button>`),'doing','09:10',eventAction);
 assert.equal(d.events[0].status,'doing');
 assert.equal(d.events[0].actualStart,'09:10');
 const once=structuredClone(d);
 applyShownEventAction(d,'e',controlFromMarkup(`<button ${shownStatusAttribute('planned')}></button>`),'doing','09:99',eventAction);
 assert.deepEqual(d,once);
});
test('오래된 루틴 완료 버튼은 이미 건너뛴 최신 상태를 덮지 않는다',()=>{
 const d=emptyState();
 setRoutineVersion(d,'r',{effectiveFrom:'2026-11-01',title:'아침',time:'07:00',days:[0,1,2,3,4,5,6],steps:[{id:'s',title:'물',minutes:1}]});
 routineAction(d,'2026-11-10','r','skip');
 const before=structuredClone(d);
 assert.throws(()=>applyShownRoutineAction(d,'2026-11-10','r',controlFromMarkup(`<button ${shownStatusAttribute('pending')}></button>`),'done','07:20',routineAction),/루틴이 바뀌었어요/);
 assert.deepEqual(d,before);
});
test('루틴 실행은 화면 상태와 같을 때만 적용하고 이미 목표면 다시 쓰지 않는다',()=>{
 const d=emptyState();
 setRoutineVersion(d,'r',{effectiveFrom:'2026-11-01',title:'아침',time:'07:00',days:[0,1,2,3,4,5,6],steps:[{id:'s',title:'물',minutes:1}]});
 applyShownRoutineAction(d,'2026-11-10','r',controlFromMarkup(`<button ${shownStatusAttribute('pending')}></button>`),'start','07:05',routineAction);
 assert.equal(d.routineRuns['2026-11-10'].r.status,'doing');
 const once=structuredClone(d);
 applyShownRoutineAction(d,'2026-11-10','r',controlFromMarkup(`<button ${shownStatusAttribute('pending')}></button>`),'start','07:99',routineAction);
 assert.deepEqual(d,once);
});
test('일정·루틴 실행 버튼 마크업은 화면 상태를 싣는다',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.ok(source.includes('shownStatusAttribute(status)'));
 assert.ok(source.includes('applyShownEventAction('));
 assert.ok(source.includes('applyShownRoutineAction('));
});
