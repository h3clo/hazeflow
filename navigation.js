export const menuGroups=[
 {id:'day',label:'오늘',icon:'day',views:[['day','나의 하루']]},
 {id:'plan',label:'계획',icon:'week',views:[['week','캘린더'],['tasks','할 일'],['routines','루틴'],['goals','목표·버킷리스트']]},
 {id:'records',label:'기록',icon:'history',views:[['history','활동 기록'],['study','공부 흐름'],['diary','일기'],['life','생활 상태·인바디'],['favorites','즐겨찾기']]},
 {id:'finance',label:'돈 관리',icon:'money',views:[['money','가계부'],['income','소득·세금'],['assets','자산관리']]},
 {id:'reflect',label:'돌아보기',icon:'review',views:[['review','주간 회고'],['compare','과거 비교']]}
];
export function groupForView(view){return menuGroups.find(g=>g.views.some(([id])=>id===view))||menuGroups[0]}
export function groupDestination(id,lastViews={}){const group=menuGroups.find(g=>g.id===id);if(!group)return 'day';return group.views.some(([view])=>view===lastViews[id])?lastViews[id]:group.views[0][0]}
