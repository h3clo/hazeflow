import {Unzip,UnzipInflate} from 'fflate';
import {createHealthXMLParser} from './health-xml.js';
self.onmessage=async({data:{file}})=>{try{
 if(!file||file.size>1024*1024*1024)throw Error('1GB 이하의 Apple 건강 ZIP 또는 XML 파일을 선택해주세요.');let count=0,inflated=0,complete=false,chosen=false;const decoder=new TextDecoder(),parser=createHealthXMLParser(records=>{count=records;self.postMessage({type:'progress',records})}),feed=(chunk,final=false)=>{inflated+=chunk.length;if(inflated>700*1024*1024)throw Error('건강 XML이 너무 커요. 700MB 이하의 파일을 사용해주세요.');parser.write(decoder.decode(chunk,{stream:!final}));if(final)complete=true};
 const zip=/\.zip$/i.test(file.name);let unzip;if(zip){unzip=new Unzip(entry=>{if(!chosen&&/\.xml$/i.test(entry.name)&&!/(?:^|\/)export_cda\.xml$/i.test(entry.name)){chosen=true;entry.ondata=(error,chunk,final)=>{if(error)throw error;feed(chunk,final)};entry.start()}});unzip.register(UnzipInflate)}
 for(let offset=0;offset<file.size;offset+=65536){const chunk=new Uint8Array(await file.slice(offset,Math.min(file.size,offset+65536)).arrayBuffer()),last=offset+65536>=file.size;if(zip)unzip.push(chunk,last);else feed(chunk,last);if(complete)break}
 if(zip&&!chosen)throw Error('ZIP 안에서 Apple 건강 내보내기 XML을 찾지 못했어요.');const result=parser.finish();self.postMessage({type:'done',result});
 }catch(error){self.postMessage({type:'error',message:'건강 파일을 읽지 못했어요. '+(error.message||'파일 형식을 확인해주세요.')})}};
