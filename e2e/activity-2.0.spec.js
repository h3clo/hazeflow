import {test,expect} from '@playwright/test';
import {
 openSandbox,
 startActivity,
 openConfirmForActivity,
 cancelEditor,
 finishActivityByText,
 setPrimaryByText,
 ongoingSnapshot,
 readSandboxState,
 readPrimaryId,
 uniqueDevice,
 todayKey,
 namespaceFor
} from './helpers.js';

test.describe.configure({mode:'serial'});

// 일상으로 분류되는 문구만 사용(공부/운동 종료 편집창이 시나리오를 가리지 않게)
const A='활동A 빨래 개기';
const B='활동B 메일 확인';
const C='활동C 장보기 메모';

async function assertConcurrentAB(page,device){
 await startActivity(page,A);
 await startActivity(page,B,{expectConfirm:true,endIds:[]});
 const snap=await ongoingSnapshot(page,device);
 expect(snap.ongoing.map(o=>o.text).sort()).toEqual([A,B].sort());
 expect(snap.ongoing.every(o=>o.activityTiming==='independent')).toBeTruthy();
 await expect(page.locator('.ongoing-finish-bar .ongoing-count')).toContainText('진행 중 2개');
 return snap;
}

test('1-6 · concurrent / finish A / confirm / cancel / primary / reload',async({page})=>{
 const device=uniqueDevice('a20d');
 await openSandbox(page,{device,design:'classic'});

 // 1 concurrent
 await assertConcurrentAB(page,device);

 // 2 finish A only — B keeps going
 await finishActivityByText(page,A);
 await expect.poll(async()=>{
  const s=await ongoingSnapshot(page,device);
  return s.ongoing.map(o=>o.text);
 }).toEqual([B]);
 const afterFinish=await ongoingSnapshot(page,device);
 const b=afterFinish.logs.find(l=>l.text===B);
 expect(b.endDate||'').toBe('');
 expect(b.endTime||'').toBe('');
 const a=afterFinish.logs.find(l=>l.text===A);
 expect(a.endDate).toBeTruthy();
 expect(a.endTime).toBeTruthy();

 // 3 confirm dialog for C
 const confirm=await openConfirmForActivity(page,C);
 await expect(confirm.locator('.ongoing-confirm-row')).toHaveCount(1);
 await expect(confirm).toContainText(B);
 await expect(confirm).toContainText('종료');
 await expect(confirm.locator('button.primary')).toContainText('선택대로 새 활동 시작');

 // 4 cancel — no mutation
 const beforeCancel=await ongoingSnapshot(page,device);
 await cancelEditor(page);
 const afterCancel=await ongoingSnapshot(page,device);
 expect(afterCancel.ongoing.map(o=>o.text)).toEqual(beforeCancel.ongoing.map(o=>o.text));
 expect(afterCancel.logs.length).toBe(beforeCancel.logs.length);
 expect(afterCancel.logs.find(l=>l.text===C)).toBeFalsy();
 // reopen confirm then cancel again and ensure capture still works
 await openConfirmForActivity(page,C);
 await cancelEditor(page);
 await startActivity(page,C,{expectConfirm:true,endIds:[]});
 await expect.poll(async()=>(await ongoingSnapshot(page,device)).ongoing.map(o=>o.text).sort())
  .toEqual([B,C].sort());

 // 5 primary switch does not mutate times/status — switch to whichever is not yet primary
 const beforePrimary=await ongoingSnapshot(page,device);
 const fingerprint=beforePrimary.logs.map(l=>({id:l.id,text:l.text,time:l.time,endDate:l.endDate||'',endTime:l.endTime||'',activityTiming:l.activityTiming||null}));
 const switchLabel=await page.locator('.ongoing-primary-btn').first().innerText();
 const target=switchLabel.includes('활동C')?C:B;
 await setPrimaryByText(page,target);
 const afterPrimary=await ongoingSnapshot(page,device);
 expect(afterPrimary.logs.map(l=>({id:l.id,text:l.text,time:l.time,endDate:l.endDate||'',endTime:l.endTime||'',activityTiming:l.activityTiming||null}))).toEqual(fingerprint);
 const targetId=afterPrimary.ongoing.find(o=>o.text===target).id;
 expect(await readPrimaryId(page,device)).toBe(targetId);
 expect(afterPrimary.activityUi?.primaryActivityId).toBe(targetId);
 expect(afterPrimary.activityUi?.primaryUpdatedAt).toBeTruthy();
 await expect(page.locator('.ongoing-finish-bar strong')).toContainText(target.slice(0,8));

 // 6 reload keeps ongoing + primary (local cache + synced preferences row)
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#capture-text');
 const afterReload=await ongoingSnapshot(page,device);
 expect(afterReload.ongoing.map(o=>o.text).sort()).toEqual([B,C].sort());
 expect(await readPrimaryId(page,device)).toBe(targetId);
 expect(afterReload.activityUi?.primaryActivityId).toBe(targetId);
 await expect(page.locator('.ongoing-finish-bar strong')).toContainText(target.slice(0,8));
});

