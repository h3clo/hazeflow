export const todayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const isDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T12:00:00')) && todayKey(new Date(s+'T12:00:00'))===s;
export const isTime = s => typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
