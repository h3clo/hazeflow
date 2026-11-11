# Haze Flow 네이티브 실행 계획 (iOS · Android · Apple Watch · DeX)

기준: 2026-11-11. **분석·설계·N0 검증.** 이 문서는 다음 AI가 구현 PR을 순서대로 열 수 있게 하는 실행 계약이다. **기능 구현(Live Activity·알림·Watch UI)은 별도 승인 또는 가이드 다음 시작점이 N1 착수로 바뀐 뒤.**

**제품 우선순위 (2026-11-11 사용자 확정):** 1. **iPhone** → 2. **Apple Watch** → 3. **Android** → 4. **Samsung DeX 웹**. 사용자가 가장 자주 쓰는 기기는 iPhone이다.

근거 문서: [mobile-app.md](mobile-app.md) · [native-readiness.md](native-readiness.md) · [notifications-plan.md](notifications-plan.md) · [supabase-live-qa.md](supabase-live-qa.md) · [activity-system-2-pr-a.md](activity-system-2-pr-a.md) · Apple Developer Account Help · Capacitor Local Notifications API · [Samsung DeX web guide](https://developer.samsung.com/browser/android/web-development-guide-for-dex.html) · [Samsung DeX FAQ](https://developer.samsung.com/samsung-dex/faq.html).

---

## 0. 한 줄 결론

| 질문 | 답 |
| --- | --- |
| iOS·Android 가능? | **가능.** 기존 Vite SPA + Capacitor 8 셸을 재사용. 활동/동기화는 JS 도메인 유지. |
| Apple Watch 가능? | **가능하되 Capacitor 웹뷰가 아님.** SwiftUI 워치 타깃 + (권장) iPhone 중계 + 선택적 Supabase. 일상 활동 포함. |
| **Samsung DeX?** | **웹(PWA/브라우저) 우선.** DeX 전용 앱·플랫폼 분기 **금지.** Android 네이티브는 DeX에서도 실행 가능하나, DeX 데스크 사용의 기본 경로는 웹. |
| 웹 재사용? | **도메인·동기화·UI 대부분 재사용.** Live Activity / 지속 알림 / Watch UI만 네이티브. |
| N0 환경 검증? | **부분 완료** — Linux에서 `build:app`+`cap sync`+구조 검증 통과. **iOS 시뮬/실기기 컴파일은 사용자 Mac 대기.** 상세 [native-n0-verification.md](native-n0-verification.md). |
| 지금 기능 구현? | N1 시뮬레이터 스모크는 2026-11-11 통과. Live Activity 첫 구현은 [PR #46](https://github.com/h3clo/hazeflow/pull/46). Watch·원격 푸시·Android는 아직. |
| 유료 필수? | **개인 기기 디버그 설치는 무료 Personal Team으로 가능(7일 재설치).** Push·TestFlight·스토어·일부 entitlement는 **유료 Apple Developer Program(~$/년)** 필요. Google Play 게시는 별도. |

---

## 1. 현재 프로젝트 사실 (코드 기준)

### 1.1 스택 (React 아님)

- **Vanilla JS + Vite SPA** (`app.js`, `domain.js`, …). React/Next 없음.
- **Capacitor 8** (`@capacitor/core|ios|android|app`, `capacitor.config.json`, `ios/`, `android/`).
- 앱 Id `io.h3clo.hazeflow`, deep link `io.h3clo.hazeflow://auth/callback` (`native-app.js`, Info.plist).
- 빌드: `npm run build:app` (`HAZEFLOW_NATIVE=1`) → `cap sync`. Pages는 `/hazeflow/`, 앱은 `/`. **`server.url`로 Pages를 앱에 고정하지 않음.**

### 1.2 이미 있는 네이티브 훅

`native-app.js` + `app.js` `setupNative`:

- `appUrlOpen` / launch URL → PKCE 인증 복귀
- `appStateChange` → `account.resume()` / `pause()` (백그라운드에서 갱신 중단)
- Android `backButton` 스택

**없음:** Local Notifications 플러그인, Live Activities, Foreground Service, Watch 타깃, Keychain 세션.

### 1.3 활동 시스템 2.0 · 동기화 (재사용 핵심)

| 모듈 | 역할 | 네이티브 재사용 |
| --- | --- | --- |
| `activity-timing.js` | 레거시 체인 vs `independent` | **필수 공유** — Watch/네이티브도 동일 해석 |
| `activity-primary.js` | 대표 활동 LWW (`preferences.activityUi`) | **필수 공유** |
| `sync-engine.js` / `sync-state.js` / `cloud.js` | pull/push/`hazeflow_apply`, 충돌 | 폰 앱 WebView에서 **그대로** |
| IndexedDB 기록·사진 | 오프라인 정본 | Capacitor WebView에서 유지 |
| `foreground-reminders.js` | 화면 보일 때만 폴링 | 네이티브 알람으로 **보강** 필요 |

서버: `hazeflow_records` + RLS. CI live QA 통과(2026-11-11). **스키마 변경 없이** 네이티브 확장 가능.

### 1.4 이 클라우드 에이전트 환경 (N0 실측 2026-11-11)

- OS: Linux. **`xcodebuild`/`pod` 없음.** `ANDROID_HOME` 없음 → `assembleDebug` SDK location 실패.
- **통과:** `npm run build:app`, `npx cap sync`, `npm run verify:native-n0`, `npm test` 617 pass/2 skip.
- **iOS/Watch 컴파일·실기기 설치는 사용자 Mac에서만.** 에이전트는 문서·JS·구조 검증·웹 회귀.

---

## 2. 목표 기능 → 기술 매핑

### 2.1 iOS · Android (Capacitor WebView + 얇은 브리지)

| 목표 | 구현 위치 | 비고 |
| --- | --- | --- |
| 활동 시작·종료·동시 진행 | 기존 웹 UI + `activity-timing` | 네이티브 셸에서 스모크로 검증 |
| 대표 활동 표시·변경 | `activity-primary` + sync | 이미 계정 동기화됨 |
| 앱 종료·잠금 후 진행 유지 | IndexedDB 로그 + 명시 end 없음 = ongoing | OS가 프로세스를 죽여도 **기록은 유지**. 타이머 UI는 재계산 |
| iOS Live Activities | **Swift ActivityKit Widget Extension** + JS 브리지 | Capacitor만으로는 UI 불가. 써드파티 Cap 플러그인 검토 가능하나 **활동 모델이 커스텀**이므로 in-repo 브리지 권장 |
| Android 지속 알림 | **Foreground Service** + ongoing notification (Kotlin/플러그인) | Android 8+ 채널, 13+ POST_NOTIFICATIONS |
| 네이티브 알림·알람 | `@capacitor/local-notifications` (+ Android exact alarm 권한 검토) | 현재 웹 알림은 포그라운드 폴링만 |
| 오프라인·Supabase | 기존 `sync-engine` | QA 계정으로만 초기 시험 |

### 2.2 Apple Watch (SwiftUI · Capacitor 불가)

| 목표 | 권장 설계 |
| --- | --- |
| 진행 중 활동 확인 | Watch UI가 **같은 로그 필드** 표시 (`id`, `text`, `time`, `end*`, `activityTiming`) |
| 시작·종료·대표 변경 | Watch → **WatchConnectivity**로 iPhone에 의도 전달 → iPhone이 IndexedDB/sync-engine에 기록 → (가능하면) 즉시 `hazeflow_apply` |
| iPhone과 동기화 | 1순위 WCSession 페이로드(ongoing 스냅샷). 2순위 Watch가 네트워크 있을 때 Supabase REST/JS 없음 → **Swift URLSession + anon/JWT**(복잡도↑, 후순위) |
| 일상 활동 | WorkoutKit/HealthKit **필수 아님**. 텍스트·종류 기반 일반 활동 UI |

**Watch를 운동 전용으로 제한하지 않는다.** HealthKit은 별도 승인·후순위.

---

## 3. 무료 vs 유료 · 개인 기기 사용

출처: [Apple Developer Account overview](https://developer.apple.com/help/account/basics/about-your-developer-account/).

### 3.1 무료 Apple Account (Xcode Personal Team)

**가능**

- 시뮬레이터 빌드·실행
- 본인 iPhone에 Xcode로 설치·디버그
- 기본 앱 기능, 로컬 Live Activity(앱이 직접 start/update/end), 로컬 알림(권한 허용 시)
- Watch 시뮬레이터·(제한적) 페어링 디버그

**제약 (공식)**

- Provisioning profile **발급 후 7일 만료** → 재빌드·재설치 필요
- 기기 **최대 3대**, 기기당 앱 **최대 3개**, App ID **최대 10**(각각 7일)
- **TestFlight / App Store / 유료 capability**(원격 Push, 일부 Associated Domains 등) 불가
- Live Activity의 **푸시 기반 원격 업데이트**는 Push Notifications entitlement → **유료 프로그램 필요**로 본다

### 3.2 유료 Apple Developer Program (~$/년) — **지금은 가입 강제하지 않음**

필요해지는 시점만 보고:

- 7일마다 재설치하기 싫을 때
- TestFlight로 여러 기기/장기 베타
- 원격 Push로 Live Activity 갱신
- App Store 배포

### 3.3 Android

- Android Studio + USB 디버그 APK: **무료**, 만료 주기 없음(디버그 서명)
- Play 스토어 게시는 Play Console 등록(비용·심사) — **개인 사용만이면 사이드로드로 충분**

### 3.4 GitHub Actions 자동화 범위

| 가능 | 제한 |
| --- | --- |
| 기존 `npm test` / Playwright / Supabase live QA | 그대로 유지 |
| `ubuntu`에서 Android debug APK 빌드(나중) | 서명·실기기 설치는 로컬 |
| Public repo의 `macos-latest`로 `xcodebuild` 시도(나중) | 서명·시크릿·약관·시뮬 부트 비용. **실기기·Watch 페어링 불가** |
| 클라우드 Cursor 에이전트 | **Mac/Xcode 없음** → iOS/Watch 컴파일 대행 불가 |

---

## 4. 권장 아키텍처

```text
┌─────────────────────────────────────────────────────────┐
│  Web (GitHub Pages)  ·  Capacitor iOS/Android WebView     │
│  domain / activity-timing / activity-primary / sync-engine │
│  IndexedDB + photos + hazeflow_apply (Supabase)            │
└───────────────┬───────────────────────────┬─────────────┘
                │ Capacitor bridge          │ WatchConnectivity
                ▼                           ▼
     ┌──────────────────┐         ┌─────────────────────┐
     │ iOS WidgetKit /  │         │ watchOS SwiftUI app │
     │ ActivityKit      │         │ (일상+운동 공통 UI)  │
     └──────────────────┘         └──────────┬──────────┘
     ┌──────────────────┐                    │ optional later
     │ Android FGS +    │                    ▼
     │ ongoing notif    │         Supabase (JWT) — 후순위
     └──────────────────┘
```

### 4.1 단일 해석 규칙 (필수)

1. **정본은 로그 레코드** (`logs[]` / `["logs", id]`). 네이티브 UI는 표시·의도만.
2. `activityTiming` 없음 = 레거시, `'independent'` = 명시 종료만. Watch도 동일.
3. 대표 활동 = `preferences.activityUi` LWW. 네이티브/Watch가 바꿀 때도 **같은 필드**에 쓰고 sync.
4. 충돌·오프라인 = 기존 `sync-engine` 경로. Watch는 “의도 큐”를 iPhone에 넘겨 폰이 적용.
5. **개인 실계정·`main`으로 초기 네이티브 시험 금지** — QA Auth + (필요 시) sandbox.

### 4.2 백그라운드 기대치 (과장 금지)

- OS는 백그라운드 JS 타이머를 **보장하지 않는다**.
- “진행 유지” = **종료 시각이 비어 있는 기록이 남는 것** + 잠금 화면 Live Activity/지속 알림이 **표시**되는 것.
- 정확한 알람은 Local Notifications 스케줄에 의존. Doze/집중 모드로 지연될 수 있음.

### 4.3 알림 권한

- iOS: 최초 사용자 제스처 후 요청. Critical/Time Sensitive는 정책·심사 이슈 → 초기엔 일반.
- Android 13+: `POST_NOTIFICATIONS`. FGS 타입은 용도에 맞게 선언(특수 용도/`dataSync` 등 — 구현 PR에서 최소 권한).

---

## 5. 단계별 PR 계획 (구현은 승인 후)

난이도: L=낮음 · M=중간 · H=높음. 의존 ↓.

| PR | 제목 | 내용 | 난이도 | 의존 | 자동 검증 | 실기기 필수 |
| --- | --- | --- | --- | --- | --- | --- |
| **N0** | 환경 검증 + 계획 | Linux: build/sync/구조. Mac 시뮬은 사용자. iOS 우선 문서 | L | — | `verify:native-n0` · unit | Mac은 사용자 |
| **N1** | **iOS** 셸 스모크 | 사용자 Mac: Xcode 약관, `app:sync`, **iOS Simulator** Run, QA 로그인·Today. **기능 추가 없음**. Android는 열기/현황만 | L | N0 | `npm test`/`build`; Sim 스크린샷 | Sim으로 N1 가능 |
| **N2** | iOS 셸 활동 QA | QA로 시작/종료/동시/대표·딥링크 스모크 | L | N1 | unit/e2e/live | iPhone 권장 |
| **N3** | iOS 로컬 알림 | `@capacitor/local-notifications` | M | N2 | unit mock | iPhone 알림 |
| **N5** | iOS Live Activities | ActivityKit + JS 브리지(**앱 내 갱신만**, Push 없음) | H | N2 | 시뮬 16.1+ | 잠금화면 실기기 |
| **N7** | Watch 컴패니언 | SwiftUI + WCSession ↔ iPhone | H | N2 | Watch 시뮬 | **Watch+iPhone** |
| **N4** | Android 지속 알림 | FGS (후순위) | H | N2 | unit 브리지 | Android 실기기 |
| **N6** | 알람 정확도(Android 중심) | Exact alarm 등 | M | N3/N4 | unit | 실기기 |
| **D1** | DeX/데스크톱 웹 e2e | Playwright 리사이즈 (최후순위) | L | N0 | CI Playwright | 없음 |
| **N8** | 안정화 | 충돌·오프라인·선택 APK CI | M | N5/N7 | live+회귀 | 매트릭스 |

**순서 근거:** iPhone → Watch → Android → DeX. D1은 DeX가 4순위이므로 **뒤로**.

**스키마 마이그레이션·실계정·유료 가입이 필요한 PR은 착수 전 한 줄 보고.**

---

## 6. 테스트 · 품질

### 유지

- `npm test` (단위·PGlite)
- Playwright Activity 2.0 e2e
- `npm run test:live-supabase` / Actions **Supabase live QA**
- `pages.yml` 배포 게이트

### 추가 (구현 단계)

- 네이티브 브리지 단위 테스트(JS 쪽 mock)
- (선택) Detox/Maestro — 비용 대비 N8에서 재평가
- Watch: XCTest 스모크

### 시뮬레이터 vs 실기기

| 시뮬/에뮬으로 충분 | 실기기 필수 |
| --- | --- |
| UI 로드, 로그인 폼, 활동 CRUD, sync 유닛 | 푸시·정확한 알람, 잠금화면 Live Activity 체감, Watch 페어링·WCSession, 카메라/HEIC, 백그라운드 kill 후 복구 |

**자동 가능한 검증을 사용자에게 수동 QA로 넘기지 않는다.** 사용자는 UX만. 실기기 조작이 불가피한 항목만 “사용자 기기에서 Cursor가 할 수 없음”으로 명시.

---

## 7. 사용자 준비물 (구현 N1 전)

에이전트가 대신 할 수 없는 것만:

1. **Mac** + App Store **Xcode** 설치 → 최초 실행 시 **약관·추가 구성 요소 동의**
2. Xcode에 **Apple Account** 로그인 (Personal Team)
3. (권장) USB **iPhone**, USB **Android**, (Watch는 N7)
4. iPhone: 설정 → 개발자 앱 **신뢰**
5. 계속 **QA Supabase 계정**만 앱 로그인에 사용
6. **유료 Apple Developer / Play 게시는 지금 불필요** — 필요 시점에 다시 보고

---

## 8. 첫 iOS 구현 준비 PR (N1) — 기능 구현 아님

N0 다음. **Live Activity·알림·Watch 코드 작성 금지.** iOS Simulator(또는 실기기)에서 기존 웹 UI가 뜨는지만 확인.

1. 사용자 Mac: Xcode 약관·Accounts에 Apple ID(Personal Team)
2. `npm ci` → `.env.local` publishable만
3. `npm run app:sync` → `npm run app:ios` → Simulator Run
4. QA 계정 로그인 · Today · 활동 1건 시작/종료(가능하면) · 콘솔 오류 없음
5. (선택) 케이블 iPhone Personal Team 설치 — 7일 재서명 안내
6. Android Studio는 **열기·SDK 유무만** 기록(구현 없음)
7. 가이드에 N1 결과·스크린샷 · `npm test`/`build`

완료 후 다음 시작점 **N2**(iOS 활동 QA). Live Activity는 **N5**(별도).

---

## 9. Samsung DeX (모니터 + BT 키보드·마우스)

### 9.1 권장: 웹 우선 (DeX 전용 앱 금지)

| 경로 | 판정 | 이유 |
| --- | --- | --- |
| **Samsung Internet / Chrome에서 Pages 또는 로컬 웹** | **1순위** | 이미 반응형·데스크톱 e2e(1280) 있음. 동일 Supabase 계정·IndexedDB/동기화. DeX 전용 코드 불필요. |
| PWA 설치(Samsung Internet DeX) | 권장 보조 | [Samsung 가이드](https://developer.samsung.com/browser/android/web-development-guide-for-dex.html): DeX에서 PWA는 트레이/바탕 아이콘, **URL 바 없는 리사이즈 창**. |
| Capacitor Android 앱 on DeX | **2순위·선택** | DeX에서 실행 가능([FAQ](https://developer.samsung.com/samsung-dex/faq.html): `resizeableActivity`, Multi-Window, targetSdk≥24). **DeX 생산성만** 보면 웹으로 충분. 네이티브 앱의 실질 이점은 **폰 잠금화면 지속 알림·FGS**이지 DeX 창 UX가 아님. |
| DeX 전용 포크 / `if (DeX)` UI 분기 | **금지** | 유지비↑, 웹·앱 해석 분기 위험. |

**결론:** DeX에서는 **웹(가능하면 PWA)** 을 쓰고, Android 네이티브는 폰 백그라운드/알림 목적의 N4와 겹칠 때만 손본다. DeX 때문에 네이티브 일정을 앞당기지 않는다.

### 9.2 창·입력·레이아웃 설계 원칙 (웹 공통)

구현 시(승인 후 D1+) 지킬 계약 — **지금 코드 변경 없음.**

1. **창 리사이즈:** `resize`/`visualViewport`에 반응하는 기존 CSS 그리드·`.table-scroll` 유지. 고정 `100vh` 함정·가로 넘침 회귀를 e2e로 잡는다.
2. **최대화·가로:** 데스크톱 폭(≥1024) 레이아웃 경로 사용. 모바일 전용 bottom-nav가 데스크톱에서 입력창을 가리지 않게.
3. **키보드·마우스:** 포커스 링, Tab 순서, 스크롤 가능 영역 클릭, `dialog` Esc. 단축키는 **기존 동작 보존 범위에서만** 최소 추가(예: Esc로 닫기) — 새 모드 발명 금지.
4. **리사이즈 중 입력 보존:** 캡처/편집 mid-type 상태가 리렌더로 날아가지 않게(이미 sandbox e2e가 일부 커버). D1에서 **리사이즈 전후 입력값 assert**.
5. **계정:** DeX 브라우저·폰 앱·웹이 같은 이메일로 로그인하면 같은 `hazeflow_records`. 충돌은 기존 sync. QA 계정으로만 초기 시험.

### 9.3 백그라운드·알림 차이 (DeX)

| | DeX 브라우저/PWA | Android Capacitor 앱 |
| --- | --- | --- |
| JS 타이머 | 창 최소화·절전 시 **제한** (현 웹 reminder와 동일 계열) | 포그라운드 서비스 있으면 지속 알림 가능(N4) |
| 알림 | 브라우저 알림 권한·정책에 종속 | 앱 알림 채널; DeX에서도 표시되나 UX는 폰과 다름 |
| 동기화 | 창이 살아 있을 때 `sync-engine` | `appStateChange` resume/pause 기존 훅 |

DeX 사용자는 모니터 앞에서 창을 열어 두는 패턴이 많으므로 **웹 동기화로 충분한 경우가 많다.** “잠그고 멀리 있을 때 진행 표시”는 폰 네이티브(N4/N5) 몫.

### 9.4 Playwright 자동 검증 (D1 · DeX 대체)

실기기 DeX는 CI에 없음. **데스크톱 창 시뮬레이션으로 대부분을 자동 검증**한다.

기존: `playwright.config.mjs` project `desktop` 1280×900.

D1에서 추가할 시나리오(구현 시):

1. 1280×900 Today 로드·가로 넘침 없음
2. `setViewportSize` 900×700 → 1400×900 왕복 후 레이아웃·콘솔 오류 없음
3. 캡처 입력 중 리사이즈 → **텍스트 유지**
4. Tab으로 주요 컨트롤 포커스, Esc로 dialog 닫기
5. (선택) 1920×1080 스모크

`isMobile: false` Desktop Chrome 유지. **User-Agent로 DeX를 에뮬하지 않아도 됨**(반응형·창 크기가 핵심). Samsung Internet 전용 엔진 차이는 §9.5.

### 9.5 실제 Samsung DeX에서만 검증할 항목

Cursor/CI가 대신 할 수 없음 → 구현 후 **사용자 UX 확인**으로만 요청(기술 QA 전가 금지, 체감만):

- 모니터 연결·창 최대화/스냅이 “데스크탑처럼” 느껴지는지
- BT 키보드·마우스 커서·휠 스크롤 자연스러움
- Samsung Internet **데스크톱 사이트** / PWA 단독 창 설치
- Chrome이 모바일 UA로 좁은 레이아웃을 주는지(필요 시 데스크톱 사이트 토글) — 앱 버그가 아니라 브라우저 동작일 수 있음
- DeX에서 알림 센터에 웹/앱 알림이 보이는지
- 외부 디스플레이 분리 후 폰으로 이어쓰기

---

## 10. 명시적 비범위 (지금)

- 네이티브/Watch/DeX **코드 작성**
- DeX 전용 앱·UA 분기 제품
- 유료 개발자 가입 대행
- HealthKit / WorkoutKit 필수화
- 원격 Push Live Activity
- `server.url`로 Pages 고정
- 실계정·운영 `main` 데이터로 시험

---

## 11. 최종 보고용 요약 표

1. **우선순위:** iPhone → Watch → Android → DeX.
2. **N0:** Linux sync/구조 OK · Mac 시뮬 미실행 — [native-n0-verification.md](native-n0-verification.md).
3. **재사용:** 웹 UI·도메인·sync. Live Activity/Watch만 네이티브 추가.
4. **PR:** §5 (N0→**N1 iOS**→N2→N3/N5→N7→N4→D1…).
5. **준비물:** §7 · 사용자 Mac Xcode 약관.
6. **다음:** N3 로컬 알림은 구현됨. Watch 구현은 별도 단계이며 의존성은 [native-watch-prep.md](native-watch-prep.md). 잠금 화면 픽셀·iPhone 13·실제 알림 배너는 미검증. 원격 푸시·Android는 시작하지 않음.