test('7 · Classic and Life parity for concurrent keep',async({page})=>{
 for(const design of ['classic','life']){
  const device=uniqueDevice(design==='life'?'a20l':'a20c');
  await openSandbox(page,{device,design});
  await startActivity(page,`${design} A`);
  await startActivity(page,`${design} B`,{expectConfirm:true,endIds:[]});
  const snap=await ongoingSnapshot(page,device);
  expect(snap.ongoing.map(o=>o.text).sort()).toEqual([`${design} A`,`${design} B`].sort());
  await expect(page.locator('.ongoing-finish-bar')).toBeVisible();
  const confirm=await openConfirmForActivity(page,`${design} C`);
  await expect(confirm.locator('.ongoing-confirm-row')).toHaveCount(2);
  await cancelEditor(page);
  expect((await ongoingSnapshot(page,device)).logs.filter(l=>l.text===`${design} C`).length).toBe(0);
 }
});

test('8 · mobile 375 capture / finish / scroll',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile-375','mobile project only');
 const device=uniqueDevice('a20m');
 await openSandbox(page,{device,design:'classic'});
 await page.setViewportSize({width:375,height:812});
 await page.locator('#capture-text').fill('모바일 활동 알파');
 await page.locator('input[name="mode"][value="activity"]').check();
 await page.locator('form[data-form="capture"] .capture-submit').first().click();
 await expect(page.locator('.ongoing-finish-bar')).toBeVisible();
 await page.locator('#capture-text').fill('모바일 활동 베타');
 await page.locator('input[name="mode"][value="activity"]').check();
 await page.locator('form[data-form="capture"] .capture-submit').first().click();
 await expect(page.locator('form[data-form="capture-ongoing-confirm"]')).toBeVisible();
 await page.locator('form[data-form="capture-ongoing-confirm"] button.primary').click();
 await expect(page.locator('.ongoing-count')).toContainText('2개');
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await page.locator('.ongoing-finish-bar [data-act="finish-activity"]').click();
 await expect.poll(async()=>(await ongoingSnapshot(page,device)).ongoing.length).toBe(1);
 const box=await page.locator('#capture-text').boundingBox();
 expect(box?.width||0).toBeGreaterThan(200);
});

