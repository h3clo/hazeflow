export const muscleNames=['등','가슴','어깨','이두','삼두','복부','허벅지','햄스트링','둔근','종아리','내전근','허벅지바깥','승모근','허리','전완근','옆구리','정강이'];

function validMuscleList(muscles){
 return Array.isArray(muscles)&&new Set(muscles).size===muscles.length&&muscles.every(x=>muscleNames.includes(x));
}

export function validExerciseMuscles(map){
 if(map===undefined)return true;
 if(!map||typeof map!=='object'||Array.isArray(map))return false;
 return Object.entries(map).every(([key,muscles])=>typeof key==='string'&&key.length>0&&key.length<=80&&validMuscleList(muscles));
}

export function validWorkoutFeedback(f){
 return !!f&&typeof f==='object'&&!Array.isArray(f)
  &&validMuscleList(f.muscles)
  &&(f.effort===null||Number.isInteger(f.effort)&&f.effort>=1&&f.effort<=5)
  &&['','없음','약함','큼'].includes(f.soreness)
  &&typeof f.note==='string'&&f.note.length<=500
  &&validExerciseMuscles(f.exerciseMuscles);
}

export function unionFeelingMuscles(map){
 return [...new Set(Object.values(map||{}).flat())].filter(x=>muscleNames.includes(x));
}

export function feelingMusclesState(feedback){
 if(feedback?.exerciseMuscles&&validExerciseMuscles(feedback.exerciseMuscles)){
  return structuredClone(feedback.exerciseMuscles);
 }
 return {all:Array.isArray(feedback?.muscles)?[...feedback.muscles]:[]};
}

export function readWorkoutFeedback(values,muscles,exerciseMuscles){
 const f={
  muscles,
  effort:values.effort?Number(values.effort):null,
  soreness:values.soreness||'',
  note:String(values.note||'').trim(),
  ...(exerciseMuscles&&Object.keys(exerciseMuscles).length?{exerciseMuscles}:{})
 };
 if(!f.muscles.length&&f.effort===null&&!f.soreness&&!f.note)throw Error('느낀 부위·힘듦·근육통·메모 중 하나를 남겨주세요.');
 if(!validWorkoutFeedback(f))throw Error('운동 느낌의 선택값과 메모를 확인해주세요.');
 return f;
}
