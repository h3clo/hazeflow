export const nutritionKeys=['kcal','protein','carbs','fat'];
export const nutritionNames={kcal:'열량 (kcal)',protein:'단백질 (g)',carbs:'탄수화물 (g)',fat:'지방 (g)'};
export function validNutrition(n){return n===undefined||!!n&&typeof n==='object'&&!Array.isArray(n)&&Object.keys(n).length>0&&Object.keys(n).every(k=>nutritionKeys.includes(k))&&Object.entries(n).every(([k,v])=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=(k==='kcal'?20000:3000))}
export function readNutrition(v){const n={};for(const k of nutritionKeys){const raw=v['meal'+k];if(raw!==undefined&&String(raw).trim()!=='')n[k]=Number(raw)}if(!Object.keys(n).length)return undefined;if(!validNutrition(n))throw Error('영양정보는 0 이상의 숫자로 입력해주세요. 열량은 20,000kcal, 영양소는 3,000g까지 입력할 수 있어요.');return n}
export function nutritionValues(n={}){return Object.fromEntries(nutritionKeys.map(k=>['meal'+k,n[k]??'']))}
export function nutritionText(n){return n?nutritionKeys.filter(k=>n[k]!==undefined).map(k=>nutritionNames[k].split(' ')[0]+' '+n[k]+(k==='kcal'?'kcal':'g')).join(' · '):''}
export function nutritionFields(n={},esc){return `<details class="nutrition-fields" ${Object.values(n).some(v=>v!==''&&v!==undefined)?'open':''}><summary>영양정보 (선택 · 이번에 먹은 양 기준)</summary><p class="hint">포장지·식품 정보에서 확인한 값을 적어요. 음식 이름만으로 추측하지 않으며, 즐겨찾기에 저장하면 다음에도 불러올 수 있어요.</p><details><summary>제품 영양정보 붙여넣기</summary><label>포장지·제품 설명의 영양정보<textarea data-nutrition-label rows="3" maxlength="10000" placeholder="열량 200kcal 단백질 15g 탄수화물 20g 지방 6g"></textarea></label><p class="hint">한 기준(1회분 또는 총 내용량)의 값만 넣어요. 읽은 항목만 채우며 기존 값은 바뀔 수 있어요. 입력 뒤 이번에 먹은 양 기준으로 확인해주세요.</p><button type="button" data-act="nutrition-label">읽어서 입력칸에 채우기</button></details><div class="row-actions nutrition-scale"><small>지금 값 기준</small><button type="button" data-act="nutrition-scale" data-id="0.5">절반</button><button type="button" data-act="nutrition-scale" data-id="2">2배</button></div><div class="fields">${nutritionKeys.map(k=>`<label>${nutritionNames[k]}<input name="meal${k}" type="number" min="0" max="${k==='kcal'?20000:3000}" step="0.1" value="${esc(n[k]??'')}"></label>`).join('')}</div><p class="hint">식사량을 바꾸면 영양정보도 맞춰주세요. 모르는 항목은 비워두세요. 빈칸은 0이 아닌 미입력으로 구분해요.</p></details>`}
export function nutritionSummary(logs){const meals=logs.filter(l=>l.kind==='식사'&&!l.sourceId),totals={},counts={};for(const k of nutritionKeys){const values=meals.filter(l=>l.nutrition?.[k]!==undefined).map(l=>l.nutrition[k]);counts[k]=values.length;totals[k]=values.length?Math.round(values.reduce((n,v)=>n+v,0)*10)/10:null}return {meals:meals.length,recorded:meals.filter(l=>l.nutrition).length,totals,counts}}

export function scaleNutrition(n,factor){if(!n||!validNutrition(n)||!Number.isFinite(factor)||factor<=0||factor>10)throw Error('먼저 영양정보를 입력해주세요.');const result=Object.fromEntries(Object.entries(n).map(([k,v])=>[k,Math.round(v*factor*10)/10]));if(!validNutrition(result))throw Error('영양정보가 입력 범위를 넘었어요.');return result}

// Only explicitly labelled quantities are read; percentages and serving assumptions are ignored.
export function parseNutritionLabel(text){
 if(typeof text!=='string'||text.length>10000)throw Error('영양정보 문구는 10,000자 이내로 붙여넣어주세요.');
 const labels={kcal:'(?:열량|에너지|칼로리|energy|calories)',protein:'(?:단백질|protein)',carbs:'(?:탄수화물|carbohydrates?|carbs)',fat:'(?:지방|total fat)'};
 const result={};
 for(const key of nutritionKeys){
  const unit=key==='kcal'?'kcal':'g';
  const pattern=new RegExp('(?:^|[\\s,;|])'+labels[key]+'\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)\\s*'+unit+'(?![a-z])','gi');
  const values=[...text.matchAll(pattern)].map(m=>Number(m[1]));
  if(new Set(values).size>1)throw Error('같은 항목의 값이 여러 개예요. 1회분 또는 총 내용량 중 한 기준의 영양정보만 붙여넣어주세요.');
  if(values.length)result[key]=values[0];
 }
 if(!Object.keys(result).length)throw Error('읽을 수 있는 값이 없어요. 예: 열량 200kcal 단백질 15g 탄수화물 20g 지방 6g');
 if(!validNutrition(result))throw Error('영양정보가 입력 범위를 넘었어요. 단위와 수치를 확인해주세요.');
 return result;
}
