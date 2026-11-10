# 실제 Supabase 동기화 QA (격리)

기준: 2026-11-11. 운영 `hazeflow` 개인 기록·실계정은 건드리지 않는다.

## 목적

Activity 2.0 이후 기기 간 동기화를 **격리된** Supabase 프로젝트/계정으로 검증한다. 기본 `npm test`·Playwright는 가짜 서버/PGlite/sandbox만 사용한다.

## 현재 차단 상태 (에이전트 조사)

| 항목 | 결과 |
| --- | --- |
| Cursor 에이전트 Secrets | `HAZEFLOW_SYNC_TEST_*` 없음 |
| GitHub Actions Secrets | 이 환경에서 읽기/쓰기 권한 없음(403) |
| 운영 프로젝트 `hazeflow` | 동기화 스키마·`hazeflow_apply` 존재. auth 사용자 1명(실사용). **테스트 쓰기 금지** |
| 관련 없는 `family flow` | 별도 제품. 스키마 적용·데이터 시험 금지 |
| 무료 프로젝트 한도 | 조직 owner 무료 활성 프로젝트 **2개 한도**로 `hazeflow-sync-qa` 생성 거부 |
| Preview Branch | 시간당 약 **$0.01344** — 사용자 비용 합의 전 생성 금지 |

## 사용자가 할 최소 조치 (하나만 선택)

### 옵션 A — 격리 무료 프로젝트 (권장)

1. Supabase Dashboard에서 **사용하지 않는** 무료 프로젝트(`family flow` 등)를 pause 하거나, Pro로 올려 한도를 확보한다.
2. 에이전트/본인이 `hazeflow-sync-qa` 같은 **빈** 프로젝트를 만든다(월 $0 견적이어도 Dashboard 비용 확인 필요).
3. 이 저장소 `supabase/migrations/202610310001_account_sync.sql`을 그 프로젝트에 적용한다.
4. Auth에서 테스트 전용 사용자 2명 생성(이메일 확인 off 권장). 개인 이메일·비밀번호 금지.
5. Cursor Dashboard → Secrets(또는 로컬 `.env` gitignore)에만 아래를 넣는다. **채팅·PR·로그에 값을 붙이지 않는다.**

```text
HAZEFLOW_SYNC_TEST_URL=https://<qa-ref>.supabase.co
HAZEFLOW_SYNC_TEST_ANON_KEY=<publishable/anon only>
HAZEFLOW_SYNC_TEST_EMAIL=<qa-user-a>
HAZEFLOW_SYNC_TEST_PASSWORD=<qa-pass-a>
HAZEFLOW_SYNC_TEST_EMAIL_B=<qa-user-b>
HAZEFLOW_SYNC_TEST_PASSWORD_B=<qa-pass-b>
```

6. 실행: `node --test tests/supabase-live.optional.test.js`

### 옵션 B — Preview Branch (유료)

운영 `hazeflow`에 DB branch를 만들면 시간당 약 $0.01344가 청구된다. **채팅에서 비용 합의 후**에만 생성한다. 시크릿은 branch URL/anon + 테스트 유저로 옵션 A와 동일.

### 옵션 C — 시크릿만 제공

이미 격리 프로젝트/계정이 있으면 옵션 A의 환경 변수만 Cursor Secrets에 추가한다. 다음 에이전트 런이 라이브 스위트를 실행한다.

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

시크릿이 없으면 스위트는 **skip**이며 `npm test`를 실패시키지 않는다. 공간은 항상 `sandbox`만 사용한다.

## 금지

- 운영 `hazeflow`의 실사용자 행·`main` 공간 기록 수정/삭제
- service_role / `sb_secret_` 를 클라이언트·CI 로그·PR에 넣기
- 승인 없는 스키마 파괴·유료 branch/프로젝트 생성
