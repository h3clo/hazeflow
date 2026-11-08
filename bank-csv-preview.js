import {csvRows} from './csv.js';
import {moneyFingerprint} from './money.js';

/** Normalize header cell for synonym matching. */
function normalizeHeader(h){
 return String(h||'').trim().toLowerCase()
  .replace(/\s|\(.*?\)|\[.*?\]/g,'')
  .replace(/[_\-./]/g,'');
}

const HEADER_SYNONYMS={
 date:['날짜','거래일','이용일','승인일','결제일','거래일자','이용일자','date','tradedate','usedate'],
 merchant:['가맹점','이용가맹점','상호','상호명','거래처','가맹점명','적요','내용','사용처','merchant','store','description'],
 amount:['금액','거래금액','이용금액','승인금액','결제금액','청구금액','amount'],
 withdrawal:['출금','출금액','지급','지급액','debit','withdrawal'],
 deposit:['입금','입금액','수취','credit','deposit'],
 payment:['결제수단','카드','카드번호','결제','payment'],
 type:['유형','구분','거래구분','입출','type']
};

function mapHeader(label){
 const n=normalizeHeader(label);
 for(const [field,names] of Object.entries(HEADER_SYNONYMS)){
  if(names.some(name=>normalizeHeader(name)===n||n.includes(normalizeHeader(name))&&normalizeHeader(name).length>=2))return field;
 }
 return null;
}

