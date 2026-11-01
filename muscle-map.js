export const muscleLabels={등:'등',가슴:'가슴',어깨:'어깨',이두:'위팔 앞',삼두:'위팔 뒤',복부:'배',허벅지:'허벅지 앞',햄스트링:'허벅지 뒤',둔근:'엉덩이',종아리:'종아리'};
const silhouette='<path class="body-outline" d="M98 61Q88 50 88 34Q88 12 110 12Q132 12 132 34Q132 50 122 61L122 74Q148 78 159 92Q169 110 172 141L181 190L189 228Q194 244 187 250L178 240L174 219L161 184L151 153L148 181L150 211Q159 237 153 279L146 337L142 385L138 455L145 482Q146 491 130 491L119 486L117 460L118 389L111 336L110 302L109 336L102 389L103 460L101 486L90 491Q74 491 75 482L82 455L78 385L74 337L67 279Q61 237 70 211L72 181L69 153L59 184L46 219L42 240L33 250Q26 244 31 228L39 190L48 141Q51 110 61 92Q72 78 98 74Z"/>';
const front=[
 ['가슴','M107 91Q87 81 72 101L73 122Q90 137 107 123ZM113 91Q133 81 148 101L147 122Q130 137 113 123Z'],
 ['어깨','M91 80Q67 77 57 100L55 119L68 123Q73 98 91 94ZM129 80Q153 77 163 100L165 119L152 123Q147 98 129 94Z'],
 ['이두','M56 124L68 127L64 151L55 174L46 169Q48 143 56 124ZM164 124L152 127L156 151L165 174L174 169Q172 143 164 124Z'],
 ['복부','M91 134L106 132L106 151L92 151ZM114 132L129 134L128 151L114 151ZM92 156L106 156L106 174L93 175ZM114 156L128 156L127 175L114 174ZM94 180L106 179L106 200L100 210L95 204ZM114 179L126 180L125 204L120 210L114 200Z'],
 ['허벅지','M77 222Q94 218 104 233L105 273L98 320L85 327L77 298Q69 254 77 222ZM143 222Q126 218 116 233L115 273L122 320L135 327L143 298Q151 254 143 222Z'],
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
export function muscleMap(expected=[],selected=[]){const make=(label,rows)=>`<figure><figcaption>${label}</figcaption><svg viewBox="20 0 180 510" role="group" aria-label="${label} 근육 선택">${silhouette}<path class="anatomy-line" d="M110 78V204M75 185L82 210M145 185L138 210M80 333L99 333M121 333L140 333M84 438L99 438M121 438L136 438"/>${rows.map(([name,path])=>`<g role="button" tabindex="0" data-muscle="${name}" aria-label="${label} ${muscleLabels[name]} 선택" aria-pressed="${selected.includes(name)}" class="muscle-region ${expected.includes(name)?'expected':''} ${selected.includes(name)?'felt':''}"><title>${muscleLabels[name]} (${name})</title>${(path.match(/M[^M]+/g)||[path]).map(part=>`<path d="${part}"/>`).join('')}</g>`).join('')}</svg></figure>`;return `<div class="muscle-map-legend"><span><i class="expected"></i>이 운동의 예상 사용 부위</span><span><i class="felt"></i>내가 느낀 부위</span><span><i class="both"></i>둘 다 해당</span></div><p class="muscle-map-expected">예상 사용 부위: ${expected.length?expected.map(n=>muscleLabels[n]).join(' · '):'알려진 부위 없음'}</p><div class="muscle-map">${make('앞',front)}${make('뒤',back)}</div><p class="muscle-map-caption" role="status">선택한 느낌: ${selected.length?selected.map(n=>muscleLabels[n]).join(' · '):'그림에서 위치를 눌러주세요'}</p>`}
