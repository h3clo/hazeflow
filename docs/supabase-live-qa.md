# 실제 Supabase 동기화 QA (격리)

기준: 2026-11-11. 운영 `hazeflow`의 **개인 실계정·`main` 공간 기록**은 건드리지 않는다.

## 목적

Activity 2.0 이후 기기 간 동기화를 **테스트 전용 Auth 계정**으로 검증한다. 기본 `npm test`·Playwright는 가짜 서버/PGlite/sandbox UI만 사용한다. 라이브 하네스는 항상 DB `space=sandbox`만 쓴다.

## 현재 차단 상태 (에이전트 조사)

| 항목 | 결과 |
| --- | --- |
| Cursor Dashboard Secrets | 채팅에 값 금지. 로컬은 gitignore `.private/hazeflow-sync-qa.env` 사용 가능 |
| GitHub Actions Secrets | 6개 등록됨(2026-11-11). 워크플로 수동/주1회. 첫 실행 [42875539394](https://github.com/h3clo/hazeflow/actions/runs/42875539394) live **통과** |
| 운영 프로젝트 `hazeflow` | 스키마·`hazeflow_apply` 있음. **개인 계정/`main` 시험 금지** · QA 유저·`sandbox`만 |
| `family flow` 등 | 둘 다 실사용 → 새 무료 프로젝트 **불가**(한도 2) → **옵션 D 사용** |
| Preview Branch | 시간당 약 **$0.01344** — 합의 전 생성 금지 |
| 라이브 실행 (2026-11-11) | 시나리오 1–10 **통과**(가드 skip 1). Dashboard 로그인 만료 시 SQL로 QA 유저 생성 |

## 권장: 옵션 D — 같은 프로젝트 + 테스트 전용 계정 (무료 · 프로젝트 한도 불필요)

두 무료 프로젝트를 모두 쓰는 경우 **이것이 기본 경로**다. 새 프로젝트·pause·유료 branch 없이 된다.

1. Supabase → 프로젝트 **`hazeflow`** → **Authentication → Users → Add user**  
   - 테스트 전용 이메일 2개(개인 실사용 메일·비밀번호 금지. 예: `hazeflow-qa-a+…@…`).  
   - 비밀번호는 QA 전용으로만. 채팅에 붙이지 않는다.  
   - 가능하면 **Confirm email** 없이 바로 로그인 되게 만든다(또는 대시보드에서 확인 처리).
2. **Project Settings → API**에서 Project URL과 **anon / publishable** 키만 복사한다. `service_role`은 쓰지 않는다.
3. [Cursor Secrets](https://cursor.com/dashboard?tab=secrets)(또는 gitignore된 로컬 env)에만:

```text
HAZEFLOW_SYNC_TEST_URL=<hazeflow Project URL>
HAZEFLOW_SYNC_TEST_ANON_KEY=<anon/publishable only>
HAZEFLOW_SYNC_TEST_EMAIL=<qa-user-a>
HAZEFLOW_SYNC_TEST_PASSWORD=<qa-pass-a>
HAZEFLOW_SYNC_TEST_EMAIL_B=<qa-user-b>
HAZEFLOW_SYNC_TEST_PASSWORD_B=<qa-pass-b>
```

4. 채팅에 값 없이 **「시크릿 넣었어」**만 알려 주면, 다음 런에서 `node --test tests/supabase-live.optional.test.js`를 실행한다.

**격리 근거:** RLS가 `auth.uid()`로 행을 가른다. QA 유저는 개인 유저 행을 읽지/쓰지 못한다. 하네스는 `sandbox`만 사용해 실사용 `main` 기록과 키 공간을 나눈다.

**주의:** Secrets에 **개인 실계정** 이메일/비밀번호를 넣지 말 것. 넣으면 그 계정의 sandbox까지 시험 쓰기가 생긴다.

## 다른 옵션 (필요할 때만)

### 옵션 A — 별도 무료 프로젝트

프로젝트 한도가 남을 때만. pause/업그레이드 후 빈 `hazeflow-sync-qa` + 마이그레이션 + 테스트 유저 + 위와 같은 시크릿.

### 옵션 B — Preview Branch (유료)

시간당 약 $0.01344. **채팅에서 비용 합의 후**에만. 데이터 격리는 더 강하지만 필수는 아님.

### 옵션 C — 이미 있는 격리 환경

시크릿만 옵션 D와 동일 형식으로 넣으면 된다.

## 시나리오 매핑 (`tests/supabase-live.optional.test.js`)

| # | 시나리오 | 라이브 테스트 | 이미 자동 검증(로컬) |
| --- | --- | --- | --- |
| 1 | 로그인·로그아웃 | ready 시 | Auth 스토리지 단위 테스트 |
| 2 | A 생성 → B 반영 | ready 시 · `sandbox` | `tests/sync.test.js` fake server |
| 3 | A 종료 → B 반영 | ready 시 | sync + Playwright sandbox |
| 4 | 여러 활동 동시 진행 | ready 시 · independent | activity / sync 단위 |
| 5 | 대표 활동 변경 반영 | ready 시 · `preferences.activityUi` | `activity-primary-sync` + #34 |
| 6 | 오프라인 → 재연결 | ready 시 | sync offline 단위 |
| 7 | 동시 수정 충돌 | ready 시 · `hazeflow_apply` | PGlite `database.test.js` |
| 8 | 중복·손실 방지 | ready 시 · mutation 재전송 | sync idempotent 단위 |
| 9 | 레거시·독립 호환 | ready 시 | activity timing + sync |
| 10 | 계정 전환 격리 | EMAIL_B 있을 때 | RLS PGlite |

시크릿이 없으면 스위트는 **skip**이며 `npm test`를 실패시키지 않는다.

## 데이터 격리·정리 정책

- **격리:** QA Auth만 사용. 하네스는 `p_space='sandbox'`만. RLS로 다른 유저 행 불가. QA의 `main` 쓰기는 금지·검사에서 0건이어야 한다.
- **실행 중 정리:** 각 시나리오 `finally`에서 건드린 `item_key`를 `hazeflow_apply` tombstone(`deleted:true`)으로 되돌린다.
- **사후 정리:** QA 유저의 `sandbox` 행(활성·tombstone)은 관리 SQL로 물리 삭제해도 된다. **다른 유저·`main`·`family flow`는 절대 삭제하지 않는다.**
- **계정:** QA 유저 자체는 재실행용으로 남겨 둔다. 폐기할 때는 Dashboard/Auth에서 QA 이메일만 삭제.

## 비밀정보

- 값은 gitignore `.private/hazeflow-sync-qa.env` · Cursor Secrets · **GitHub Actions secrets**에만. **Git 추적·PR·채팅·Artifacts 로그에 비밀번호/anon JWT를 넣지 않는다.**
- `npm test` 기본은 시크릿 없으면 live **skip**(메시지: 실제 서버 미검증). `pages.yml`(Pages 배포)에는 live 시크릿을 넣지 않는다.

## GitHub Actions (수동·주 1회)

워크플로: `.github/workflows/supabase-live-qa.yml`

| 트리거 | 동작 |
| --- | --- |
| `workflow_dispatch` | Actions 탭에서 수동 실행. `require_secrets` 켜면 시크릿 없을 때 **실패** |
| `schedule` (일 18:00 UTC / 월 03:00 KST) | 시크릿 없으면 **실제 서버 미검증**으로 성공(skip). 있으면면 live 실행 |
| PR / `pages.yml` | **실행 안 함** |

로컬·CI 공통 진입점: `npm run test:live-supabase` → `scripts/run-supabase-live-qa.mjs`

- 시크릿 **없음** → exit 0 + **실제 서버 미검증**
- 시크릿 **일부만** → exit 1 (조용히 skip 하지 않음)
- 시크릿 **정상** → live 스위트 실행, 실패 시 exit ≠ 0

### 사용자가 Secrets 등록 (에이전트에 write 권한 없음 · 최소 단계)

1. GitHub → 저장소 **Settings → Secrets and variables → Actions → New repository secret**
2. 아래 이름 그대로 추가(값은 로컬 `.private/hazeflow-sync-qa.env` 또는 Supabase Dashboard에서, **채팅에 붙이지 말 것**):

```text
HAZEFLOW_SYNC_TEST_URL
HAZEFLOW_SYNC_TEST_ANON_KEY
HAZEFLOW_SYNC_TEST_EMAIL
HAZEFLOW_SYNC_TEST_PASSWORD
HAZEFLOW_SYNC_TEST_EMAIL_B
HAZEFLOW_SYNC_TEST_PASSWORD_B
```

3. Actions → **Supabase live QA** → Run workflow (처음엔 `require_secrets` 꺼도 됨. 등록 확인 후 켜서 검증).
4. (선택) Settings → Environments → `supabase-live-qa`를 만들고 시크릿을 Environment에만 둔 뒤, 워크플로에 `environment: supabase-live-qa` 한 줄을 추가하면 보호 규칙·승인 게이트를 걸 수 있다.

에이전트/`gh` 통합 토큰은 Secrets **403**이라 대신 등록할 수 없다.

## 금지

- 개인 실계정으로 로그인한 채 라이브 QA 실행 · `main` 공간 시험 쓰기/삭제
- service_role / `sb_secret_` 를 클라이언트·CI 로그·PR·Secrets 이름에 혼동해 넣기
- 승인 없는 스키마 파괴·유료 branch/프로젝트 생성
