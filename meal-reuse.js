import {nutritionValues,nutritionKeys} from './nutrition.js';
export function recentMeals(logs,date,limit=6){
 const seen=new Set();return logs.filter(l=>l.kind==='식사'&&!l.sourceId&&l.date<=date&&l.text?.trim()).sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||''))||b.id.localeCompare(a.id)).filter(l=>{const key=JSON.stringify([l.text.trim(),nutritionKeys.map(k=>l.nutrition?.[k]??null)]);if(seen.has(key))return false;seen.add(key);return true}).slice(0,limit);
}
export function reuseMealDraft(draft,meal){
 if(!meal||meal.kind!=='식사'||meal.sourceId||!meal.text?.trim())throw Error('불러올 식사 기록이 바뀌었어요. 목록을 다시 확인해주세요.');
 if(draft.text?.trim()||draft.photos?.length||String(draft.mealAmount??'').trim()||nutritionKeys.some(k=>String(draft['meal'+k]??'').trim()))throw Error('작성 중인 내용을 먼저 기록하거나 비운 뒤 불러와주세요.');
 return {...draft,kind:'식사',text:meal.text,...nutritionValues(meal.nutrition)};
}
