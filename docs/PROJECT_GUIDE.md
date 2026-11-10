# Haze Flow 프로젝트 가이드 — 현재 작업 인덱스

> 기준일: 2026-11-08. 최신 사용자 지시와 실제 Git/코드 상태가 과거 문서보다 우선한다. 작업 시작에 필요한 내용만 읽고 상세는 관련 문서로 이동한다.

## 시작 순서

1. [AGENTS.md](../AGENTS.md)에서 데이터 보호·작업 범위·검증 규칙을 확인한다.
2. 아래 **현재 시작점**과 **작업 대기열**을 확인한다. 2주 실행 큐는 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md).
3. `git status --short`, 현재 브랜치·최근 커밋·관련 코드/테스트를 확인한다. GitHub에 없는 로컬 작업을 완료 또는 유실로 단정하지 않는다.
4. 해당 작업의 문서만 읽는다. 제품 원칙은 [PRODUCT_VISION.md](PRODUCT_VISION.md), 소비 데이터는 [payment-ledger-plan.md](payment-ledger-plan.md), 활동 UX 인계는 [UX_HANDOFF.md](UX_HANDOFF.md).
5. UI·화면 작업이면 아래 **실시간 화면 확인**을 먼저 맞춘다.
6. 작업 후 완료/미완료, 검증 근거, 배포 여부, 다음 시작점을 갱신한다. 긴 경과는 [handoff-history.md](handoff-history.md)에 남긴다.

## 실시간 화면 확인 (Cursor Browser · 기본)

Codex에서처럼 **로컬 앱을 옆 패널에서 보면서** UI를 고친다. HMR이 유지되도록 Vite를 한 개만 둔다.

1. `git branch`·`HEAD`를 확인하고, `lsof`/`curl`로 **5173에 리스너가 하나인지** 본다. `127.0.0.1:5173`과 `*:5173`이 동시에 있으면 localhost는 오래된 쪽을 탈 수 있으니 중복을 종료한다.
2. 최신 로컬 코드로 `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` (또는 동일 조건의 단일 서버)를 실행한다.
3. Cursor 내장 Browser를 **오른쪽(side) 패널**에 `http://127.0.0.1:5173/` 로 연다. **쿼리 없는 일반 앱**이 기본이다(`hazeflow-v1`). 사용자가 바로 클릭·조작할 수 있게 잠금만 필요한 자동화 구간에 짧게 쓴다.
4. 코드 저장 시 Vite HMR로 화면이 갱신되는지 확인한다. CSS가 안 바뀌면 스타일시트 하드 리로드만 하고, IndexedDB·계정 데이터는 지우지 않는다.
5. 위험·재현·회귀 점검은 `?sandbox&device=작업별이름`을 **별도 탭/세션**에서 한다. sandbox는 실제 기록과 저장 키가 다르다.
6. 서버를 다시 띄울 때 기존 기록·사진·Supabase 데이터를 초기화·삭제하지 않는다. push·배포는 승인 후에만.

## QA 책임 분리

- **사용자:** 실제 사용성(UX) 평가만. 기술 검증을 맡지 않는다.
- **Cursor:** 회귀·IndexedDB 유지·동기화/충돌 위험·기록·통계 보존·날짜·시간 경계·375/다크·콘솔·`npm test`/`build`를 자체 검증. 격리 sandbox만 사용. 미검증은 완료로 쓰지 않고 사유·남은 위험을 보고.
- 상세 규칙은 [AGENTS.md](../AGENTS.md) **QA 책임 분리**.

## 제품 목표 — 모든 작업의 판단 기준

**기록 → 실제 변화 발견 → 자신에 대한 이해와 응원 → 일상으로 다시 돌아올 힘.** Haze Flow는 생산성 점수나 연속 달성률로 사용자를 평가하지 않는다. 기록이 없거나 성과가 낮은 날을 실패로 취급하지 않고, 근거 없는 칭찬도 만들지 않는다. 기능·UX 판단의 상세 기준은 [PRODUCT_VISION.md](PRODUCT_VISION.md)의 **Haze Flow를 만드는 근본적인 이유**를 따른다. 이 비전은 새로운 기능의 자동 구현 승인이 아니다.

