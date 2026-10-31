export async function readPhotoText(blob,{signal,onProgress=()=>{}}={}){
 let worker;let stop;const base=new URL(import.meta.env.BASE_URL+'ocr/',location.origin).href;
 try{const {createWorker}=await import('tesseract.js');if(signal?.aborted)throw Error('사진 읽기를 취소했어요.');onProgress('사진 읽기 준비 중 · 첫 실행에는 언어 파일을 받아요.');const aborted=new Promise((_,reject)=>{stop=()=>{worker?.terminate();reject(Error('사진 읽기를 취소했어요.'))};signal?.addEventListener('abort',stop,{once:true})});
 const work=(async()=>{worker=await createWorker(['kor','eng'],1,{workerPath:base+'worker.min.js',corePath:base,langPath:base.replace(/\/$/,''),workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')onProgress('사진 읽는 중 · '+Math.round((m.progress||0)*100)+'%')},errorHandler:()=>{}});if(signal?.aborted){await worker.terminate();throw Error('사진 읽기를 취소했어요.')}await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});const result=await worker.recognize(blob);return result.data.text;})();return await Promise.race([work,aborted]);
 }finally{signal?.removeEventListener('abort',stop);if(worker)await worker.terminate().catch(()=>{});}
}
