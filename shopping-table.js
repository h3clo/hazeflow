import {shoppingCategorySuggestion} from './shopping-categories.js';
import {isDate,isTime} from './domain.js';
import {csvRows} from './csv.js';
import {validMoney,moneyText} from './money.js';
import {duplicateOrder,crossSourceOrderCandidates,shoppingOrderMatches,shoppingPlatforms} from './shopping-import.js';
export const shoppingColumns={time:['거래시간','결제시간','주문시간','시간','time','paymenttime','ordertime'],category:['카테고리','분류','지출분류','category'],platform:['쇼핑몰','플랫폼','구매처','platform','mall','market'],date:['결제일시','주문일시','날짜','주문일','주문일자','결제일','결제일자','구매일','date','orderdate','paymentdate'],amount:['결제금액','최종결제금액','실결제금액','총결제금액','총주문금액','승인금액','금액','amount','paidamount','paymentamount','totalpaid'],id:['주문번호','주문id','orderid','orderno','ordernumber'],item:['상품명','상품정보','주문상품','품명','구매상품','item','productname','title'],merchant:['거래처','상호명','판매처','판매자','가맹점명','merchant','seller'],payment:['결제수단','결제방법','payment','paymentmethod'],status:['상태','주문상태','결제상태','배송상태','status','orderstatus'],currency:['통화','currency'],basis:['금액근거','amountbasis']};
const compact=s=>String(s??'').trim().toLowerCase().replace(/[\s_\-()（）]/g,'');
export function shoppingGrid(text){if(text.length>2000000)throw Error('2MB 이하의 CSV/TSV를 사용해주세요.');const clean=text.replace(/^\uFEFF/,'');let quoted=false,tabs=0;for(let i=0;i<clean.length;i++){const c=clean[i];if(c==='"'){if(quoted&&clean[i+1]==='"')i++;else quoted=!quoted}else if(!quoted){if(c==='\t')tabs++;if(c==='\n'||c==='\r')break}}return csvRows(clean,tabs?'\t':',')}
export function detectShoppingColumns(headers){return Object.fromEntries(Object.entries(shoppingColumns).map(([key,aliases])=>[key,headers.findIndex(h=>aliases.some(a=>compact(a)===compact(h)))]))}
export function shoppingDate(value){let s=String(value??'').trim(),m=s.match(/^(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/);if(!m)m=s.match(/^(20\d{2})(\d{2})(\d{2})$/);const d=m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:'';return isDate(d)?d:''}
export function shoppingTime(value){const raw=String(value??'').trim();if(!raw)return '';const m=raw.match(/^(?:20\d{2}[.\/-]\s*\d{1,2}[.\/-]\s*\d{1,2}[ T]+)?(\d{1,2}):(\d{2})(?::\d{2})?$/);return m&&isTime(m[1].padStart(2,'0')+':'+m[2])?m[1].padStart(2,'0')+':'+m[2]:'';}
export function shoppingAmount(value){const s=String(value??'').trim().replace(/(?:KRW|₩|원)/gi,'').replace(/\s/g,'');if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(s))return null;const n=Number(s.replace(/,/g,''));return Number.isSafeInteger(n)&&n>0&&n<=1e12?n:null}
export function shoppingRowError(row,today){if(row.blocked)return '취소·반품·환불·미결제 상태로 제외';if(row.time&&!isTime(row.time))return '결제 시간 확인 필요';if(!isDate(row.date)||row.date>today)return '날짜 확인 필요';if(!validMoney(row.money))return '최종 결제금액·거래처 확인 필요';if(row.money.currency!=='KRW')return '원화만 지원';if(/[eE][+\-]?\d+$/.test(row.money.order.id))return '주문번호가 지수 형식이에요. 원문에서 확인 필요';return ''}
export function normalizeShoppingGrid(grid,mapping,platform,today){if(!shoppingPlatforms.includes(platform))throw Error('쇼핑몰을 선택해주세요.');if(grid.length<2||grid.length>5001)throw Error('열 제목과 최대 5,000행의 주문을 넣어주세요.');if(mapping.date<0||mapping.amount<0)throw Error('주문일과 결제금액 열을 지정해주세요.');const connected=Object.values(mapping).filter(v=>v>=0);if(connected.some(v=>!Number.isInteger(v)||v>=grid[0].length)||new Set(connected).size!==connected.length)throw Error('항목마다 서로 다른 열을 연결해주세요.');const at=(r,k)=>mapping[k]>=0?String(r[mapping[k]]??'').trim():'';
 const groups=new Map(),rows=[];
 for(const [i,raw]of grid.slice(1).entries()){if(!raw.some(v=>String(v??'').trim()))continue;const from=at(raw,'platform'),p=canonicalShoppingPlatform(from)||platform,status=at(raw,'status'),basis=at(raw,'basis'),id=at(raw,'id'),timeRaw=at(raw,'time')||(/[ T]\d{1,2}:\d{2}/.test(at(raw,'date'))?at(raw,'date'):''),item=at(raw,'item').slice(0,300),amount=shoppingAmount(at(raw,'amount')),row={source:i+2,date:shoppingDate(at(raw,'date')),...(shoppingTime(timeRaw)?{time:shoppingTime(timeRaw)}:{}),blocked:/취소|반품|환불|미결제|결제대기|입금대기|실패/.test(status),status,warning:from&&!canonicalShoppingPlatform(from)?'파일의 쇼핑몰 이름을 확인해주세요.':(/미확인|확인\s*(?:전|필요)|추정|예상/.test(basis+' '+status))?'주문 상태·금액 근거 확인 필요':basis&&!/결제합계|최종결제|실결제|확인/.test(basis)?'금액 근거 확인':'',money:{type:'expense',amount,currency:at(raw,'currency')||'KRW',merchant:(at(raw,'merchant')||p).slice(0,200),category:at(raw,'category')||shoppingCategorySuggestion({item}).category,payment:at(raw,'payment').slice(0,200),order:{platform:p,id:id.slice(0,100),item}}};
  if(timeRaw&&!shoppingTime(timeRaw))row.warning='결제 시간을 읽지 못했어요. 원문 확인 필요';if(!id&&!row.warning)row.warning='주문번호 없음 · 내용과 중복 확인 필요';const key=id?p+'|'+id:null,old=key&&groups.get(key);
  if(old){if(old.money.amount===row.money.amount&&old.date===row.date&&(old.time||'')===(row.time||'')&&old.money.merchant===row.money.merchant){old.money.order.item=[...new Set([old.money.order.item,item].filter(Boolean))].join(' / ').slice(0,300);old.blocked||=row.blocked;old.warning=old.warning||row.warning;continue}old.warning='conflicting-order-total';row.warning='conflicting-order-total';}
  rows.push(row);if(key&&!old)groups.set(key,row);
 }
 for(const row of rows){if(row.warning==='conflicting-order-total')row.warning='같은 주문번호의 금액이 달라요. 상품가/분할 결제인지 확인 필요';row.error=shoppingRowError(row,today);row.selected=!row.error&&!row.warning}
 return rows;
}
export function planShoppingRows(logs,rows,today){const accepted=[],skipped=[];for(const row of rows.filter(r=>r.selected)){const error=shoppingRowError(row,today);if(error)throw Error(`${row.source}행: ${error}`);const duplicate=duplicateOrder([...logs,...accepted],row.money,row.date);if(duplicate)skipped.push(row);else accepted.push({date:row.date,...(row.time?{time:row.time}:{}),money:row.money})}return {accepted,skipped}}

