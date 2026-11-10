import {expect} from '@playwright/test';
import {emptyState} from '../domain.js';

export function namespaceFor(device){
 return 'hazeflow-qa-v2-device-'+device;
}

export function todayKey(d=new Date()){
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}

async function idbPut(page,key,json){
 await page.evaluate(async({key,json})=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('hazeflow-snapshots-v1',1);
   req.onupgradeneeded=()=>req.result.createObjectStore('records');
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('records','readwrite');
   const cur=tx.objectStore('records').get(key);
   cur.onsuccess=()=>{
    const version=(cur.result?.version||0)+1;
    tx.objectStore('records').put({version,value:json},key);
   };
   tx.oncomplete=()=>resolve();
   tx.onabort=()=>reject(tx.error||new Error('idb write failed'));
  });
  localStorage.setItem(key,'hazeflow-indexeddb-v1');
 },{key,json});
}

export async function readSandboxState(page,device){
 const key=namespaceFor(device);
 return page.evaluate(async key=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('hazeflow-snapshots-v1',1);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
  });
  const row=await new Promise((resolve,reject)=>{
   const tx=db.transaction('records','readonly');
   const r=tx.objectStore('records').get(key);
   r.onsuccess=()=>resolve(r.result);
   r.onerror=()=>reject(r.error);
  });
  if(!row?.value)return null;
  return JSON.parse(row.value);
 },key);
}

export async function readPrimaryId(page,device){
 const key=namespaceFor(device)+'-primary-activity';
 return page.evaluate(k=>localStorage.getItem(k),key);
}

export async function openSandbox(page,{device,design='classic',seed}={}){
 if(!device)throw new Error('sandbox device required');
 const ns=namespaceFor(device);
 // Relative query keeps GitHub Pages base path (/hazeflow/) intact — leading "/" would drop it.
 const path=`?sandbox&device=${encodeURIComponent(device)}`;
 await page.goto(path,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#app, main, [data-view], #capture-text, .life-capture',{timeout:30_000}).catch(()=>{});
 await page.waitForFunction(()=>document.querySelector('#capture-text')||document.querySelector('.life-capture')||document.querySelector('[data-act=focus-capture]'),null,{timeout:30_000});

 if(seed){
  const state={...emptyState(),...seed,schemaVersion:2,logs:seed.logs||[]};
  await idbPut(page,ns,JSON.stringify(state));
 }

 await page.evaluate(({ns,design})=>{
  localStorage.setItem(ns+'-ui-design',design==='life'?'life':'classic');
 },{ns,design});

 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#capture-text',{timeout:30_000});
 if(design==='life'){
  await expect(page.locator('html')).toHaveAttribute('data-ui-design','life');
 }else{
  await expect(page.locator('html')).toHaveAttribute('data-ui-design','classic');
 }
 await page.locator('#capture-text').scrollIntoViewIfNeeded();
 return ns;
}

export async function startActivity(page,text,{expectConfirm=false,endIds=[]}={}){
 await dismissEditorIfOpen(page);
 await page.locator('#capture-text').scrollIntoViewIfNeeded();
 await page.locator('#capture-text').fill(text);
 await page.locator('input[name="mode"][value="activity"]').check();
 await page.locator('form[data-form="capture"] .capture-submit, form[data-form="capture"] button[type="submit"]').first().click({force:false});

 const confirm=page.locator('form[data-form="capture-ongoing-confirm"]');
 if(expectConfirm){
  await expect(confirm).toBeVisible({timeout:10_000});
  for(const id of endIds){
   await confirm.locator(`input[name="endId"][value="${id}"]`).check();
  }
  await confirm.locator('button.primary').click();
  await expect(confirm).toBeHidden({timeout:10_000});
 }else{
  await expect(confirm).toBeHidden({timeout:2_000}).catch(()=>{});
  if(await confirm.isVisible().catch(()=>false)){
   throw new Error('Unexpected ongoing confirm dialog for: '+text);
  }
 }
 await expect(page.locator('#capture-text')).toHaveValue('',{timeout:10_000});
}

export async function openConfirmForActivity(page,text){
 await dismissEditorIfOpen(page);
 await page.locator('#capture-text').fill(text);
 await page.locator('input[name="mode"][value="activity"]').check();
 await page.locator('form[data-form="capture"] .capture-submit, form[data-form="capture"] button[type="submit"]').first().click();
 const confirm=page.locator('form[data-form="capture-ongoing-confirm"]');
 await expect(confirm).toBeVisible({timeout:10_000});
 return confirm;
}

export async function cancelEditor(page){
 const editor=page.locator('#editor');
 await editor.locator('[data-act="close-editor"]').click();
 await expect(editor).toBeHidden({timeout:5_000});
}

export async function dismissEditorIfOpen(page){
 const editor=page.locator('#editor');
 if(await editor.isVisible().catch(()=>false)){
  await editor.locator('[data-act="close-editor"]').click();
  await expect(editor).toBeHidden({timeout:5_000});
 }
}

export async function finishActivityByText(page,text){
 await dismissEditorIfOpen(page);
 const card=page.locator(`[data-activity-id]`).filter({hasText:text}).first();
 if(await card.locator('[data-act="finish-activity"]').count()){
  await card.locator('[data-act="finish-activity"]').click();
 }else{
  const id=await card.getAttribute('data-activity-id');
  if(id){
   const switchBtn=page.locator(`.ongoing-primary-btn[data-id="${id}"]`);
   if(await switchBtn.count())await switchBtn.click();
  }
  await page.locator('.ongoing-finish-bar [data-act="finish-activity"]').click();
 }
 // 공부 종료 시 복습 편집창이 열릴 수 있음 — 시나리오 검증용으로 닫아 기록 시간만 확인
 await page.waitForTimeout(400);
 await dismissEditorIfOpen(page);
}

export async function setPrimaryByText(page,text){
 const switchBtn=page.locator('.ongoing-primary-btn').filter({hasText:text.slice(0,10)});
 if(await switchBtn.count()){
  await switchBtn.first().click();
 }
 await expect(page.locator('.ongoing-finish-bar strong')).toContainText(text.slice(0,8));
}

export async function ongoingSnapshot(page,device){
 const state=await readSandboxState(page,device);
 const now=new Date();
 const ongoing=(state?.logs||[]).filter(l=>{
  if(l.memo||l.sourceId||!l.time)return false;
  if(l.endDate&&l.endTime)return false;
  return true;
 }).map(l=>({id:l.id,text:l.text,time:l.time,endDate:l.endDate||'',endTime:l.endTime||'',activityTiming:l.activityTiming||null,date:l.date}));
 const primary=await readPrimaryId(page,device);
 return {logs:state?.logs||[],ongoing,primary,now:now.toISOString()};
}

export function uniqueDevice(prefix){
 return `${prefix}-${Date.now().toString(36).slice(-6)}-${Math.random().toString(36).slice(2,6)}`.slice(0,30);
}
