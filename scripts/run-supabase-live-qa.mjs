#!/usr/bin/env node
/**
 * Run optional live Supabase QA with clear CI semantics.
 * - No HAZEFLOW_SYNC_TEST_* → exit 0, print "실제 서버 미검증" (unless REQUIRE=1).
 * - Partial secrets → exit 1 (misconfiguration; never silent skip).
 * - Full secrets → run tests/supabase-live.optional.test.js; failures fail the process.
 * Never prints secret values.
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const REQUIRED=['HAZEFLOW_SYNC_TEST_URL','HAZEFLOW_SYNC_TEST_ANON_KEY','HAZEFLOW_SYNC_TEST_EMAIL','HAZEFLOW_SYNC_TEST_PASSWORD'];
const PAIR_B=['HAZEFLOW_SYNC_TEST_EMAIL_B','HAZEFLOW_SYNC_TEST_PASSWORD_B'];
const requireSecrets=process.env.HAZEFLOW_SYNC_TEST_REQUIRE==='1';
const summaryPath=process.env.GITHUB_STEP_SUMMARY||'';

function present(name){
 const v=process.env[name];
 return typeof v==='string'&&v.trim().length>0;
}

function note(line){
 console.log(line);
 if(!summaryPath)return;
 try{appendFileSync(summaryPath,line+'\n')}catch(_err){/* ignore summary IO */}
}

const have=REQUIRED.filter(present);
const missing=REQUIRED.filter(n=>!present(n));
const bHave=PAIR_B.filter(present);
const bMissing=PAIR_B.filter(n=>!present(n));
const anon=process.env.HAZEFLOW_SYNC_TEST_ANON_KEY||'';

if(have.length===0&&bHave.length===0){
 note('## Supabase live QA');
 note('**실제 서버 미검증** — `HAZEFLOW_SYNC_TEST_*` 시크릿이 없습니다. 단위/PGlite/Playwright만 신뢰하세요.');
 if(requireSecrets){
  note('HAZEFLOW_SYNC_TEST_REQUIRE=1 이므로 실패로 종료합니다.');
  process.exit(1);
 }
 process.exit(0);
}

if(missing.length){
 note('## Supabase live QA');
 note('**설정 오류** — 일부 `HAZEFLOW_SYNC_TEST_*`만 있습니다. 누락: '+missing.join(', '));
 process.exit(1);
}

if(bHave.length&&bMissing.length){
 note('## Supabase live QA');
 note('**설정 오류** — 계정 B 시크릿이 불완전합니다. 누락: '+bMissing.join(', '));
 process.exit(1);
}

if(/YOUR_PROJECT|sb_secret_|service_role/i.test(anon)){
 note('## Supabase live QA');
 note('**설정 오류** — ANON 키에 service_role/placeholder가 감지되었습니다. publishable/anon만 사용하세요.');
 process.exit(1);
}

if(bMissing.length===PAIR_B.length){
 note('계정 B 시크릿 없음 — 시나리오 10(계정 격리)은 스위트 내에서 skip 됩니다.');
}

note('## Supabase live QA');
note('시크릿 확인됨 — 격리 QA 계정으로 `sandbox` 실제 서버 테스트를 실행합니다.');
note('- space: sandbox');
note('- 계정 B(격리): '+(bHave.length===PAIR_B.length?'yes':'no'));

const result=spawnSync(process.execPath,['--test','tests/supabase-live.optional.test.js'],{
 stdio:'inherit',
 env:process.env,
 cwd:root
});

if(result.error){
 console.error(result.error.message);
 process.exit(1);
}
const code=result.status??1;
if(code!==0){
 note('**실패** — 실제 서버 테스트가 실패했습니다.');
 process.exit(code);
}
note('**통과** — 실제 서버 테스트가 성공했습니다.');
process.exit(0);