export function canonicalShoppingPlatform(value){const key=String(value||'').toLowerCase().replace(/\s/g,'');return ({'네이버':'네이버','네이버페이':'네이버',naver:'네이버',npay:'네이버','쿠팡':'쿠팡',coupang:'쿠팡','11번가':'11번가','11st':'11번가','지그재그':'지그재그',zigzag:'지그재그','지마켓':'G마켓','g마켓':'G마켓',gmarket:'G마켓','오늘의집':'오늘의집','오늘의집쇼핑':'오늘의집',ohouse:'오늘의집',ohou:'오늘의집','다이소':'다이소','아성다이소':'다이소',daiso:'다이소','기타쇼핑몰':'기타 쇼핑몰'})[key]||''}

export function findShoppingHeader(grid){let best=-1,index=0;for(const [i,row]of grid.slice(0,20).entries()){const m=detectShoppingColumns(row),score=(m.date>=0?5:0)+(m.amount>=0?5:0)+(m.id>=0?1:0)+(m.item>=0?1:0);if(score>best){best=score;index=i}}return index}
export function normalizeShoppingBatch(sources,platform,today){if(!sources.length||sources.length>20)throw Error('한 번에 최대 20개 파일을 선택해주세요.');const result=[];for(const source of sources){try{const header=findShoppingHeader(source.grid),grid=source.grid.slice(header);if(!grid.length||grid[0].length>100)throw Error('비어 있거나 100열을 넘는 표예요.');const mapping=detectShoppingColumns(grid[0]);if(mapping.date<0||mapping.amount<0)throw Error('주문일·결제금액 열을 찾지 못했어요. 이 파일만 열어 열을 직접 연결해주세요.');const rows=normalizeShoppingGrid(grid,mapping,platform,today);for(const row of rows){row.source+=header;row.sourceName=source.name}result.push(...rows);if(result.length>5000)throw Error('한 번에 최대 5,000개 주문까지 검토할 수 있어요. 파일을 나눠 가져와주세요.')}catch(error){throw Error(source.name+': '+error.message)}}const groups=new Map();for(const row of result){const id=row.money.order.id;if(!id)continue;const key=row.money.order.platform+'|'+id,previous=groups.get(key);if(previous&&(previous.money.amount!==row.money.amount||previous.date!==row.date||(previous.time||'')!==(row.time||''))){previous.warning=row.warning='파일 사이 같은 주문의 날짜·시간·금액이 달라요. 주문 상세 확인 필요';previous.selected=row.selected=false}if(!previous)groups.set(key,row)}return result}