## 짧거나 막연한 지시를 받았을 때

사용자가 “이어서”, “알아서”, “전부”, “완성해줘”라고 해도 **제품 비전과 기존 합의가 유지된다.** [AGENTS.md](../AGENTS.md)의 **방향을 잃지 않기 위한 작업 요청 해석 규칙**에 따라 현재 시작점의 작은 작업부터 실제 코드·Git 상태를 확인해 진행한다. 성과 압박 UI, 근거 없는 칭찬, 새 기능 무단 추가, 기존 기록 삭제·대량 재수집, 전체 UI 교체, 무단 배포를 자동 승인으로 해석하지 않는다. 큰 방향 변경만 사용자에게 확인하고, 기존 결정을 반복 질문하지 않는다.

## AI 주도 설계 방식

사용자가 불편함을 말하면 AI가 실제 사용 시나리오를 분석해 **권장 기본안과 검증 방법을 먼저 제시**한다. 반복적인 선택 질문으로 UX 결정을 떠넘기지 않는다. 기존 제품·데이터·UI 변경 경계는 유지한다. 상세 규칙은 [AGENTS.md](../AGENTS.md), 운동 합의는 [WORKOUT_UX.md](WORKOUT_UX.md).

## 현재 시작점

**큐 진행:** [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md). 완료 즉시 다음. **일반 기능은 AGENTS.md 자율 병합·배포 조건 충족 시 병합·Pages까지.** 실계정·비가역 마이그레이션·PR F 물질화·네이티브/Watch는 사전 승인.

**다음 시작점:** UX sim 잔여(헤더 밀도 등) 또는 대기열. **활동 2.0 F·네이티브 금지.**