test('9 · legacy time labels survive new independent starts',async({page})=>{
 const device=uniqueDevice('a20g');
 const day=todayKey();
 await openSandbox(page,{
  device,
  design:'classic',
  seed:{
   logs:[
    {id:'legacy-morning',date:day,time:'09:00',kind:'일상',text:'레거시 아침 산책'},
    {id:'legacy-next',date:day,time:'10:00',kind:'일상',text:'레거시 다음 업무'}
   ]
  }
 });
 // Legacy chain: morning ends at next start 10:00
 await expect(page.locator('[data-range-id="legacy-morning"], [data-activity-id="legacy-morning"] .activity-range').first()).toContainText('09:00');
 await expect(page.locator('[data-range-id="legacy-morning"], [data-activity-id="legacy-morning"] .activity-range').first()).toContainText('10:00');
 const before=await readSandboxState(page,device);
 // legacy-next is still ongoing → confirm appears; keep it so chain labels stay
 await startActivity(page,'신규 독립 활동',{expectConfirm:true,endIds:[]});
 await startActivity(page,'또 다른 독립',{expectConfirm:true,endIds:[]});
 const after=await readSandboxState(page,device);
 expect(after.logs.find(l=>l.id==='legacy-morning').endDate||'').toBe(before.logs.find(l=>l.id==='legacy-morning').endDate||'');
 expect(after.logs.find(l=>l.id==='legacy-morning').endTime||'').toBe(before.logs.find(l=>l.id==='legacy-morning').endTime||'');
 await expect(page.locator('[data-activity-id="legacy-morning"] .activity-range, [data-range-id="legacy-morning"]').first()).toContainText('09:00 ~ 10:00');
 const snap=await ongoingSnapshot(page,device);
 expect(snap.ongoing.some(o=>o.text==='신규 독립 활동')).toBeTruthy();
 expect(snap.ongoing.some(o=>o.text==='또 다른 독립')).toBeTruthy();
});

test('10 · local save / offline / online persistence without duplicate',async({page,context})=>{
 const device=uniqueDevice('a20o');
 await openSandbox(page,{device,design:'classic'});
 await startActivity(page,'오프라인 전 활동');
 await context.setOffline(true);
 await startActivity(page,'오프라인 중 활동',{expectConfirm:true,endIds:[]});
 let snap=await ongoingSnapshot(page,device);
 expect(snap.ongoing.map(o=>o.text).sort()).toEqual(['오프라인 전 활동','오프라인 중 활동'].sort());
 const ids=new Set(snap.logs.map(l=>l.id));
 expect(ids.size).toBe(snap.logs.length);
 await context.setOffline(false);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#capture-text');
 snap=await ongoingSnapshot(page,device);
 expect(snap.ongoing.map(o=>o.text).sort()).toEqual(['오프라인 전 활동','오프라인 중 활동'].sort());
 expect(new Set(snap.logs.map(l=>l.id)).size).toBe(snap.logs.length);
 expect(snap.logs.filter(l=>l.text==='오프라인 중 활동').length).toBe(1);
 // second tab same sandbox — concurrent write should not duplicate on reload
 const page2=await context.newPage();
 await openSandbox(page2,{device,design:'classic'});
 await startActivity(page2,'두 번째 탭 활동',{expectConfirm:true,endIds:[]});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#capture-text');
 snap=await ongoingSnapshot(page,device);
 const texts=snap.logs.map(l=>l.text);
 expect(texts.filter(t=>t==='두 번째 탭 활동').length).toBe(1);
 expect(new Set(snap.logs.map(l=>l.id)).size).toBe(snap.logs.length);
 await page2.close();
});

test('pages · sandbox smoke on deployed site when E2E_BASE_URL points to Pages',async({page,baseURL})=>{
 test.skip(!/github\.io\/hazeflow/i.test(String(baseURL||'')),'Pages URL only');
 const device=uniqueDevice('a20p');
 await openSandbox(page,{device,design:'classic'});
 await startActivity(page,'Pages 샌드박스 A');
 await startActivity(page,'Pages 샌드박스 B',{expectConfirm:true,endIds:[]});
 const snap=await ongoingSnapshot(page,device);
 expect(snap.ongoing.length).toBe(2);
 expect(namespaceFor(device).startsWith('hazeflow-qa-v2-device-')).toBeTruthy();
});
