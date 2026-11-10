/** Life “빠른 기록” focuses memo; Classic “활동 기록” keeps activity start. */
export function captureModeForShortcut({uiDesign,futureDay=false}={}){
 if(futureDay)return null;
 return uiDesign==='life'?'memo':'activity';
}

export function captureSubmitLabel(mode){
 return mode==='memo'?'짧은 기록 저장':'활동 시작';
}
