export function conflictPreview(value,deleted=false){
 if(deleted)return '삭제된 기록';
 if(typeof value==='boolean')return String(value);
 if(value&&typeof value==='object'&&typeof value.kind==='string'&&typeof value.date==='string'){
  const lines=[value.text||value.kind,`분류: ${value.kind}`,`시작: ${value.date}${value.time?' '+value.time:' · 시간 없음'}`,value.memo?'기록 방식: 짧은 메모':`종료: ${value.endDate&&value.endTime?value.endDate+' '+value.endTime:'자동 종료 · 다음 활동 기준'}`];
  if(value.money)lines.push(`금액: ${value.money.amount.toLocaleString('ko-KR')}원 · ${value.money.category||'미분류'}`);
  if(value.photos?.length)lines.push(`사진: ${value.photos.length}장`);
  return lines.join('\n');
 }
 return value?.entry||value?.note||value?.text||value?.title||JSON.stringify(value,null,2);
}
