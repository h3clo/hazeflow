export const muscleLabels={등:'등',가슴:'가슴',어깨:'어깨',이두:'위팔 앞',삼두:'위팔 뒤',복부:'배',허벅지:'허벅지 앞',햄스트링:'허벅지 뒤',둔근:'엉덩이',종아리:'종아리',내전근:'허벅지 안쪽',허벅지바깥:'허벅지 바깥쪽'};
const silhouette='<path class="body-outline" d="M98 61Q88 50 88 34Q88 12 110 12Q132 12 132 34Q132 50 122 61L122 74Q148 78 159 92Q169 110 172 141L181 190L189 228Q194 244 187 250L178 240L174 219L161 184L151 153L148 181L150 211Q159 237 153 279L146 337L142 385L138 455L145 482Q146 491 130 491L119 486L117 460L118 389L111 336L110 302L109 336L102 389L103 460L101 486L90 491Q74 491 75 482L82 455L78 385L74 337L67 279Q61 237 70 211L72 181L69 153L59 184L46 219L42 240L33 250Q26 244 31 228L39 190L48 141Q51 110 61 92Q72 78 98 74Z"/>';
const front=[
 ['가슴','M107 91Q87 81 72 101L73 122Q90 137 107 123ZM113 91Q133 81 148 101L147 122Q130 137 113 123Z'],
 ['어깨','M91 80Q67 77 57 100L55 119L68 123Q73 98 91 94ZM129 80Q153 77 163 100L165 119L152 123Q147 98 129 94Z'],
 ['이두','M56 124L68 127L64 151L55 174L46 169Q48 143 56 124ZM164 124L152 127L156 151L165 174L174 169Q172 143 164 124Z'],
 ['복부','M91 134L106 132L106 151L92 151ZM114 132L129 134L128 151L114 151ZM92 156L106 156L106 174L93 175ZM114 156L128 156L127 175L114 174ZM94 180L106 179L106 200L100 210L95 204ZM114 179L126 180L125 204L120 210L114 200Z'],
 ['허벅지','M85 226Q94 223 99 234L99 271L93 315L86 320L82 290L80 256ZM135 226Q126 223 121 234L121 271L127 315L134 320L138 290L140 256Z'],
 ['내전근','M101 228L107 234L106 275L100 310L96 317L102 270ZM119 228L113 234L114 275L120 310L124 317L118 270Z'],
 ['허벅지바깥','M76 224L82 227L78 256L80 289L84 319L80 310L73 278Q69 251 76 224ZM144 224L138 227L142 256L140 289L136 319L140 310L147 278Q151 251 144 224Z'],
 ['종아리','M84 350L98 344L99 386L95 425L85 431L82 393ZM136 350L122 344L121 386L125 425L135 431L138 393Z']
];
const back=[
 ['등','M98 77L107 82L107 117L85 110L75 96ZM122 77L113 82L113 117L135 110L145 96ZM76 115L105 126L106 177L99 205L83 182L75 149ZM144 115L115 126L114 177L121 205L137 182L145 149Z'],
 ['어깨','M91 80Q68 78 57 100L55 119L69 126L77 102L91 94ZM129 80Q152 78 163 100L165 119L151 126L143 102L129 94Z'],
 ['삼두','M56 128L69 129L65 151L54 178L45 172L49 148ZM164 128L151 129L155 151L166 178L175 172L171 148Z'],
 ['둔근','M77 210Q91 201 107 213L107 244Q88 262 72 246ZM143 210Q129 201 113 213L113 244Q132 262 148 246Z'],
 ['햄스트링','M74 253Q90 264 105 250L104 284L96 326L84 327L77 299ZM146 253Q130 264 115 250L116 284L124 326L136 327L143 299Z'],
 ['종아리','M84 344Q96 339 99 355L100 384L94 422L85 429L81 388ZM136 344Q124 339 121 355L120 384L126 422L135 429L139 388Z']
];
export const muscleDetails={등:'등 · 광배근·승모근',가슴:'가슴 · 대흉근',어깨:'어깨 · 삼각근',이두:'위팔 앞 · 상완이두근',삼두:'위팔 뒤 · 상완삼두근',복부:'배 · 복직근',허벅지:'허벅지 앞 · 대퇴사두근',햄스트링:'허벅지 뒤 · 햄스트링',둔근:'엉덩이 · 둔근',종아리:'종아리 · 비복근·가자미근',내전근:'허벅지 안쪽 · 내전근군',허벅지바깥:'허벅지 바깥쪽 · 위치 기록'};
export function muscleMap(expected=[],selected=[]){const make=(label,rows)=>`<figure><figcaption>${label}</figcaption><svg viewBox="20 0 180 510" role="group" aria-label="${label} 근육 선택">${silhouette}<path class="anatomy-line" d="M110 78V204M75 185L82 210M145 185L138 210M80 333L99 333M121 333L140 333M84 438L99 438M121 438L136 438"/>${rows.map(([name,path])=>`<g role="button" tabindex="0" data-muscle="${name}" aria-label="${label} ${muscleLabels[name]} 선택" aria-pressed="${selected.includes(name)}" class="muscle-region ${expected.includes(name)?'expected':''} ${selected.includes(name)?'felt':''}"><title>${muscleDetails[name]}</title>${(path.match(/M[^M]+/g)||[path]).map(part=>`<path d="${part}"/>`).join('')}</g>`).join('')}</svg></figure>`;return `<div class="muscle-map-legend"><span><i class="expected"></i>이 운동의 예상 사용 부위</span><span><i class="felt"></i>내가 느낀 부위</span><span><i class="both"></i>둘 다 해당</span></div><p class="muscle-map-expected">예상 사용 부위: ${expected.length?expected.map(n=>muscleLabels[n]).join(' · '):'알려진 부위 없음'}</p><div class="muscle-map">${make('앞',front)}${make('뒤',back)}</div><p class="muscle-map-caption" role="status">선택한 느낌: ${selected.length?selected.map(n=>muscleDetails[n]).join(' / '):'그림에서 위치를 눌러주세요'}</p>`}

