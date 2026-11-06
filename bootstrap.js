import {prepareRecordStorage} from './storage-runtime.js';
prepareRecordStorage().then(()=>import('./app.js')).catch(error=>{const target=document.querySelector('#content')||document.querySelector('main');if(target){target.textContent='기기 기록 보관함을 열지 못했어요. 기록을 삭제하거나 초기화하지 말고 앱을 다시 열어주세요. '+(error.message||'');target.setAttribute('role','alert')}});
