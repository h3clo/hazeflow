// Keep the latest notification visible for its own full duration.
export function createToast({show,hide,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,duration=4000,undoDuration=8000}){
 let timer=null,visible=false,remaining=0,started=0,generation=0;const pauses=new Set();
 function clear(){if(timer!==null)clearTimer(timer);timer=null}
 function dismiss(){generation++;clear();if(visible)hide();visible=false;remaining=0;pauses.clear()}
 function arm(){if(!visible||pauses.size)return;started=now();const token=generation;timer=setTimer(()=>{if(token===generation)dismiss()},Math.max(0,remaining))}
 function present(text,undo=false){generation++;clear();remaining=undo?undoDuration:duration;visible=true;show(text,undo);arm()}
 function setPaused(reason,paused){if(paused){if(!pauses.size&&visible){remaining=Math.max(0,remaining-(now()-started));clear()}pauses.add(reason)}else{const existed=pauses.delete(reason);if(existed&&!pauses.size)arm()}}
 return {present,dismiss,setPaused};
}