export function muscleHistoryMap(latest,date){
 const safe=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const day=Date.parse(date+'T12:00:00Z'),render=(label,regions)=>`<figure><figcaption>${label}</figcaption><svg viewBox="20 0 180 510" role="img" aria-label="${label} 부위별 최근 운동 날짜">${silhouette}${regions.map(([name,path])=>{const log=latest.get(name),gap=log?Math.max(0,Math.round((day-Date.parse(log.date+'T12:00:00Z'))/86400000)):null;return `<g class="muscle-history-region ${gap===null?'unrecorded':gap===0?'same-day':gap<=2?'recent':'earlier'}"><title>${safe(muscleDetails[name])}: ${log?safe(log.date)+' · '+(gap===0?'선택한 날 운동':gap+'일 전'):'최근 30일 기록 없음'}</title>${(path.match(/M[^M]+/g)||[path]).map(part=>`<path d="${part}"/>`).join('')}</g>`}).join('')}</svg></figure>`;
 return `<section class="muscle-recency"><h3>몸 그림으로 보는 운동 간격</h3><div class="muscle-map-legend"><span><i class="same-day"></i>선택한 날</span><span><i class="recent"></i>1~2일 전</span><span><i class="earlier"></i>3일 이상 전</span><span><i class="unrecorded"></i>최근 기록 없음</span></div><div class="muscle-map">${render('앞',front)}${render('뒤',back)}</div><p class="hint">${safe(date)} 기준 · 예상 사용 부위·직접 기록한 자극의 마지막 날짜를 색으로 표시해요. 회복률이나 운동 가능 판정은 아니에요. 아래 기록에서 운동 후 느낌과 근육통을 함께 확인해요.</p></section>`;
}
