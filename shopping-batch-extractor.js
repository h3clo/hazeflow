import {parseOrderBlocks} from './shopping-extractor.js';
import {parseNaverProductDetails} from './naver-product-details.js';
import {suggestPurchase} from './purchase-analysis.js';

// Read-only GETs to order-detail links already collected from the owner's order list.
// Does not read cookies, evaluate page scripts, submit forms, or call payment endpoints.

export function batchOrderUrls(urls, max = 50){
 if(!Array.isArray(urls)||!urls.length)return [];
 const cleaned = [...new Set(urls.map(value=>{
  try{
   const u=new URL(value);
   if(u.protocol!=='https:'||!u.hostname.endsWith('pay.naver.com')||!/^\/order\/(?:status|detail)\/\d{12,30}$/.test(u.pathname)||[...u.searchParams.keys()].some(k=>k!=='returnUrl')||u.hash||u.username||u.password)return null;
   u.search='';return u.href;
  }catch{return null;}
 }).filter(Boolean))];
 return cleaned.slice(0, max);
}

export function findNaverOrderLinks(doc, excludedIds = []){
 if(!doc?.querySelectorAll)return [];
 const excluded = new Set(excludedIds.map(String));
 const links = [...doc.querySelectorAll('a[href*="/order/status/"], a[href*="/order/detail/"]')];
 const urls = [];
 const base = typeof location !== 'undefined' ? location.origin : 'https://orders.pay.naver.com';
 for(const a of links){
  try{
   const u = new URL(a.href, base);
   const id = u.pathname.split('/').filter(Boolean).at(-1);
   if(id && /^\d{12,30}$/.test(id) && !excluded.has(id)){
    urls.push(u.href);
   }
  }catch{}
 }
 return batchOrderUrls(urls, 50);
}

export function parseNaverDetailDoc(doc, orderId, orderDate){
 const scripts = doc.querySelectorAll('script,style,noscript,template');
 scripts.forEach(e=>e.remove());

 // Extract all text with line breaks preserved
 doc.querySelectorAll('div,p,tr,td,th,li,section,article,br,h1,h2,h3,h4,dt,dd').forEach(e=>{
  e.prepend(doc.createTextNode('\n'));
  e.append(doc.createTextNode('\n'));
 });
 const lines = doc.body.textContent.split('\n').map(x=>x.trim()).filter(Boolean);
 const fullText = lines.join('\n');

 // Extract payment amount (total)
 let total = 0;
 const totalMatch = fullText.match(/(?:최종\s*결제\s*금액|실\s*결제\s*금액|총\s*결제\s*금액|^결제\s*금액)[^\d\n]*([\d,]+)\s*원/m);
 if(totalMatch){
  total = Number(totalMatch[1].replaceAll(',', ''));
 }

 // Extract payment method
 let payment = '카드';
 const payMatch = fullText.match(/결제\s*(?:수단|방법)\s*[:：]?\s*([^\n]{2,30})/);
 if(payMatch){
  payment = payMatch[1].trim();
 }

 // Extract item names from titles / links
 const itemNames = [];
 const productLinks = doc.querySelectorAll('a[href*="/product/"], a[href*="/goods/"], .product_name, .item_name, [class*="product"] [class*="name"]');
 productLinks.forEach(el=>{
  const t = el.textContent.trim();
  if(t && t.length > 1 && !itemNames.includes(t)) itemNames.push(t);
 });

 const isCancelled = /취소\s*완료|환불\s*완료|반품\s*완료/.test(fullText);

 // Apply verified naver product detail parser
 const detailResult = parseNaverProductDetails({
  productText: fullText,
  paymentText: fullText,
  total,
  orderId,
  itemNames: itemNames.length ? itemNames : undefined,
  hasRefundSection: isCancelled
 });

 const date = orderDate || (orderId && /^20\d{6}/.test(orderId) ? orderId.slice(0,4)+'-'+orderId.slice(4,6)+'-'+orderId.slice(6,8) : '');

 return {
  orderId,
  date,
  platform: '네이버',
  total,
  payment,
  isCancelled,
  detailResult,
  fullText
 };
}