function parseLooseDate(raw,today){
 const s=String(raw||'').trim();
 let m=s.match(/^(\d{4})[.\/\-년]\s*(\d{1,2})[.\/\-월]\s*(\d{1,2})/);
 if(!m)m=s.match(/^(\d{4})(\d{2})(\d{2})$/);
 if(!m)m=s.match(/^(\d{2})[.\/\-](\d{1,2})[.\/\-](\d{1,2})$/); // yy-m-d rare
 if(!m)return null;
 let y=+m[1],mo=+m[2],d=+m[3];
 if(String(m[1]).length===2)y=2000+y;
 const date=`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const dt=new Date(date+'T12:00:00');
 if(Number.isNaN(+dt)||dt.getFullYear()!==y||dt.getMonth()+1!==mo||dt.getDate()!==d)return null;
 if(today&&date>today)return null;
 return date;
}

function parseLooseAmount(raw){
 const s=String(raw||'').trim().replace(/원/g,'').replace(/,/g,'').replace(/\s/g,'');
 if(!s||s==='-'||s==='—')return null;
 const neg=/^\(.*\)$/.test(s)||s.startsWith('-');
 const n=Number(s.replace(/[()+\-]/g,''));
 if(!Number.isFinite(n)||!Number.isSafeInteger(Math.abs(n))||Math.abs(n)<=0||Math.abs(n)>1e12)return null;
 return neg?-Math.abs(n):Math.abs(n);
}

/**
 * Decode CSV bytes safely. Never throws on bad encoding — reports warning.
 * Prefer UTF-8 (with BOM). If many replacement chars, try euc-kr when available.
 */
export function decodeCsvBytes(buffer){
 const warnings=[];
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 let start=0;
 if(bytes.length>=3&&bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)start=3;
 const utf8=new TextDecoder('utf-8',{fatal:false}).decode(bytes.subarray(start));
 const bad=(utf8.match(/\uFFFD/g)||[]).length;
 if(bad===0)return {text:utf8,encoding:'utf-8',warnings};
 let euc='';
 try{
  euc=new TextDecoder('euc-kr',{fatal:false}).decode(bytes.subarray(start));
  const eucBad=(euc.match(/\uFFFD/g)||[]).length;
  if(eucBad<bad){
   warnings.push('UTF-8로 읽기 어려워 EUC-KR로 해석했어요. 미리보기만 하며 저장하지 않아요.');
   return {text:euc,encoding:'euc-kr',warnings};
  }
 }catch{/* decoder unavailable */}
 warnings.push('일부 글자를 읽지 못했어요. 인코딩을 UTF-8로 다시 저장한 뒤 확인해 주세요.');
 return {text:utf8,encoding:'utf-8',warnings};
}

export function decodeCsvText(text){
 if(typeof text!=='string')throw Error('CSV 텍스트가 아니에요.');
 return {text:text.replace(/^\uFEFF/,''),encoding:'utf-8',warnings:[]};
}

/**
 * Preview-only bank/card CSV parse. Does not write to app state.
 */
export function previewBankCsv(text,{today='',maxRows=500}={}){
 const warnings=[];
 if(typeof text!=='string')throw Error('CSV 내용을 확인해주세요.');
 if(text.length>500000)throw Error('500KB 이하의 CSV를 사용해주세요.');
 const body=text.replace(/^\uFEFF/,'');
 let rows;
 try{rows=csvRows(body)}catch(error){throw Error(error.message||'CSV 형식을 확인해주세요.')}
 if(rows.length<2)throw Error('열 제목과 거래 행이 필요해요.');
 if(rows.length-1>maxRows)warnings.push(`처음 ${maxRows}행만 미리 보여요.`);

 const headerCells=rows[0];
 const mapped=headerCells.map(mapHeader);
 const known=mapped.filter(Boolean);
 if(new Set(known.filter(k=>!['withdrawal','deposit'].includes(k))).size!==known.filter(k=>!['withdrawal','deposit'].includes(k)).length){
  // allow both withdrawal and deposit
 }
 const hasDate=known.includes('date');
 const hasMerchant=known.includes('merchant');
 const hasAmount=known.includes('amount')||known.includes('withdrawal')||known.includes('deposit');
 if(!hasDate||!hasMerchant||!hasAmount){
  throw Error('거래일(또는 이용일)·가맹점(또는 적요)·금액(또는 출금/입금) 열을 찾지 못했어요.');
 }

 const ignored=headerCells.filter((_,i)=>!mapped[i]).map(h=>h.trim()).filter(Boolean);
 if(ignored.length)warnings.push('인식하지 않은 열: '+ignored.slice(0,8).join(', ')+(ignored.length>8?' …':''));

 const transactions=[];
 const rowErrors=[];
 const limit=Math.min(rows.length-1,maxRows);
 for(let i=0;i<limit;i++){
  const row=rows[i+1];
  const v={};
  mapped.forEach((field,j)=>{if(field)v[field]=(row[j]??'').trim()});
  const date=parseLooseDate(v.date,today||undefined);
  let amount=null,type='expense';
  if(v.amount){
   const n=parseLooseAmount(v.amount);
   if(n==null){rowErrors.push({line:i+2,message:'금액을 확인해주세요.'});continue}
   amount=Math.abs(n);type=n<0?'income':'expense';
  }else{
   const out=v.withdrawal?parseLooseAmount(v.withdrawal):null;
   const inn=v.deposit?parseLooseAmount(v.deposit):null;
   if(out&&!inn){amount=Math.abs(out);type='expense'}
   else if(inn&&!out){amount=Math.abs(inn);type='income'}
   else if(out&&inn){rowErrors.push({line:i+2,message:'출금과 입금이 함께 있어 건너뛰었어요.'});continue}
   else {rowErrors.push({line:i+2,message:'금액 열을 확인해주세요.'});continue}
  }
  if(!date){rowErrors.push({line:i+2,message:'거래일을 확인해주세요.'});continue}
  const merchant=String(v.merchant||'').trim();
  if(!merchant){rowErrors.push({line:i+2,message:'가맹점/적요가 비어 있어요.'});continue}
  if(v.type){
   const t=({지출:'expense',출금:'expense',수입:'income',입금:'income',이체:'transfer',정산:'transfer'})[v.type];
   if(t)type=t;
  }
  transactions.push({
   date,type,merchant,amount,currency:'KRW',
   payment:v.payment||'',
   sourceLine:i+2
  });
 }

 return {
  previewOnly:true,
  headers:headerCells,
  mappedFields:mapped,
  ignored,
  warnings,
  rowErrors,
  transactions,
  counts:{rows:rows.length-1,shown:transactions.length,errors:rowErrors.length}
 };
}

/**
 * Compare preview rows to existing logs. Matches are candidates only — never auto-confirmed.
 */
export function bankCsvDuplicateCandidates(logs=[],transactions=[]){
 const moneyLogs=logs.filter(l=>l.money);
 const bySoft=new Map();
 for(const l of moneyLogs){
  const key=JSON.stringify([l.date,l.money.type,l.money.amount]);
  if(!bySoft.has(key))bySoft.set(key,[]);
  bySoft.get(key).push(l);
 }
 return transactions.map(tx=>{
  const soft=JSON.stringify([tx.date,tx.type,tx.amount]);
  const hits=bySoft.get(soft)||[];
  const exact=hits.filter(l=>moneyFingerprint(l)===moneyFingerprint({date:tx.date,money:{type:tx.type,merchant:tx.merchant,amount:tx.amount,currency:'KRW',category:'',payment:tx.payment||''}}));
  return {
   ...tx,
   candidate:'none',
   ...(hits.length?{candidate:exact.length?'exact-fingerprint':'same-day-amount',matches:hits.map(l=>({id:l.id,merchant:l.money.merchant,payment:l.money.payment||''}))}:{})
  };
 });
}

export function bankCsvPreviewHtml(preview,candidates,{esc}={esc:v=>String(v??'')}){
 const rows=candidates||preview.transactions.map(t=>({...t,candidate:'none'}));
 const candLabel={none:'—','exact-fingerprint':'지문 일치 후보','same-day-amount':'같은 날·금액 후보'};
 const warn=preview.warnings.map(w=>`<p class="hint">${esc(w)}</p>`).join('');
 const err=preview.rowErrors.length?`<p class="hint">읽지 못한 행 ${preview.rowErrors.length}건 · 예: ${esc(preview.rowErrors[0].line+'행 '+preview.rowErrors[0].message)}</p>`:'';
 return `${warn}${err}<p>미리보기 ${preview.counts.shown}건 · 원본 행 ${preview.counts.rows}건 · <strong>저장하지 않아요</strong></p>
<div class="table-scroll"><table class="feature-table"><thead><tr><th>날짜</th><th>유형</th><th>가맹점</th><th>금액</th><th>기존 기록 후보</th></tr></thead><tbody>
${rows.slice(0,40).map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${esc(r.merchant)}</td><td>${r.amount.toLocaleString('ko-KR')}</td><td>${esc(candLabel[r.candidate]||r.candidate)}${r.matches?.length?`<br><small>${esc(r.matches.map(m=>m.merchant).join(' · '))}</small>`:''}</td></tr>`).join('')}
</tbody></table></div>
${rows.length>40?'<p class="hint">처음 40건만 표시해요.</p>':''}
<p class="hint">중복은 확정하지 않았어요. 가져오기 버튼이 없으며 가계부·동기화 저장소에 쓰지 않아요.</p>`;
}