**완료 (Life 모바일 1열 · #29):** tip `1486957` · Pages #42848846217 success. 375폭 sandbox에서 활동/일정이 세로 스택·입력 전폭 확인(usable). live `main-BuseS_EM.css`에 1열 미디어쿼리 포함.

**완료 (활동 2.0 A~E · 2026-11-10):** #23~#28. `npm test` **597**.

**배포 (2026-11-10 · 홈 아이콘):** tip `f84c474` · PR #22. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42833697783) success (build 28s · deploy 51s). live에 `manifest.webmanifest`·`icon-*-haze-cloud-20261110.png`·apple-touch·favicon 확인. 앱 UI/데이터 미변경. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 데이터 안정성 회귀):** tip `4dcbcf7` · PR #21 merge. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42829622525) success (build 27s · deploy 6m23s). live `app-CVOZP2tV.js`에 `4dcbcf7`·가져오기 사진 롤백 문구 확인. `withImportedPhotos(keep)`·동일 id retain. **실기기·실계정 왕복 미검증.** URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 영상 즐겨찾기):** tip `9e5a52d` · PR #20. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42816357028) success. live에 `workout-video-fold`·「영상 즐겨찾기」확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 휴식 자동저장):** tip `39be17e` · PR #19. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42815359679) success. live `app-CKn_waX2.js`에 `workoutRests`·「세트 사이 휴식」확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 세트 완료 UX):** tip `e15de00` · PR #17. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42766391662) success. live `app-BUne-4Ie.js`에 `workout-set-done-mark`·`workout-item-finished` 확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 일정·할 일 stale 삭제):** tip `c72c82c` · PR #15. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42761685428) success. live `app-CPv7B32b.js`에「일정 삭제」·「찾을 수 없는 일정」확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 달 이동 a11y):** tip `1c90388` · PR #14. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42760336135) success. live `app-CTSmemSL.js`에「이전 날짜」·「다음 달」확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · Classic 일기 접힘):** tip `7b98c9c` · PR #13. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42759763321) success. live `app-B0USC12G.js`에 `classic-diary-fold`·`7b98c9c` 확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · Classic 건강 접힘):** tip `b1c340f` · PR #12. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42759069131) success. live `app-Bf-rOnt6.js`에 `classic-health-fold`·`b1c340f` 확인. URL https://h3clo.github.io/hazeflow/ .

**배포 (2026-11-10 · 미병합 PR 일괄):** tip `90459c5`. 포함 — 시안 문서(#4), 캡처 추가설정 좁은 폭(#6), 가계부 도구 접기(#7), 가계부/자산/일정·루틴·사진·운동 stale 가드(#8–#10), 백업 export/import 게이트 테스트(#11). 로컬·Actions `npm test` **536** · build. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42758126437) success (build 23s · deploy 9s). 복구 태그 `pre-deploy-before-batch-2026-11-10`=`a2930e6`. URL https://h3clo.github.io/hazeflow/ (번들 `app-Ct7AFvn1.js`에 `90459c5`·`money-tool-fold` 확인). 스키마·실계정 데이터 변경 없음. **실기기·로그인 왕복 미확인.**

### 자동화 자율 범위 (2026-11-09 확정 · ~2026-11-16 00:00 KST)

목표: 남은 Cursor 사용량으로 Haze Flow를 **가능한 범위에서** 진전. 문서·코드의 미완료를 분석해 아래를 **모두** 충족하는 작업 1건을 자동 선정·구현한다.

**포함(별도 승인 없이 진행):** 기존 기능 버그 수정 → 접근성 → 사용성 → 반응형 → 테스트 보강 → 데이터 내보내기·복원 안정성. 비전 일치·운영 DB/Supabase 스키마/인증 불변·기존 기록 비손상·낮은 의존성·독립 검증 가능·Classic/Life 비훼손·기존 기능 비중복·**별도 브랜치+PR**. 사용자 승인 시 병합·Pages 배포 가능.

**제외(자동 승인 아님):** 실계정 동기화 검증, 데이터 마이그레이션, 결제 원장 변경, 대규모 기능, Q4-B 2·4~6, 전면 UI 교체, 실제 사용자 데이터 필요 작업.

**실행 규칙:** 매 런 1건. 구현·`npm test`/`build`/`diff --check`(코드 시)·가이드 갱신 후 PR. 적합한 작업이 정말 없으면 이유만 보고하고 종료.

**배포 (2026-11-09 · Life 디자인):** PR #5 → `main` merge `794d24f`(후속 문서 `a2930e6`). 복구 태그 `pre-deploy-before-life-2026-11-09`=`bdffffb`. Actions [Run](https://github.com/h3clo/hazeflow/actions/runs/42591226027) success. URL https://h3clo.github.io/hazeflow/ . Life: 설정 → Today 화면 디자인 → **새 디자인** → 저장(기기 로컬 `*-ui-design`, 스키마·동기화 불변). **실계정 Supabase 왕복은 단위/sandbox만.**

**전체 UX·품질 감사 (2026-11-08 · 로컬, 미배포)**
- 화면: Today/계획/기록/돈/돌아보기 · 375·1280 · sandbox `ux-audit-nov8`. 콘솔 오류 없음. 표는 `.table-scroll`로 페이지 가로 넘침 없음.
- **수정:** 종료 후 휴식 위젯 잔존(`shouldKeepRestTimer`+`syncRestWithSession`) · sticky와 아젠다 끝내기 중복 제거 · `aria-current="false"` 제거 · 다크 primary 대비(`--accent-fill` 4.78:1) · 무라벨 `＋` 제거(이전).
- **후속:** 캡처에서 세트를 완료한 뒤 저장하면, 끝난 활동은 휴식을 끄고 진행 중 근력만 새 기록으로 휴식을 옮김(`captureRestAfterSave`). 초안이 없어지면 캡처 휴식을 유지하지 않음.
- 검사: `npm test` **505** · build · `diff --check` · sandbox 재현.
- **제안(일부 진행):** 좁은 폭 캡처「추가 설정」·가계부 도구 접기·Classic 건강 요약·일기 미리보기 접힘. 남은 제안: Q4-B 2·4~6(미승인)·실사용 피드백.
- **미검증:** 실기기·백그라운드 타이머·실계정 Supabase 왕복·사진 실기기.

**배포 (2026-11-08):** `731cbbc`→`b17f5cf` 일반 push (force 없음). Actions [Run #101](https://github.com/h3clo/hazeflow/actions/runs/42489282618) success (build 26s · deploy 10s). URL https://h3clo.github.io/hazeflow/ . Pages 번들 `app-CtR-TtyP.js`·account에 `b17f5cf`·`운동 중`·`data-rest-primary`/`complete-set` 확인. **실기기·로그인 왕복 미확인. 감사 수정분은 미배포.**

**배포 전 자체 QA (2026-11-08, `54bdc39`→`b17f5cf` · sandbox `qa-predeploy-54b`)**
- 자동: `npm test` **504** · `build` · `diff --check`. 스키마 bump·기록 삭제·실계정 시험 없음. `endDate`/`endTime` 재사용, `workoutSetDone` 비동기화.
- sandbox: 같은 자리 휴식 흐름·한 줄 추가 하단·캡처 종료·새로고침 text 유지·종료 후 set-done 없음·375/다크.
- 동기화·사진·실기기·백그라운드 타이머·실계정 Supabase 왕복: **미검증**(단위 테스트만).

**Q0 · 완료 (2026-11-08)**
- 백업 `backup/pre-q0-local-wip` → `origin/main` FF → 로컬 UX/계획 cherry-pick. 강제 reset 없음.
- 기준선: `npm test` **483** pass → 활동 UX 후 **484** pass, `npm run build` 통과. 푸시·배포 없음.

**활동 기록 UX (Q1–Q2) · 구현·검사 완료, 배포 미함**
- 한 줄 입력(`지금 뭐 하고 있어?`), 액션 바(활동 시작/짧은 기록/기록/분류 배지), `추가 설정`에 카테고리·시간·사진·식사/운동 옵션.
- `manualKind` 수동 우선, 입력 중 `classifyActivity` 배지, 저장 시 자동 분류. sandbox에서 「영어 공부 시작」→ 공부 선택 확인.
- 기존 활동·사진·운동·동기화 경로 보존. 배포·실기기 왕복은 미확인.

**운동 UX (Q3-A/B/C) · 구현·검사 완료, 배포·실기기 미함**
- Q3-A 종목별 자극. Q3-B text 정본 + 세트 UI + optional `workoutPlan`. Q3-C 세트 완료→휴식 경과(`startElapsed`). 설계: [WORKOUT_UX.md](WORKOUT_UX.md).

**소비 데이터 (Q4)**
- Q4-A 조사 완료(2026-11-08): `logs[].money` ↔ 원장 목표 매핑·단계 0~6.
- Q4-B 단계 1+3 완료(2026-11-08): 읽기 전용 `money-diagnose` · 은행/카드 CSV 미리보기(`bank-csv-preview`). 기존 `logs[].money` 유지, 자동 수정·저장·동기화 없음. 합성 CSV·단위 테스트만. **단계 2·4~6·푸시·배포·계정 변경 없음.**

**iCloud:** 별도 큐 I0–I3. **다른 프로젝트에서 진행 중(2026-11-10 사용자 확인).** 이 저장소 AI는 접근·변경·대기하지 않음.

**Q5 · 통합 회귀 (2026-11-08) · 자동·sandbox 완료, 배포·실기기 미함**
- `npm test` **496** · `build` · `diff --check`. 로컬 `main`이 `origin/main`보다 ahead(기능 7 + Q5 문서).
- sandbox: 활동 자동/수동 분류·저장, 운동 세트 수정·추가·삭제·한 줄 추가·휴식 경과 위젯, 가계부 진단·CSV 미리보기(저장 없음), 375폭 넘침 없음, 다크모드 전환.
- 사진·동기화·오프라인: **단위 테스트**로 확인. **실기기·계정 왕복 미확인.**

**배포 (2026-11-08):** `bb06cfc`→`340a8ff` 일반 push. Actions [Run #99](https://github.com/h3clo/hazeflow/actions/runs/42474818597) success (build 25s · deploy 9s). URL https://h3clo.github.io/hazeflow/ . sandbox 스모크: 가계부「기록 진단」·CSV 미리보기 버튼, 활동「영어 공부 시작」→공부 배지. **실기기·로그인 왕복 미확인.**

## 작업 대기열

### P0 · 데이터 보존·실사용 오류
- [x] PR #6–#20 데이터 안정성 회귀 + 가져오기 사진 롤백(2026-11-10): PR #21 → `main` `4dcbcf7` · Pages 배포. **실기기·실계정 왕복 미검증.**
- [ ] iPhone 신규 사진 저장/재접속/Mac 표시 실기기 확인. (웹 단위 테스트만 통과 · **실기기 미확인**)
- [ ] iPhone ↔ Mac 활동 시작·종료·편집·충돌 및 오프라인 복귀 검증. (`tests/sync*.js` 통과 · **실기기 미확인**)
- [ ] 저장·삭제·토글·사진·계정 전환의 오래된 화면 충돌 보호 — 단위 회귀 추가됨. **실기기·실계정 왕복은 미확인.**
- [x] sandbox 375폭·다크모드 전환 확인(Q5). 입력 중 렌더·실기기 좁은 폭은 미확인.

### P1 · 활동 기록 입력 UX
- [x] 한 줄 입력·자동 분류/수동 우선·활동 시작/짧은 기록·추가 설정 (Q1–Q2). 검사 484·빌드·sandbox 분류 확인. **배포·실기기 미함.**
- [x] 종료 접근성: sticky `.ongoing-finish-bar`(진행 중만). 명시 종료 보존·다음 시작 자동 종료·빈 시간 허용 유지. sandbox 검증. **푸시·배포·실기기 미함.**
- [ ] 실기기에서 활동 UX 확인(선택).
- [x] 좁은 폭 캡처「추가 설정」터치(summary 44px)·분류 4열(Classic/Life). `tests/capture-extra-settings.test.js` · sandbox 375 확인. **별도 PR·병합·배포 없음.**

### P1 · 운동 기록 실사용 오류 및 입력 흐름 (설계 합의, 코드 미검증)
- [x] 자극 부위 교차: 종목별 `exerciseMuscles` + 합집합 `muscles`(Q3-A). 배포·실기기 미함.
- [x] 운동별 세트 목표/실제: `workout-sets.js` + 캡처/오늘 기록 UI. text 정본, optional `workoutPlan`. 파괴적 마이그레이션 없음(Q3-B).
- [x] 세트 완료→휴식 경과, 과거·일괄 입력 미시작. 백그라운드 미보장(Q3-C).
- [x] sandbox 브라우저: 세트 수정·한 줄 추가·휴식 경과·과거 미시작·375폭 겹침 없음(2026-11-08).
- [x] 실사용 UX 구현(2026-11-08): 오늘 진행 중 `.live-workout-session` 우선 배치·상단 한 줄 추가(`appendWorkoutLine`+`writeWorkoutText('log')`)·`workoutAppendBusy` 가드. 아젠다 compact. sticky `.ongoing-finish-bar`. 종료 로직 미변경. `npm test` 498·build·sandbox 375/다크. **푸시·배포·실기기 미함.**
- [x] 세션 제목·휴식·사후 기록·세트 없는 UI(2026-11-08): `운동 중`/`운동`+요약. 자유 휴식·목표 details. 캡처 선택 `endDate`/`endTime`(`captureActivityEnd`). 종목 추가 유지·골라 담기 details·느낌은 strength/기존 feedback. 스키마/Health/소요분만 없음. **푸시·배포·실기기 미함.**
- [x] 한 손 조작(2026-11-08): 휴식 위젯 같은 자리 `다음 세트 시작`↔`세트 완료`, 세션 한 줄 추가를 세트 아래, 종료된 오늘 기록에서 세트 완료/휴식 숨김, primary 대비. **푸시·배포·실기기 미함.**
- [x] QA 책임 분리(2026-11-08): 사용자는 UX만, Cursor가 회귀·저장·동기화 위험·경계·375/다크·콘솔을 자체 검증([AGENTS.md](../AGENTS.md)).
- [x] 전체 UX·품질 감사 1차(2026-11-08): 종료→휴식 정리·끝내기 중복·aria-current·다크 primary 대비. **로컬만 · 푸시·배포 없음.**
- [ ] 헬스장 실기기·백그라운드 타이머·감사 수정분 배포 후 확인. **전면 개편 자동 승인 아님. 기술 QA는 사용자에게 넘기지 않음.**

### P1 · 소비 데이터 구조 전환
- [x] Q4-A 매핑·안전 단계 0~6 제안. 계정·`.private` 실데이터는 미확인.
- [x] Q4-B 단계 1: 읽기 전용 기록 진단(`money-diagnose.js` + 가계부「기록 진단」). 자동 수정/삭제 없음.
- [x] Q4-B 단계 3: 은행·카드 CSV 미리보기·중복 **후보**만(`bank-csv-preview.js`). 가계부·Supabase·IndexedDB 미저장.
- [ ] Q4-B 단계 2·4~6(스키마 초안·연결 ID·미연결 UI·마이그레이션): **미승인.**
- [ ] 은행·카드·현금영수증 출처별 검토, 중복/환불/다대다 연결, 미연결 결제 확인 흐름.
- [ ] 기존 쇼핑몰 자료 연결·마이그레이션은 승인 후. 과거 보완 JSON 자동 적용 금지.

### P1 · 돌아보기 위계 (방향 1 · 2026-11-09)
- [x] Today: 빈 아젠다 `min-height` 제거, 데스크톱 기록열 먼저, 주간 스트립 `details` 접기. 스키마/기능 추가 없음.
- [x] 주간 회고: 「나의 주간 회고」상단, 건수·차트는 `details.review-metrics`로 접기. `weeklyReviews` 필드 유지.
- [x] 과거 비교: 그날 스냅샷 카피 + 빈 날 `compare-discovery`(가까운 기록·일기/사진) 강조. 프리셋 유지.
- [ ] 사용성 검토(PR #3) · **시안 선택 전 앱 비주얼 리뉴얼 착수 금지.**

### P1 · 비주얼 디자인 방향 (2026-11-09)
- [x] 시안 A/B HTML·문서화 후 **사용자 기각**. 혼합 진행 안 함. 추가 변형·시안 수정 **중단**.
- [x] AI 사진 일기 아이디어는 문서에만 유지([UI_DESIGN_DIRECTIONS.md](UI_DESIGN_DIRECTIONS.md)). **구현 없음.**
- [ ] 사용자 레퍼런스 이미지 제시 후 디자인 방향 재설정. 그전까지 디자인·앱 UI 코드 작업 없음. PR #3·#4 미병합.

### P1 · Today Life 디자인 모드 (시안 시각 재구성 · 2026-11-09)
- [x] Classic 기본·설정 전환·`*-ui-design` 유지. 스키마/동기화 불변.
- [x] Life Today 전용 DOM: 헤더·잎/하늘 실사 에셋(`public/life/`)、가로 진행 패널(실제 일정·루틴·기록·할 일)、3열(활동/일정·한 줄/루틴·메모). 가상 목표 없음.
- [x] 검사 `npm test` 515 · build · sandbox 시안 나란히 비교. **Pages 배포 완료(2026-11-09).** 실사용 피드백 대기.

### P2 · 기존 기능 완성
- [ ] 건강/식단/인바디 비교 및 추정·누락 표시. (Reflect 기간 서사와 묶지 말 것 — 생활 상태 링크 우선)
- [ ] 공부 일시정지/재개, Obsidian/블로그 연결 실제 동작 검증.
- [ ] 결제와 연결된 검증 상품만 가격·구매 간격·단위가격 분석.
- [ ] 가족·자산·연간 소득/세금 자료의 중복 합산 방지 및 검증.

### P3 · 이후 검토
- [ ] 알림, 외부 AI, 설치형 앱/건강 연동은 별도 승인과 보안·비용 검토 후 착수.
- [ ] **AI 사진 일기** (사진+글 → 매거진/포토 에세이 조판): [UI_DESIGN_DIRECTIONS.md](UI_DESIGN_DIRECTIONS.md). 기존 텍스트 AI 초안과 별개. **미승인.**
- [ ] **AI 운동·루틴 추천** (기록 기반 운동 추천·루틴 추천): 사용자 희망(2026-11-10). 후순위·**미승인·구현 금지.** 외부 AI/비용·개인 기록 보호 검토 후.
- [x] **유튜브·홈트 영상 즐겨찾기**(링크형 · 접힘 · 최근 3 · 외부 열기): 시안 v2 기준 구현(2026-11-10). 인앱 재생·계정 연동 없음. **실기기 확인 미함.**
- [x] **휴식 경과 자동 저장**(탭 계산 · 수동 입력 없음 · `workoutRests`): 2026-11-10. 통계 화면·실기기 왕복은 미확인.
- [ ] 전면 비주얼 시스템 교체 · 월↔월/연↔연 구간 비교 UI — 시안 선택·위계 검토 이후. **현재 미승인.**

## 관련 문서

- [2주 개발 계획](DEVELOPMENT_PLAN.md) · [제품 비전·UX](PRODUCT_VISION.md) · [운동 기록 UX](WORKOUT_UX.md) · [활동 UX 인계](UX_HANDOFF.md)
- [결제 원장 중심 설계](payment-ledger-plan.md)
- [저장·동기화](sync-reliability.md) · [공부](study-flow.md) · [알림](notifications-plan.md)
- [현재 쇼핑몰 파일 가져오기(레거시)](shopping-connection.md) · [기존 영수증 대조(레거시)](receipt-reconciliation.md)
- [소득](income-records.md) · [세금](annual-tax-records.md) · [앱](mobile-app.md)
- [이전 인계 이력](handoff-history.md). 과거 날짜의 완료·대기 상태를 현재 지시로 재해석하지 않는다.

## 검증·배포·인계

```sh
npm ci
npm test
npm run build
git diff --check
```

문서만 바꾼 경우 코드 테스트를 실행했다고 보고하지 않는다. `main` push는 Pages 배포를 유발할 수 있다. 사용자 승인 없는 배포·개인 데이터 수정·무단 재수집 금지. 완료한 작업은 대기열에서 제거하고 다음 시작점을 갱신한다.

**최근 (2026-11-10):** 열린 PR #4·#6–#11 `main` 일괄 병합·Pages 배포. 로컬 536 tests.

**이전 (2026-11-09):** 자동화 자율 범위 문서화 + 좁은 폭 캡처「추가 설정」터치/4열. Today Life Pages 배포됨. UI 시안 A/B·AI 사진 일기 아이디어는 문서만(시안 기각).

**이전 (2026-11-09):** 제품·UX 공동검토 방향 1(위계) 구현 — `app.js`/`feature-ui.js`/`style.css` + `tests/feature-ui-hierarchy.test.js`.

**이전 (2026-11-08):** `b17f5cf` Pages 배포 성공(Actions #101). 전체 UX 감사 수정은 로컬/후속 커밋. Q4-B 2·4~6 미승인.
