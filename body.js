import {csvRows} from './csv.js';
import {isDate,todayKey} from './domain.js';
export const bodyFields=['weight','muscle','fat','fatPercent'];
export const bodyNames={weight:'체중 (kg)',muscle:'골격근량 (kg)',fat:'체지방량 (kg)',fatPercent:'체지방률 (%)'};
const aliases={date:'date',날짜:'date',측정일:'date',측정일자:'date',weight:'weight',체중:'weight',muscle:'muscle',골격근량:'muscle',fat:'fat',체지방량:'fat',fatpercent:'fatPercent',체지방률:'fatPercent'};

export function bodyCSVDate(raw){
 const value=raw.trim();
 if(/^\d{14}$/.test(value)){const time=value.slice(8);if(Number(time.slice(0,2))>23||Number(time.slice(2,4))>59||Number(time.slice(4,6))>59)return '';return value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)}
 if(/^\d{8}$/.test(value))return value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8);
 return value.replace(/[./]/g,'-');
}
export function parseBodyCSV(text,today=todayKey()){
 if(text.length>500000)throw Error('500KB 이하의 CSV를 사용해주세요.');const rows=csvRows(text.replace(/^\uFEFF/,''));if(rows.length<2)throw Error('제목 행과 측정값을 넣어주세요.');if(rows.length>1001)throw Error('한 번에 1,000개 날짜까지 가져올 수 있어요.');
 const headers=rows.shift().map(v=>Object.hasOwn(aliases,v.trim().toLowerCase().replace(/\s|\(.*?\)|%/g,''))?aliases[v.trim().toLowerCase().replace(/\s|\(.*?\)|%/g,'')]:undefined);if(!headers.includes('date')||!headers.some(h=>bodyFields.includes(h)))throw Error('날짜와 체중·골격근량·체지방량·체지방률 중 하나의 제목이 필요해요.');const known=headers.filter(Boolean);if(new Set(known).size!==known.length)throw Error('같은 항목의 열이 중복됐어요.');const dates=new Set();
 return rows.map((row,i)=>{const value={};headers.forEach((key,j)=>{if(key)value[key]=(row[j]||'').trim()});value.date=bodyCSVDate(value.date);if(!isDate(value.date)||value.date>today)throw Error(`${i+2}행: 측정일은 오늘 이전의 YYYY-MM-DD로 적어주세요.`);if(dates.has(value.date))throw Error(`${i+2}행: 같은 측정일이 중복됐어요.`);dates.add(value.date);let count=0;for(const key of bodyFields){if(!value[key]){delete value[key];continue}if(!/^\d+(?:\.\d+)?$/.test(value[key])||+value[key]<0||(key==='fatPercent'&&+value[key]>100))throw Error(`${i+2}행: ${bodyNames[key]} 숫자를 확인해주세요.`);value[key]=String(+value[key]);count++}if(!count)throw Error(`${i+2}행: 측정값이 비어 있어요.`);return value;}).sort((a,b)=>a.date.localeCompare(b.date));
}
export function mergeBodyRows(life,rows,overwrite=false){const result=structuredClone(life);for(const row of rows){const {date,...values}=row;result[date]??={};for(const key of bodyFields)if(values[key]!==undefined&&(overwrite||result[date][key]==null||result[date][key]===''))result[date][key]=values[key];}return result;}
export function bodyHistory(life,until=todayKey()){return Object.entries(life).filter(([date,row])=>date<=until&&bodyFields.some(k=>row[k]!==undefined&&row[k]!==''&&row[k]!==null)).sort(([a],[b])=>b.localeCompare(a)).map(([date,row])=>({date,...Object.fromEntries(bodyFields.map(k=>[k,row[k]??'']))}));}
