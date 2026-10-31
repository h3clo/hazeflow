// Keep native file inputs alive while iOS leaves the page for its camera UI.
export function createPickerSession({onStatus,onFiles,onSettled=()=>{},schedule=setTimeout,unschedule=clearTimeout}){
 let active=null,sequence=0;const sessions=new Map();
 function finish(s,message){if(s.timer)unschedule(s.timer);s.timer=null;if(active===s)active=null;if(message)onStatus(s.context,message);onSettled();}
 return {
  begin(context){if(active)finish(active);for(const id of sessions.keys())if(id<sequence-16)sessions.delete(id);const s={id:++sequence,context,received:false,timer:null};sessions.set(s.id,s);active=s;onStatus(context,'① 사진을 선택하는 중이에요. 촬영 후 이곳에 진행 상태가 표시돼요.');s.timer=schedule(()=>finish(s,'사진이 아직 전달되지 않았어요. 촬영을 마쳤다면 사진 보관함에서 다시 선택해주세요.'),30000);return s.id;},
  returned(){const s=active;if(!s||s.received)return;if(s.timer)unschedule(s.timer);s.timer=schedule(()=>finish(s,'사진을 전달받지 못했어요. 촬영을 마쳤다면 사진 보관함에서 다시 선택해주세요.'),4000);},
  receive(id,files){const s=sessions.get(id);if(!s||s.received)return false;if(!files.length){finish(s,'사진을 전달받지 못했어요. 사진 보관함에서 다시 선택해주세요.');return false}s.received=true;if(s.timer)unschedule(s.timer);if(active===s)active=null;onStatus(s.context,`② 사진 ${files.length}장을 전달받았어요. 파일을 확인하고 있어요…`);try{onFiles(s.context,files)}finally{onSettled()}return true;},
  cancelled(id){const s=sessions.get(id);if(s&&!s.received)finish(s,'선택이 취소됐거나 사진을 전달받지 못했어요. 촬영을 마쳤다면 사진 보관함에서 다시 선택해주세요.');},
  cancel(){if(active)finish(active);},
  isOpen(){return !!active;}
 };
}
export function createPhotoPicker({onStatus,onFiles,onSettled}){
 const host=document.createElement('div');host.id='native-photo-inputs';document.body.append(host);const session=createPickerSession({onStatus,onFiles:(context,files)=>onFiles(context.input,context,files),onSettled});
 window.addEventListener('focus',()=>session.returned());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')session.returned()});
 return {isOpen:session.isOpen,cancel:session.cancel,open(context){
 const input=document.createElement('input');input.type='file';input.className='native-photo-input';input.accept='image/*';input.multiple=context.source!=='camera'&&!context.read;if(context.source==='camera')input.setAttribute('capture','environment');input.dataset.photoInput=context.target;input.dataset.readPhoto=context.read;input.setAttribute('aria-label',context.source==='camera'?'카메라 사진 입력':'사진 보관함 입력');input.tabIndex=-1;host.append(input);const id=session.begin({...context,input});input.addEventListener('change',()=>session.receive(id,[...input.files]));input.addEventListener('input',()=>session.receive(id,[...input.files]));input.addEventListener('cancel',()=>session.cancelled(id));
 try{input.click()}catch(error){session.cancelled(id);onStatus(context,'사진 선택을 열지 못했어요. '+error.message)}
 // Retain several completed inputs so delayed native events still have a target.
 if(host.children.length>8)host.firstElementChild.remove();
 }};
}
