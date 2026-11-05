const moods={great:'좋았어',okay:'평온해',tired:'지쳤어',hard:'힘들었어'};
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('ko-KR');
export function searchDiaries(diary,{query='',date=''}={}){
 const tokens=normalize(query).trim().split(/\s+/).filter(Boolean);
 return Object.entries(diary).filter(([day,row])=>{
  if(!row||(!tokens.length&&date&&day!==date))return false;
  if(!row.note&&!row.entry&&!row.tomorrow&&!row.mood&&!row.photos?.length)return false;
  const text=normalize([day,row.note,row.entry,row.tomorrow,moods[row.mood]].join(' '));
  return tokens.every(token=>text.includes(token));
 }).sort(([a],[b])=>b.localeCompare(a)).map(([date,row])=>({...row,date}));
}
export function diaryExcerpt(row,query='',limit=240){
 const tokens=normalize(query).trim().split(/\s+/).filter(Boolean),fields=[row.note,row.entry,row.tomorrow].filter(Boolean);
 const text=fields.find(value=>tokens.some(token=>normalize(value).includes(token)))||fields[0]||moods[row.mood]||(row.photos?.length?'사진을 남긴 일기':'');
 const index=tokens.length?Math.max(0,...tokens.map(token=>normalize(text).indexOf(token)).filter(i=>i>=0)):0;
 const start=Math.max(0,index-50);return (start?'…':'')+text.slice(start,start+limit)+(text.length>start+limit?'…':'');
}