export function buildPurchaseProposal(parsedOrder){
 const {orderId, date, total, detailResult, isCancelled} = parsedOrder;
 if(!orderId || !date || !total || isCancelled || !detailResult?.items?.length){
  return null;
 }

 const items = detailResult.items.map(it=>{
  const sp = suggestPurchase(it.name);
  const family = sp.family || it.name.slice(0, 40).trim();
  const category = sp.category || '생활용품';
  const unit = sp.unit || '개';
  const quantity = sp.quantity || it.quantity || 1;
  return {
   name: it.name,
   family,
   category,
   quantity,
   unit,
   amount: it.amount
  };
 });

 const proposal = {
  id: orderId,
  date,
  platform: '네이버',
  orderId,
  expectedOrderItem: items[0]?.name || '주문 상품',
  expectedAmount: total,
  items
 };

 if(detailResult.shipping && detailResult.shipping > 0){
  proposal.charges = {shipping: detailResult.shipping};
 }

 return proposal;
}

export function buildPurchaseProposalsFile(proposals){
 return {
  type: 'hazeflow-purchase-proposals',
  version: 1,
  proposals: proposals.filter(Boolean)
 };
}

async function runOrderBatch(options = {}){
 if(!location.hostname.endsWith('pay.naver.com')){
  alert('네이버페이 내 결제/주문내역 화면(orders.pay.naver.com)에서 실행해주세요.');
  return;
 }

 const excluded = Array.isArray(options.excludedIds) ? options.excludedIds : [];
 let urls = Array.isArray(options.urls) && options.urls.length ? options.urls : [];

 if(!urls.length){
  const links = [...document.querySelectorAll('a[href*="/order/status/"], a[href*="/order/detail/"]')];
  const found = new Set();
  const exSet = new Set(excluded.map(String));
  for(const a of links){
   try{
    const u = new URL(a.href, location.origin);
    const id = u.pathname.split('/').filter(Boolean).at(-1);
    if(id && /^\d{12,30}$/.test(id) && !exSet.has(id)){
     u.search = '';
     found.add(u.href);
    }
   }catch{}
  }
  urls = [...found].slice(0, 50);
 }

 if(!urls.length){
  alert('화면에서 수집할 새로운 네이버 주문 상세 주소를 찾지 못했어요.\n이미 완료된 주문이거나, 주문내역 페이지에서 목록이 보이는 상태인지 확인해주세요.');
  return;
 }

 if(!confirm(`Haze Flow 네이버 일괄 수집: 화면에서 새 주문 ${urls.length}건을 발견했습니다.\n비밀번호·쿠키·개인주소는 일체 수집하지 않으며, 상품명·금액·배송비만 확인해 Haze Flow 가계부 등록 파일로 저장합니다. 진행할까요?`)){
  return;
 }

 document.querySelector('#hazeflow-order-batch')?.remove();
 const panel=document.createElement('section');
 panel.id='hazeflow-order-batch';
 panel.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;background:white;color:#1c2638;border:2px solid #476fde;border-radius:12px;padding:20px;max-width:440px;box-shadow:0 8px 40px rgba(0,0,0,0.25);font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

 const title=document.createElement('h3');
 title.style.cssText='margin:0 0 10px;font-size:16px;font-weight:bold;color:#1c2638';
 title.textContent='Haze Flow 네이버 주문 일괄 수집';
 panel.append(title);

 const status=document.createElement('p');
 status.setAttribute('role','status');
 status.style.margin='0 0 14px';
 panel.append(status);

 const stop=document.createElement('button');
 stop.textContent='수집 중단';
 stop.style.cssText='padding:6px 14px;background:#e2e8f0;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;margin-right:8px';
 panel.append(stop);
 document.body.append(panel);

 let stopped=false;
 stop.onclick=()=>{stopped=true;stop.disabled=true;};

 const csvRows=[];
 const validProposals=[];
 let ok=0, failed=0;

 for(const [index, url] of urls.entries()){
  if(stopped) break;
  status.textContent=`주문 상세 수집 중 (${index+1} / ${urls.length})...`;
  const id=new URL(url).pathname.split('/').at(-1);
  const expected=id.slice(0,4)+'-'+id.slice(4,6)+'-'+id.slice(6,8);

  try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(), 10000);
   let response;
   try{
    response=await fetch(url,{method:'GET',credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal});
   }finally{
    clearTimeout(timer);
   }

   if(!response.ok) throw Error('상세 응답 오류');
   const html=await response.text();
   if(html.length>5000000) throw Error('상세 크기 초과');
   const doc=new DOMParser().parseFromString(html,'text/html');

   // Extract using detail parser logic
   doc.querySelectorAll('script,style,noscript,template').forEach(e=>e.remove());
   const fullText = doc.body.textContent.split('\n').map(x=>x.trim()).filter(Boolean).join('\n');

   // Summary total
   const totalMatch = fullText.match(/(?:최종\s*결제\s*금액|실\s*결제\s*금액|총\s*결제\s*금액|^결제\s*금액)[^\d\n]*([\d,]+)\s*원/m);
   const total = totalMatch ? Number(totalMatch[1].replaceAll(',','')) : 0;

   // Payment method
   const payMatch = fullText.match(/결제\s*(?:수단|방법)\s*[:：]?\s*([^\n]{2,30})/);
   const payment = payMatch ? payMatch[1].trim() : '카드';

   // Item name
   const firstItem = doc.querySelector('a[href*="/product/"], a[href*="/goods/"], .product_name, .item_name')?.textContent?.trim() || '상품';

   const isCancelled = /취소\s*완료|환불\s*완료|반품\s*완료/.test(fullText);

   if(!total) throw Error('결제합계 확인 필요');

   const statusText = isCancelled ? '취소/환불 완료' : '정상 결제';
   csvRows.push([expected, '네이버', id, firstItem, String(total), payment, statusText, '상세 확인', 'KRW', url]);

   // Check if proposals can be built
   const p = {
    id,
    date: expected,
    platform: '네이버',
    orderId: id,
    expectedOrderItem: firstItem,
    expectedAmount: total,
    items: [{
     name: firstItem,
     family: firstItem.slice(0, 40),
     category: '생활용품',
     quantity: 1,
     unit: '개',
     amount: total
    }]
   };
   if(!isCancelled){
    validProposals.push(p);
   }
   ok++;
  }catch(error){
   failed++;
   csvRows.push([expected, '네이버', id, '', '', '', '상세 확인 필요', '확인 필요 · '+error.message, 'KRW', url]);
  }
  await new Promise(resolve=>setTimeout(resolve, 350));
 }

 status.textContent=`수집 완료! 총 ${urls.length}건 중 확인 ${ok}건, 추가확인 필요 ${failed}건`;
 stop.remove();

 // Button 1: Download proposals JSON (directly importable into Haze Flow)
 if(validProposals.length){
  const jsonBtn=document.createElement('button');
  jsonBtn.textContent='① Haze Flow 등록 JSON 다운로드';
  jsonBtn.style.cssText='display:block;width:100%;padding:9px;background:#476fde;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-bottom:8px';
  jsonBtn.onclick=()=>{
   const fileData = {
    type: 'hazeflow-purchase-proposals',
    version: 1,
    proposals: validProposals
   };
   const blob=new Blob([JSON.stringify(fileData, null, 2)],{type:'application/json;charset=utf-8'});
   const link=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=link;
   a.download='hazeflow-네이버-상품정리-'+new Date().toISOString().slice(0,10)+'.json';
   panel.append(a);
   a.click();
   a.remove();
   setTimeout(()=>URL.revokeObjectURL(link),30000);
  };
  panel.append(jsonBtn);
 }

 // Button 2: Download CSV
 const csvBtn=document.createElement('button');
 csvBtn.textContent='② 전체 내역 CSV 다운로드';
 csvBtn.style.cssText='display:block;width:100%;padding:8px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;margin-bottom:8px';
 csvBtn.onclick=()=>{
  const quote=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'"+'$&').replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[['주문일','쇼핑몰','주문번호','상품명','결제금액','결제수단','상태','금액근거','통화','주문상세주소'],...csvRows].map(r=>r.map(quote).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const link=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=link;
  a.download='hazeflow-네이버-주문목록-'+new Date().toISOString().slice(0,10)+'.csv';
  panel.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(link),30000);
 };
 panel.append(csvBtn);

 const closeBtn=document.createElement('button');
 closeBtn.textContent='닫기';
 closeBtn.style.cssText='display:block;width:100%;padding:6px;background:transparent;color:#64748b;border:none;cursor:pointer;margin-top:4px';
 closeBtn.onclick=()=>panel.remove();
 panel.append(closeBtn);
}

export function shoppingBatchBookmarklet(urls = [], options = {}){
 const opts = {urls: batchOrderUrls(urls), excludedIds: options.excludedIds || []};
 return 'javascript:'+encodeURIComponent('void ('+runOrderBatch.toString()+')('+JSON.stringify(opts)+')');
}
