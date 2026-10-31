// A monitor view of existing reminders, without creating a second task store.
export function whiteboardTasks(tasks,today,scope='today'){return tasks.filter(t=>!t.done&&(scope==='all'||!t.dueDate||t.dueDate<=today)).sort((a,b)=>Number(b.flagged)-Number(a.flagged)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||(a.dueTime||'').localeCompare(b.dueTime||'')||a.title.localeCompare(b.title));}
