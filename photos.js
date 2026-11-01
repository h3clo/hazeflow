import {createPhotoUrlCache} from './photo-url-cache.js';
export const MAX_PHOTOS=8;
export function validPhotoRef(p){return !!p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.id==='string'&&/^[-a-zA-Z0-9_]+$/.test(p.id)&&!['__proto__','constructor','prototype'].includes(p.id)&&typeof p.name==='string'&&p.name.length<=300&&p.type==='image/jpeg'&&Number.isInteger(p.width)&&p.width>0&&p.width<=1600&&Number.isInteger(p.height)&&p.height>0&&p.height<=1600&&Number.isInteger(p.bytes)&&p.bytes>0&&p.bytes<=3*1024*1024}
export function validPhotoRefs(refs){return refs===undefined||(Array.isArray(refs)&&refs.length<=MAX_PHOTOS&&refs.every(validPhotoRef)&&new Set(refs.map(p=>p.id)).size===refs.length)}
export function collectPhotoRefs(d,dates=null){const selected=dates?new Set(dates):null,map=new Map();for(const row of d.logs||[])if(!selected||selected.has(row.date))for(const p of row.photos||[])map.set(p.id,p);for(const [date,row]of Object.entries(d.diary||{}))if(!selected||selected.has(date))for(const p of row.photos||[])map.set(p.id,p);for(const [date,row]of Object.entries(d.life||{}))if(!selected||selected.has(date))for(const p of row.bodyPhotos||[])map.set(p.id,p);return [...map.values()]}
export function photoMarkdown(refs){return (refs||[]).map(p=>`![${p.name.replace(/[\[\]\r\n]/g,' ')}](photos/${p.id}.jpg)`).join('\n\n')}
export function makePhotoStore(name){
 let dbPromise;
 const open=()=>dbPromise??=new Promise((resolve,reject)=>{const req=indexedDB.open(name,1);req.onupgradeneeded=()=>req.result.createObjectStore('photos');req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(Error('사진 저장소를 열지 못했어요. 브라우저 저장 설정을 확인해주세요.'))}});
 async function get(id){const db=await open();return new Promise((resolve,reject)=>{const req=db.transaction('photos').objectStore('photos').get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(Error('사진을 읽지 못했어요.'))})}
 async function put(id,blob){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(blob,id);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(Error('사진을 저장하지 못했어요. 기기의 여유 공간을 확인해주세요.'))})}
 async function putBatch(entries){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos');for(const [id,blob]of entries){const request=store.get(id);request.onsuccess=()=>{if(!request.result)store.put(blob,id)}}tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(Error('백업 사진을 저장하지 못했어요. 기존 기록은 유지돼요.'))})}
 const cache=createPhotoUrlCache(get);
 return {get,async put(id,blob){await put(id,blob);cache.invalidate(id)},putBatch,url:cache.url,dispose:cache.dispose};
}
export async function photoFormat(file){
 const bytes=new Uint8Array(await file.slice(0,64).arrayBuffer());
 if(bytes[0]===255&&bytes[1]===216)return 'image/jpeg';
 if(bytes[0]===137&&String.fromCharCode(...bytes.slice(1,4))==='PNG')return 'image/png';
 const header=String.fromCharCode(...bytes);
 if(header.slice(0,4)==='RIFF'&&header.slice(8,12)==='WEBP')return 'image/webp';
 if(header.slice(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(header.slice(8)))return 'image/heic';
 if(header.slice(4,8)==='ftyp'&&/avif|avis/.test(header.slice(8)))return 'image/avif';
 if(/^image\/(jpeg|jpg|png|webp|avif|heic|heif)$/i.test(file.type))return file.type.toLowerCase().replace('image/jpg','image/jpeg');
 throw Error('사진 파일을 읽지 못했어요. JPEG·PNG·HEIC 사진을 선택해주세요.');
}
async function timed(promise,message,ms=30000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms)})])}finally{clearTimeout(timer)}}
async function loadPhoto(blob){const url=URL.createObjectURL(blob),image=new Image();try{image.src=url;await timed(image.decode(),'사진을 읽는 시간이 길어졌어요. 다시 선택해주세요.');return image}finally{URL.revokeObjectURL(url)}}
export async function preparePhoto(file,onProgress=()=>{}){
 if(file.size>25*1024*1024)throw Error('사진 한 장은 25MB 이하로 선택해주세요.');
 const type=await photoFormat(file);let image,ocrBlob=file;
 try{image=await loadPhoto(new Blob([file],{type}))}catch(error){if(!['image/heic','image/heif'].includes(type))throw Error('사진을 열지 못했어요. 다른 JPEG·PNG 사진으로 다시 시도해주세요.');onProgress('아이폰 사진을 변환하고 있어요…');try{const {heicTo}=await import('heic-to/csp');const converted=await timed(heicTo({blob:file,type:'image/jpeg',quality:.85}),'아이폰 사진 변환 시간이 길어졌어요. JPEG로 저장한 사진으로 다시 시도해주세요.',60000);ocrBlob=converted;image=await loadPhoto(converted)}catch{throw Error('아이폰 사진을 변환하지 못했어요. 사진 앱에서 JPEG로 저장한 사진으로 다시 시도해주세요.');}}
 if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>50000000)throw Error('사진 크기가 너무 커요.');
 const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 try{const ctx=canvas.getContext('2d');if(!ctx)throw Error('사진 처리 메모리가 부족해요. 한 장씩 다시 선택해주세요.');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);const blob=await timed(new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.83)),'사진 저장 준비가 지연됐어요. 한 장씩 다시 선택해주세요.');if(!blob||blob.size>3*1024*1024)throw Error('사진을 처리하지 못했어요. 더 작은 사진으로 시도해주세요.');const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():'photo-'+[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');return {blob,ocrBlob,ref:{id,name:file.name.slice(0,300),type:'image/jpeg',width,height,bytes:blob.size}};}finally{canvas.width=1;canvas.height=1;image.src='';}
}

export async function blobDataURL(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return `data:image/jpeg;base64,${btoa(binary)}`}
export function decodePhotoBundle(payload,refs){
 const assets=payload||{},result=[];if(typeof assets!=='object'||Array.isArray(assets))throw Error('백업 사진 형식이 올바르지 않아요.');
 for(const ref of refs){const value=assets[ref.id];if(typeof value!=='string'||value.length>5*1024*1024||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('백업에 사진 파일이 없거나 손상됐어요.');let binary;try{binary=atob(value.slice(value.indexOf(',')+1))}catch{throw Error('백업 사진을 읽지 못했어요.')}
 if(binary.length!==ref.bytes||binary.charCodeAt(0)!==255||binary.charCodeAt(1)!==216)throw Error('백업 사진의 내용과 정보가 일치하지 않아요.');
 result.push([ref.id,new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:'image/jpeg'})]);
 }return result;
}

export async function photoStage(promise,message,ms=45000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms)})])}finally{clearTimeout(timer)}}
