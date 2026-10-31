import {zipSync,strToU8} from 'fflate';
import {collectPhotoRefs,blobDataURL} from './photos.js';
import {dayDocument,allDocument} from './domain.js';
export async function photoBackup(d,store){const photoData={};for(const p of collectPhotoRefs(d)){const blob=await store.get(p.id);if(!blob)throw Error(`사진 '${p.name}'을 찾을 수 없어 전체 백업을 만들지 못했어요.`);photoData[p.id]=await blobDataURL(blob)}return {...d,photoData}}
export async function documentZip(d,dates,store,all=false){const files={};files[all?'haze-flow-all.md':`haze-flow-${dates[0]}.md`]=strToU8(all?allDocument(d):dayDocument(d,dates[0]));for(const p of collectPhotoRefs(d,all?null:dates)){const blob=await store.get(p.id);if(!blob)throw Error(`사진 '${p.name}'을 찾을 수 없어요.`);files[`photos/${p.id}.jpg`]=new Uint8Array(await blob.arrayBuffer())}return zipSync(files,{level:0})}
