# N1 검증 결과 — iOS 시뮬레이터 셸 스모크 (2026-11-11 · PR #43)

**범위:** 기존 Capacitor 셸을 iOS 시뮬레이터에서 빌드·실행. **Live Activity·Watch·Android 기능·DeX 구현 없음.** 웹앱 코드와 실사용 Supabase 기록은 바꾸지 않았다.

관련: [native-execution-plan.md](native-execution-plan.md) · [native-n0-verification.md](native-n0-verification.md).

## 환경

| 항목 | 값 |
| --- | --- |
| Mac Xcode | **27.2** (27B52). 약관·first launch 통과 |
| 개발자 경로 | 빌드만 `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`. 시스템 `xcode-select`는 Command Line Tools 그대로 |
| SDK | iOS 27.2 / Simulator iOS 27.2 |
| 시뮬레이터 | **iPhone 17** · iOS **27.2** · `5DCA0DF8-2DD6-4005-A40F-CBC738E36A34` |
| 서명 | 코드서명 신원 **0**. `DEVELOPMENT_TEAM` 미설정. 시뮬레이터 빌드·테스트는 `CODE_SIGNING_ALLOWED=NO` |
| 번들 | `io.h3clo.hazeflow` |

## 결과

| 항목 | 결과 |
| --- | --- |
| `npm run app:sync` | 통과. 웹 자산은 gitignore된 `ios/App/App/public` |
| `xcodebuild` Debug 시뮬레이터 | **BUILD SUCCEEDED** |
| 앱 실행 | 홈 화면에 Haze Flow 아이콘. 실행 시 **나의 하루** · 이 기기에 저장 중 |
| 주요 화면 | UI 테스트가 **오늘 · 계획(캘린더) · 기록(활동 기록) · 돈 관리(가계부) · 돌아보기(주간 회고)** 를 연다 |
| 활동 기록 | `N1simcheck`를 활동 시작으로 저장. 화면 카운트 **기록 1**, 상태 **진행 중 · 일상** |
| 로컬 저장 | 앱을 종료한 뒤 다시 실행해도 같은 기록이 남음 (UI 테스트 assert + 재실행 화면) |
| 로그인 폼 | **로그인**을 열어 이메일 칸이 있는 것까지 확인. 비밀번호는 입력하지 않음 |
| Supabase 로그인·동기화 | **미검증.** `.private/hazeflow-sync-qa.env`와 `HAZEFLOW_SYNC_TEST_*`가 이 Mac에 없음. 실계정은 사용하지 않음 |
| 실 iPhone | **미설치.** Apple ID / Personal Team이 Xcode Accounts에 없음 |
| `npm test` | **613 pass / 7 skip** |
| `npm run build` · `git diff --check` | 통과 |
| `N1SmokeUITests` | **passed** (48s) |

시뮬레이터 기록 `N1simcheck`는 이 시뮬레이터의 로컬 저장소에만 있다. 웹 Pages와 실사용 계정 데이터에는 쓰지 않았다.

## 추가한 검사

- `ios/App/N1SmokeUITests/N1SmokeUITests.swift` — 시뮬레이터 UI 스모크
- `npm run verify:native-n1` — Live Activity·Watch 타깃이 생기지 않았는지 구조만 확인. 시뮬레이터는 띄우지 않음
- `tests/native-n1-smoke.test.js` — 위 스크립트를 `npm test`에 포함

## 보류한 로컬 커밋

`e958a41` (되돌리기 세트 표시·캡처 종료 시각)은 `backup/local-undo-capture-end-20261111`에만 있다. `origin/main`과 `app.js`, `style.css`, `docs/PROJECT_GUIDE.md`, `docs/handoff-history.md`가 충돌해서 N1 브랜치에 합치지 않았다.

## 실 iPhone으로 가는 다음 단계

1. Xcode → Settings → Accounts에 Apple ID를 사용자가 직접 로그인 (Personal Team).
2. Signing에서 Team을 고르고 번들 `io.h3clo.hazeflow`로 기기 Run.
3. iPhone에서 개발자 앱 신뢰.
4. QA 계정만 로그인. 자격 증명은 gitignore된 `.private/hazeflow-sync-qa.env`에만 둔다.
5. 무료 서명은 약 7일 뒤 재설치가 필요하다. Push·TestFlight는 유료 프로그램이 필요하다.

다음 구현 시작점은 **N2** (iOS 활동 QA)다. Live Activity와 Apple Watch는 그 다음이다.
