export function userMessage(value){
 const text=String(value?.message??value??'');
 return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(text)?'새 버전으로 바뀌어 화면을 다시 불러와야 해요. 작성 중인 내용을 저장한 뒤 새로고침해주세요.':text;
}
