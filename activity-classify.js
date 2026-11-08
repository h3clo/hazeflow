import {workoutSession} from './workout.js';

const workoutKeywords = [
 '레그프레스','벤치프레스','데드리프트','스쿼트','랫풀다운','숄더프레스','덤벨','바벨',
 '케틀벨','풀업','턱걸이','푸시업','팔굽혀펴기','러닝','조깅','산책','스트레칭','유산소',
 '마이마운틴','천국의계단','천계','런닝머신','러닝머신','헬스','필라테스','요가','수영',
 '사이클','라이딩','오운완','하체운동','상체운동','가슴운동','등운동','어깨운동','팔운동',
 '플랭크','복근운동','런지','딥스','인클라인','체스트프레스','시티드로우','바벨컬','덤벨컬'
];

const mealKeywords = [
 '아침','점심','저녁','야식','간식','식사','밥','먹음','먹었','먹는','먹기','먹자',
 '마심','마셨','마시는','커피','라떼','아메리카노','디저트','빵','샌드위치','김치찌개',
 '된장찌개','샐러드','단백질쉐이크','닭가슴살','배달','외식','식당','맛집','브런치',
 '치킨','피자','라면','삼겹살','고기','음료'
];

const studyKeywords = [
 '공부','학습','강의','인강','수업','독서','책 읽','복습','예습','암기','문제집',
 '자격증','시험','영어','토익','코딩','알고리즘','과제','스터디','단어','수학','필기'
];

const workKeywords = [
 '회의','미팅','업무','근무','출근','퇴근','보고서','기획','개발','작업','면담',
 '외근','거래처','고객','문서 작성','스프린트','지라','jira','슬랙','slack','발표','pt'
];

const restKeywords = [
 '휴식','쉬는 중','쉬었','낮잠','멍때','쉼','누워','빈둥','뒹굴'
];

const moodKeywords = [
 '기분','우울','행복','불안','화가','답답','뿌듯','감사','짜증','슬픔','외로','설레'
];

export function classifyActivity(text){
 const raw = String(text || '').trim();
 if(!raw) return '일상';

 // 1. Check workout session exercises first (e.g., strength sets, cardio)
 const session = workoutSession(raw);
 if(session.exercises.length > 0){
  return '운동';
 }

 // 2. Match workout keywords and set patterns
 if(workoutKeywords.some(k => raw.includes(k))){
  return '운동';
 }
 if(/\b\d+\s*(?:kg|reps|세트|회)\b/i.test(raw)){
  return '운동';
 }

 // 3. Match meal keywords
 if(mealKeywords.some(k => raw.includes(k))){
  return '식사';
 }

 // 4. Match study keywords
 if(studyKeywords.some(k => raw.includes(k))){
  return '공부';
 }

 // 5. Match work keywords
 if(workKeywords.some(k => raw.includes(k))){
  return '업무';
 }

 // 6. Match rest keywords
 if(restKeywords.some(k => raw.includes(k))){
  return '휴식';
 }

 // 7. Match mood keywords
 if(moodKeywords.some(k => raw.includes(k))){
  return '감정';
 }

 // Default fallback
 return '일상';
}
