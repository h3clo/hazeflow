/**
 * Bulk paste helper for dated tasks: lines like `YYYY-MM-DD title`.
 * Pure functions only — never logs task titles/notes.
 */
import {isDate} from './domain-time.js';

const LINE_RE = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/;
const MAX_LINES = 200;
const MAX_TITLE = 200;

export function parseTaskBulkText(raw){
  const text=typeof raw==='string'?raw:'';
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  if(lines.length>MAX_LINES)return {ok:false,error:'한 번에 너무 많아요. 200줄 이하로 나눠 주세요.',rows:[],skipped:0,invalid:[]};
  const rows=[],invalid=[],seen=new Set();
  let skipped=0;
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line){skipped++;continue}
    const m=line.match(LINE_RE);
    if(!m||!isDate(m[1])){
      invalid.push({line:i+1,reason:'날짜 형식'});
      continue;
    }
    const title=m[2].trim().replace(/\s+/g,' ');
    if(!title||title.length>MAX_TITLE){
      invalid.push({line:i+1,reason:'제목'});
      continue;
    }
    const key=m[1]+'\0'+title;
    if(seen.has(key)){skipped++;continue}
    seen.add(key);
    rows.push({dueDate:m[1],title});
  }
  if(!rows.length&&!invalid.length)return {ok:false,error:'날짜와 할 일 내용이 있는 줄을 넣어 주세요.',rows:[],skipped,invalid};
  if(!rows.length)return {ok:false,error:'올바른 줄이 없어요. YYYY-MM-DD 제목 형식을 확인해 주세요.',rows:[],skipped,invalid};
  return {ok:true,error:'',rows,skipped,invalid};
}

/** Same goal if same dueDate + title (existing or within batch). */
export function taskBulkDuplicateKey(task){
  return `${task?.dueDate||''}\0${String(task?.title||'').trim()}`;
}

export function planTaskBulkImport(existingTasks,rows){
  const have=new Set((Array.isArray(existingTasks)?existingTasks:[]).map(taskBulkDuplicateKey));
  const accepted=[],duplicates=[];
  for(const row of rows||[]){
    const key=taskBulkDuplicateKey(row);
    if(have.has(key)){duplicates.push(row);continue}
    have.add(key);
    accepted.push(row);
  }
  return {accepted,duplicates};
}

export function taskFromBulkRow(row,{id,listName='할 일',createdOn}={}){
  const dueDate=row.dueDate;
  return {
    id,
    title:row.title,
    note:'',
    listName,
    dueDate,
    dueTime:'',
    date:dueDate,
    flagged:false,
    done:false,
    createdOn:createdOn||dueDate,
    completedOn:null,
  };
}

/** Apply accepted rows onto state.tasks; returns counts only (no titles). */
export function applyTaskBulkImport(state,accepted,{uid,listName='할 일',createdOn}={}){
  if(!state||!Array.isArray(state.tasks))throw Error('할 일 저장 구조가 없어요.');
  const makeId=typeof uid==='function'?uid:()=>crypto.randomUUID();
  let added=0;
  for(const row of accepted||[]){
    state.tasks.push(taskFromBulkRow(row,{id:makeId(),listName,createdOn:createdOn||row.dueDate}));
    added++;
  }
  return {added};
}

/** Preview rows for UI — caller must escape HTML. Never logs. */
export function formatTaskBulkPreview(rows,limit=40){
  const list=Array.isArray(rows)?rows:[];
  return list.slice(0,limit).map(r=>({dueDate:r.dueDate,title:r.title}));
}
