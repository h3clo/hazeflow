# 실제 Supabase 동기화 QA (격리)

기준: 2026-11-11. 운영 `hazeflow`의 **개인 실계정·`main` 공간 기록**은 건드리지 않는다.

## 목적

Activity 2.0 이후 기기 간 동기화를 **테스트 전용 Auth 계정**으로 검증한다. 기본 `npm test`·Playwright는 가짜 서버/PGlite/sandbox UI만 사용한다. 라이브 하네스는 항상 DB `space=sandbox`만 쓴다.

## 현재 차단 상태 (에이전트 조사)

| 항목 | 결과 |
| --- | --- |
| Cursor Dashboard Secrets | 채팅에 값 금지. 로컬은 gitignore `.private/hazeflow-sync-qa.env` 사용 가능 |
| GitHub Actions Secrets | 이 환경에서 읽기/쓰기 권한 없음(403) · CI는 라이브 skip 유지 |
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

## 금지

- 개인 실계정으로 로그인한 채 라이브 QA 실행 · `main` 공간 시험 쓰기/삭제
- service_role / `sb_secret_` 를 클라이언트·CI 로그·PR·Secrets 이름에 혼동해 넣기
- 승인 없는 스키마 파괴·유료 branch/프로젝트 생성
