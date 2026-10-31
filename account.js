import {makeCloud,cloudTransport} from './cloud.js';
import {createSyncEngine} from './sync-engine.js';
import {conflictTitle} from './sync-state.js';

const phases={local:'이 기기에 저장 중',loading:'로그인 확인 중',pending:'동기화 대기',syncing:'동기화 중',synced:'동기화 완료',offline:'오프라인 · 기기에 저장됨',error:'동기화 재시도 필요',conflict:'같은 기록의 수정 내용 확인 필요',unconfigured:'계정 연결 준비 중'};
export function createAccount({config,sandbox,esc,switchAccount,getContext,importGuest,hasGuest,notify}){
 const $=s=>document.querySelector(s);let auth=config?makeCloud(config):null,user=null,engine=null,unsubscribe=null,interval=null,version=0,current={phase:config?'loading':'unconfigured',conflicts:[]};
 function statusText(){return phases[current.phase]||phases.local}
 function paint(){const note=$('.aside-note');if(note)note.innerHTML=user?'기록과 사진을 내 계정에 동기화해요.<br>내보내기로 별도 보관할 수 있어요.':'로그인 전 기록은 이 브라우저에 저장돼요.<br>로그인하면 기기 간 동기화할 수 있어요.';const b=$('#account-button');b.textContent=user?'내 계정':'로그인';b.setAttribute('aria-label',user?'내 계정과 동기화':'로그인');const s=$('#sync-status');s.textContent=statusText();s.dataset.phase=current.phase;s.title=current.error||statusText();if($('#account-panel').open&&!document.activeElement?.closest('[data-form=account-login]'))panel()}
 const preview=(value,deleted)=>deleted?'삭제된 기록':typeof value==='boolean'?String(value):value?.entry||value?.note||value?.text||value?.title||JSON.stringify(value,null,2);
 function panel(){
  const body=$('#account-body');
  if(!config){body.innerHTML='<p>로그인과 기기 간 동기화 연결을 준비하고 있어요.</p><p class="hint">기존 기록은 이 브라우저에 그대로 저장돼요. 계정 저장소 연결 후 로그인할 수 있어요.</p>';return}
  if(!user){body.innerHTML=`<p>같은 이메일로 로그인하면 다른 기기에서도 기록과 사진을 이어볼 수 있어요.</p><form data-form="account-login"><label>이메일<input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label><label class="switch-label"><input type="checkbox" name="remember" ${auth.sessionStore.remember()?'checked':''}>이 기기에서 로그인 유지</label><button class="primary">로그인 링크 받기</button><p id="account-feedback" role="status"></p></form><p class="hint">이메일의 링크를 요청한 브라우저에서 열어주세요. 처음 사용하는 이메일은 계정이 만들어져요. 로그인 전의 기기 기록은 자동 업로드하지 않아요.</p>`;return}
  body.innerHTML=`<div class="account-identity"><strong>${esc(user.email||'내 계정')}</strong><span class="badge">${sandbox?'점검 공간':'개인 계정'}</span></div><p>${statusText()}</p>${current.lastSync?`<p class="hint">마지막 동기화 ${new Date(current.lastSync).toLocaleString('ko-KR')}</p>`:''}${current.error?`<p class="error">${esc(current.error)}</p>`:''}<p class="hint">기록과 사진은 내 계정에 저장돼요. 인터넷이 끊기면 기기에 보관하고, 다시 연결되면 자동으로 이어서 동기화해요.</p><div class="row-actions"><button data-account="sync" type="button">지금 동기화</button><button data-account="logout" type="button">로그아웃</button></div>${hasGuest()?`<div class="account-import"><h3>로그인 전에 이 기기에 남긴 기록</h3><p>가져오기를 누르면 이 계정에 기록과 사진을 복사하고 동기화해요. 같은 ID의 기록은 현재 계정 내용을 유지해요.</p><button data-account="import" class="primary" type="button">기기 기록을 내 계정으로 가져오기</button></div>`:''}${current.conflicts?.length?`<div class="sync-conflicts"><h3>동시에 수정한 기록 ${current.conflicts.length}건</h3><p class="hint">양쪽 내용을 확인하고 남길 쪽을 선택해주세요. 선택 전에는 덮어쓰지 않아요.</p>${current.conflicts.map((c,i)=>`<article><h4>${esc(conflictTitle(c))}</h4><div class="conflict-versions"><div><small>이 기기</small><pre>${esc(preview(c.local,c.localDeleted))}</pre><button data-account="resolve" data-choice="local" data-conflict="${i}">이 기기 내용 유지</button></div><div><small>다른 기기 / 클라우드</small><pre>${esc(preview(c.remote?.payload,!c.remote||c.remote.deleted))}</pre><button data-account="resolve" data-choice="remote" data-conflict="${i}">클라우드 내용 사용</button></div></div></article>`).join('')}</div>`:''}`;
 }
 async function activate(session){
  const next=session?.user||null;if(next?.id===user?.id){user=next;if(engine)engine.schedule(0);return}
  version++;engine?.stop();engine=null;unsubscribe?.();unsubscribe=null;clearInterval(interval);user=next;current={phase:user?'syncing':'local',conflicts:[]};
  switchAccount(user?.id||null);paint();if(!user)return;
  const context=getContext(),transport=cloudTransport(auth.client,user.id,sandbox?'sandbox':'main'),token=version;
  engine=createSyncEngine({...context,transport,onStatus(status){if(version!==token)return;current=status;paint()},online:()=>navigator.onLine});
  unsubscribe=transport.subscribe(()=>engine?.schedule(200));interval=setInterval(()=>{if(document.visibilityState==='visible')engine?.schedule(0)},30000);await engine.sync();
 }
 async function start(){paint();if(!auth)return;auth.client.auth.onAuthStateChange((event,session)=>{if(session)auth.sessionStore.setItem('hazeflow-auth-v1',JSON.stringify(session));else if(event==='SIGNED_OUT')auth.sessionStore.removeItem('hazeflow-auth-v1');setTimeout(()=>activate(session),0)});const {data,error}=await auth.client.auth.getSession();if(error){current={phase:'error',error:'로그인을 확인하지 못했어요. 다시 로그인해주세요.'};paint();return}await activate(data.session);if(!data.session){current={phase:'local',conflicts:[]};paint()}}
 document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.id==='account-button'){panel();$('#account-panel').showModal();return}
  const action=b.dataset.account;if(!action)return;
  if(action==='close'){$('#account-panel').close();return}
  if(action==='sync'){await engine?.sync();return}
  if(action==='resolve'){const conflict=current.conflicts?.[Number(b.dataset.conflict)];if(conflict)engine?.resolve(conflict.key,b.dataset.choice);return}
  if(action==='logout'){b.disabled=true;try{const {error}=await auth.client.auth.signOut({scope:'local'});if(error)throw error;await activate(null);notify('로그아웃했어요. 계정 기록은 다시 로그인하면 볼 수 있어요.')}catch{notify('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해주세요.')}finally{b.disabled=false}return}
  if(action==='import'){const token=version;b.disabled=true;try{await importGuest();if(token===version){engine?.schedule(0);notify('기기 기록을 계정으로 복사했어요. 동기화를 이어서 진행해요.');panel()}}catch(error){notify(error.message)}finally{b.disabled=false}}
 });
 document.addEventListener('submit',async event=>{const form=event.target;if(form.dataset.form!=='account-login')return;event.preventDefault();const values=Object.fromEntries(new FormData(form)),button=form.querySelector('button');button.disabled=true;const feedback=$('#account-feedback');try{auth.sessionStore.setRemember(!!values.remember);const redirect=new URL(import.meta.env.BASE_URL,location.origin);if(sandbox)redirect.searchParams.set('sandbox','1');const {error}=await auth.client.auth.signInWithOtp({email:values.email.trim(),options:{emailRedirectTo:redirect.href,shouldCreateUser:true}});if(error)throw error;feedback.textContent='로그인 링크를 요청했어요. 이메일을 확인하고 같은 브라우저에서 열어주세요.'}catch(error){feedback.textContent=error.code==='email_address_not_authorized'?'현재는 Supabase 가입에 사용한 이메일로 로그인해주세요.':/rate|limit/i.test(error.message)?'로그인 메일 발송 한도에 도달했어요. 잠시 뒤 다시 시도해주세요.':'로그인 링크를 보내지 못했어요. 이메일과 연결을 확인해주세요.'}finally{button.disabled=false}});
 window.addEventListener('online',()=>engine?.schedule(0));window.addEventListener('offline',()=>engine?.schedule(0));window.addEventListener('focus',()=>engine?.schedule(0));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')engine?.schedule(0)});
 return {start,changed(){engine?.schedule()},sync(){return engine?.sync()},userId:()=>user?.id||null,configured:!!config};
}
