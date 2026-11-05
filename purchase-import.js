import {validPurchaseItems} from './purchase-analysis.js';
const identity=p=>JSON.stringify([p.platform,p.orderId]);
export function parsePurchaseProposals(text){
 if(typeof text!=='string'||text.length>500000)throw Error('500KB 이하의 상품 정리 파일을 선택해주세요.');let data;try{data=JSON.parse(text)}catch{throw Error('상품 정리 JSON 파일을 읽지 못했어요.');}
 if(data?.type!=='hazeflow-purchase-proposals'||data.version!==1||!Array.isArray(data.proposals)||!data.proposals.length||data.proposals.length>500)throw Error('확인한 상품 정리 파일(최대 500건)이 필요해요.');
 const seen=new Set();for(const p of data.proposals){if(!p||!['id','date','platform','orderId','expectedOrderItem'].every(k=>typeof p[k]==='string'&&p[k].length<=300)||!p.id||!p.orderId||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isSafeInteger(p.expectedAmount)||p.expectedAmount<=0||!Array.isArray(p.items)||!p.items.length||!validPurchaseItems(p.items,p.expectedAmount))throw Error('상품별 수량·금액·원주문 정보가 올바르지 않아요.');const key=identity(p);if(seen.has(key))throw Error('같은 주문의 상품 정리가 중복되어 있어요.');seen.add(key);}
 return data.proposals;
}
export function planPurchaseProposals(logs,proposals){
 const byId=new Map(logs.map(l=>[l.id,l])),accepted=[],skipped=[];
 for(const p of proposals){const l=byId.get(p.id),m=l?.money;let reason='';
  if(!m||m.type!=='expense'||l.date!==p.date||m.amount!==p.expectedAmount||m.order?.platform!==p.platform||m.order?.id!==p.orderId||m.order?.item!==p.expectedOrderItem)reason='원주문이 없거나 날짜·금액·상품명이 바뀜';
  else if(m.order.items?.length)reason=JSON.stringify(m.order.items)===JSON.stringify(p.items)?'이미 반영됨':'기존 상품 정보 유지';
  else if(!validPurchaseItems(p.items,m.amount))reason='상품 금액·수량 확인 필요';
  if(reason)skipped.push({proposal:p,reason});else accepted.push(p);
 }return {accepted,skipped};
}
export function applyPurchaseProposals(logs,proposals){
 const plan=planPurchaseProposals(logs,proposals);for(const p of plan.accepted){const l=logs.find(l=>l.id===p.id);l.money.order.items=structuredClone(p.items);}return {changed:plan.accepted.length,skipped:plan.skipped.length};
}
export function openPurchaseImport({getLogs,isCurrent,onSave,esc}){
 const d=document.createElement('dialog');d.className='shopping-connect';let proposals=[];
 d.innerHTML=`<div class="modal-head"><h2>확인한 상품 정보 가져오기</h2><button type="button" data-close aria-label="상품 가져오기 닫기">×</button></div><p class="hint">원주문의 날짜·금액·상품명이 맞고, 아직 상품 정보를 정리하지 않은 거래만 반영해요. 거래 금액·사진·식사 연결은 유지해요. 포장 단위 ‘개’와 총 용량 g/ml/롤을 확인해주세요.</p><label>상품 정리 파일<input type="file" accept=".json,application/json" data-file></label><form><div data-preview></div><p class="error" role="alert"></p><button class="primary" disabled>선택한 상품 정보 반영</button></form>`;
 const preview=d.querySelector('[data-preview]'),error=d.querySelector('[role=alert]'),save=d.querySelector('.primary');
 d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();
 d.querySelector('[data-file]').onchange=async e=>{save.disabled=true;error.textContent='';proposals=[];preview.innerHTML='';try{const file=e.target.files[0];if(!file)return;if(file.size>500000)throw Error('500KB 이하의 파일을 선택해주세요.');const parsed=parsePurchaseProposals(await file.text());if(!d.open||e.target.files[0]!==file)return;if(!isCurrent())throw Error('계정이 바뀌었어요. 다시 열어주세요.');proposals=parsed;const plan=planPurchaseProposals(getLogs(),proposals);preview.innerHTML=`<p>반영 가능 ${plan.accepted.length}건 · 유지/보류 ${plan.skipped.length}건</p><div class="table-scroll"><table class="feature-table"><thead><tr><th>선택</th><th>주문</th><th>품목·총 수량</th><th>상품 금액</th></tr></thead><tbody>${plan.accepted.map(p=>`<tr><td><input type="checkbox" name="selected" value="${esc(identity(p))}" checked aria-label="${esc(p.orderId)} 상품 정보 반영"></td><td>${esc(p.date)}<br>${esc(p.platform)} · ${esc(p.orderId)}</td><td>${p.items.map(i=>`${esc(i.family)} · ${i.quantity.toLocaleString('ko-KR')} ${esc(i.unit)}<small>${esc(i.name)}</small>`).join('<br>')}${p.quantityBasis?`<small>${esc(p.quantityBasis)}</small>`:''}</td><td>${p.items.reduce((s,i)=>s+i.amount,0).toLocaleString('ko-KR')}원</td></tr>`).join('')}</tbody></table></div>${plan.skipped.length?`<details><summary>유지·보류 사유</summary>${plan.skipped.map(x=>`<p>${esc(x.proposal.orderId)} · ${esc(x.reason)}</p>`).join('')}</details>`:''}`;save.disabled=!plan.accepted.length;}catch(err){error.textContent=err.message;}};
 d.querySelector('form').onsubmit=e=>{e.preventDefault();try{if(!isCurrent())throw Error('계정이 바뀌었어요. 다시 열어주세요.');const keys=new Set(new FormData(e.target).getAll('selected')),selected=proposals.filter(p=>keys.has(identity(p)));if(!selected.length)throw Error('반영할 상품 정보를 선택해주세요.');if(onSave(selected)!==false)d.close();}catch(err){error.textContent=err.message;}};document.body.append(d);d.showModal();
}
