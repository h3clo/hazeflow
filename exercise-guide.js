import {exerciseMuscles,relatedExercises} from './fitness.js';
import {muscleLabels} from './muscle-map.js';
export function exerciseGuide(name,esc){
 const muscles=exerciseMuscles(name);if(!muscles.length)return '';
 const related=relatedExercises(name),lat=String(name).replace(/\s/g,'')==='랫풀다운';
 return `<details class="exercise-guide"><summary>자세·관련 운동</summary>${lat?'<ol><li>무릎 패드로 하체를 고정하고, 손잡이를 어깨보다 조금 넓게 잡아요.</li><li>가슴을 편 상태에서 팔꿈치를 내리며 손잡이를 가슴 방향으로 당겨요.</li><li>반동을 줄이고 천천히 시작 위치로 돌아가요.</li></ol>':''}<p><b>주 사용 부위</b> ${esc(muscleLabels[muscles[0]]||muscles[0])}${muscles.length>1?`<br><b>보조 사용 부위</b> ${muscles.slice(1).map(x=>esc(muscleLabels[x]||x)).join(' · ')}`:''}</p>${related.length?`<p>같은 부위의 다른 운동</p><div class="related-exercises">${related.map(n=>`<span>${esc(n)}</span>`).join('')}</div>`:''}<p><a href="${lat?'https://www.gymwork.pro/exercises/lat-pulldown?lang=ko&id=147':'https://www.gymwork.pro/exercises?lang=ko'}" target="_blank" rel="noopener noreferrer">${lat?'랫 풀다운 자세·영상 보기':'운동 가이드 찾아보기'} ↗</a></p></details>`;
}