// Compare only source facts. User classifications and curated item details survive refreshes.
export function shoppingRefreshReview(logs,row){
 const matches=row.money.order.id?logs.filter(l=>shoppingOrderMatches(l.money?.order,row.money.order)):[];
 if(matches.length>1)return {kind:'conflict',message:'기존 같은 주문이 여러 건이에요. 분할 결제·중복 기록 확인 필요'};
 const old=matches[0];
 if(!old){const candidates=crossSourceOrderCandidates(logs,row.money,row.date);if(!row.blocked&&candidates.length)return {kind:'possible-duplicate',message:'같은 날짜·금액의 '+candidates[0].money.order.platform+' 결제 '+candidates.length+'건이 있어요. 같은 구매인지 확인 후 선택해주세요.'};return {kind:row.blocked?'blocked':'new',message:row.blocked?'취소·환불 상태 · 결제 내역 확인 필요':'새 주문'};}
 if(row.blocked)return {kind:'refund',id:old.id,message:'기존 주문의 취소·환불 확인 필요 · 자동 차감하지 않아요'};
 if(row.time&&old.time&&row.time!==old.time)return {kind:'conflict',id:old.id,message:'기존 결제 시간과 달라요. 수동 기록을 유지하고 원문을 확인해주세요.'};
 const changes=[];
 if(row.time&&!old.time)changes.push('결제 시간 없음 → '+row.time);
 if(old.date!==row.date)changes.push(`주문일 ${old.date} → ${row.date}`);
 if(old.money.amount!==row.money.amount)changes.push(`결제금액 ${old.money.amount.toLocaleString('ko-KR')}원 → ${row.money.amount?.toLocaleString('ko-KR')??'미확인'}원`);
 if(changes.length)return {kind:'changed',id:old.id,before:JSON.stringify({date:old.date,time:old.time||'',money:old.money}),message:changes.join(' / ')};
 return {kind:'same',id:old.id,message:'이미 저장한 주문 · 날짜·금액 동일'};
}
export function applyShoppingRefresh(logs,patch){
 const old=logs.find(l=>l.id===patch.id);
 if(!old||JSON.stringify({date:old.date,time:old.time||'',money:old.money})!==patch.before)throw Error('기존 주문이 바뀌었어요. 파일을 다시 확인해주세요.');
 if(!shoppingOrderMatches(old.money.order,patch.money.order))throw Error('주문번호와 쇼핑몰을 확인해주세요.');
 if(!isDate(patch.date)||(patch.time&&!isTime(patch.time)))throw Error('날짜·결제 시간을 확인해주세요.');
 if(old.money.splits&&patch.money.amount!==old.money.amount)throw Error('복합 결제 주문은 기존 기록에서 결제수단별 금액을 먼저 확인해주세요.');
 if(!validMoney({...old.money,amount:patch.money.amount}))throw Error('상품별 금액 배분이 새 결제금액과 맞지 않아요. 기존 상품 정보를 먼저 확인해주세요.');
 const generated=old.text===moneyText(old.money);old.date=patch.date;old.money.amount=patch.money.amount;if(patch.time&&!old.time)old.time=patch.time;
 if(generated)old.text=moneyText(old.money);
 return old;
}
