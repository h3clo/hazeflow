import {taskMatches,sortTasks} from './domain.js';
import {isGoalTask} from './planning.js';
// Counts and rows must use the same list, including after its last task is deleted.
export function reminderListState(tasks,{scope='all',list='전체',today}={}){
 const reminders=tasks.filter(t=>!isGoalTask(t));
 const lists=[...new Set(reminders.map(t=>t.listName))];
 if(list!=='전체'&&!lists.includes(list))list='전체';
 const selected=reminders.filter(t=>list==='전체'||t.listName===list);
 const counts=Object.fromEntries(['all','today','scheduled','noDate','flagged','completed'].map(s=>[s,selected.filter(t=>taskMatches(t,s,today)).length]));
 return {list,lists,counts,items:sortTasks(selected.filter(t=>taskMatches(t,scope,today)))};
}
