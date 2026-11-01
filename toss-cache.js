export function cachedPortfolio(record,now=Date.now()){
 if(!record?.payload)return {portfolio:null,eligible:false,history:[]};const p=record.payload;
 if(!Number.isSafeInteger(p.total)||p.total<0||typeof p.fetchedAt!=='string'||!Number.isFinite(Date.parse(p.fetchedAt))||Date.parse(p.fetchedAt)>now+300000)throw Error('토스 일별 자료를 확인할 수 없어요.');
 const history=(record.history||[]).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&Number.isSafeInteger(r.total)&&r.total>=0);
 return {portfolio:p,eligible:true,lastError:record.last_error||'',history};
}
