# N0 검증 결과 — iOS 우선 개발 환경 (2026-11-11)

**범위:** 환경·프로젝트 계약 검증. **iOS 기능 구현·Watch UI·Android 기능·DeX 구현 없음.**  
**우선순위(사용자 확정):** 1 iPhone → 2 Apple Watch → 3 Android → 4 DeX 웹.

관련: [native-execution-plan.md](native-execution-plan.md) · [native-readiness.md](native-readiness.md) · [mobile-app.md](mobile-app.md).

---

## 1. 이 환경에서 한 일 / 못 한 일

| 항목 | 결과 |
| --- | --- |
| 호스트 | **Linux** Cloud Agent — `xcodebuild`/`pod` **없음** |
| `npm run build:app` | **통과** (`HAZEFLOW_NATIVE=1`, base `/`) |
| `npx cap sync` | **통과** — iOS·Android `public`에 웹 자산 복사, SPM `Package.swift` 갱신 |
| `npx cap doctor` | Capacitor **8.6.0** 일치 · iOS: Xcode missing · Android: 프로젝트 OK |
| `npm run verify:native-n0` | **통과** (구조 계약) |
| `npm test` | **617 pass / 2 skip** (N0 검증 테스트 포함) |
| iOS Simulator 빌드·실행 | **불가** (Mac/Xcode 필요) |
| 실 iPhone 무료 계정 설치 | **이 환경에서 미실행** — 사용자 Mac에서만 가능 |
| Android `assembleDebug` | **실패** — `SDK location not found` (`ANDROID_HOME` 없음). 현황만. |
| DeX | 현황만 — 웹/PWA 권장 유지, 구현 없음 |

---

## 2. Capacitor iOS 프로젝트 현황

| 항목 | 값 |
| --- | --- |
| 앱 Id / 번들 | `io.h3clo.hazeflow` |
| 배포 타깃 | iOS **15.0** (`pbxproj` + SPM `.iOS(.v15)`) |
| 의존성 | **SPM** (`CapApp-SPM` + `capacitor-swift-pm` 8.6.0 + `@capacitor/app`) — CocoaPods Podfile **없음** |
| 딥링크 | Info.plist `CFBundleURLSchemes` = `io.h3clo.hazeflow` → `io.h3clo.hazeflow://auth/callback` |
| 권한 문구 | 카메라·사진 라이브러리 한국어 설명 있음 |
| 방향 | iPhone 세로+가로, iPad 4방향 |
| 서명 | `CODE_SIGN_STYLE = Automatic` · **`DEVELOPMENT_TEAM` 미설정** |
| Entitlements | 파일 없음 (Push/App Group/Watch는 이후 PR) |
| Live Activities / BG modes | Info.plist에 **미등록** (의도적 — 기능 PR에서 추가) |
| 웹 셸 | `SceneDelegate` → `CAPBridgeViewController` · `native-app.js`가 `appUrlOpen`/`appStateChange` |

**데이터 보존:** 웹과 동일 IndexedDB + Supabase `hazeflow_records`. `server.url` 미사용 → Pages와 앱 번들 분리. 스키마·실계정 변경 없음.

---

## 3. 무료 Apple 계정으로 실기기 설치 (사용자 Mac)

**가능(공식 Personal Team):** Xcode로 본인 iPhone에 디버그 설치.  
**제약:** 서명 약 **7일** 후 재설치 · 기기 수 제한 · **Push / TestFlight / 일부 entitlement / 스토어 불가**.

사용자 준비(약관·계정은 사용자만 수행):

1. macOS + **Xcode** 설치 → 한 번 열어 **라이선스/추가 구성 요소** 동의
2. Apple ID를 Xcode → Settings → Accounts에 추가 (무료 Personal Team)
3. 저장소에서 `npm ci` → `.env.local`에 **publishable** URL/key만 (`.env.example` 형식, service_role 금지)
4. `npm run app:sync` → `npm run app:ios` (또는 Xcode에서 `ios/App/App.xcworkspace`/`App.xcodeproj`)
5. Signing & Capabilities: Team = Personal Team, Bundle `io.h3clo.hazeflow`
6. iPhone: 개발자 모드(iOS 16+) · 이 Mac을 신뢰 · Run
7. **QA 계정만** 로그인. 실계정·`main` 데이터 시험 금지

시뮬레이터만으로도 N1 스모크는 가능. 카메라·실 HEIC·딥링크 메일 복귀는 실기기.

---

## 4. Live Activities · 백그라운드 · 로컬 알림 (계정별 제약)

| 기능 | 기술 | 무료 Personal Team | 유료 Apple Developer |
| --- | --- | --- | --- |
| 앱 내 Live Activity start/update/end | ActivityKit + Widget Extension | **가능**(iOS 16.1+, 실기기/시뮬) | 동일 |
| Push로 Live Activity 갱신 / push-to-start | APNs + 유료 entitlement | **불가** | 가능 |
| 로컬 알림 | `@capacitor/local-notifications` 또는 UNUserNotificationCenter | **가능**(권한 허용 시) | 동일 |
| 원격 Push | APNs | **불가** | 가능 |
| 백그라운드 fetch / processing | `UIBackgroundModes` | 제한적·심사/정책 | 필요 시 entitlement |
| 웹 포그라운드 reminder | 기존 `foreground-reminders.js` | 웹·앱 WebView에서 동일 | — |

**설계 함의:** 첫 iOS 기능은 **앱이 직접 갱신하는 Live Activity + 로컬 알림**으로 두고, 원격 Push는 유료 가입 후. 진행 중 활동의 정본은 계속 **로그/IndexedDB**이며 Live Activity는 표시 레이어.

---

## 5. Apple Watch 데이터·통신 (구조만 · 구현 금지)

| 레이어 | 역할 |
| --- | --- |
| 정본 | iPhone WebView IndexedDB 로그 + `activityTiming` / `activity-primary` (`preferences.activityUi` LWW) |
| 폰↔워치 | **WatchConnectivity (`WCSession`)** — 진행 스냅샷·시작/종료/대표 의도. Capacitor 웹뷰는 Watch에 없음 |
| 클라우드 | 폰이 기존 `sync-engine` / `hazeflow_apply`로 Supabase 반영. Watch 직접 Supabase는 후순위 |
| 페이로드(초안) | `{ id, text, time, endDate?, endTime?, activityTiming?, primaryActivityId? }` — 스키마 확장 없이 기존 필드 |

Watch 타깃·App Group은 **아직 저장소에 없음**. iPhone 셸 스모크(N1) 이후 N7.

---

## 6. Android · DeX (현황만)

| | 현황 |
| --- | --- |
| Android | Capacitor 8 · `minSdk 24` · `targetSdk 36` · 딥링크 동일 · INTERNET만. `resizeableActivity` 미명시 → API 24+ **기본 true**. 이 호스트에 SDK 없음 → APK 미빌드 |
| DeX | **웹/PWA 우선** 유지. D1 Playwright는 후순위(우선순위 4). 네이티브 앱 DeX는 부가 |

---

## 7. 자동 수정·추가 (이번 PR)

- `scripts/verify-native-n0.mjs` + `npm run verify:native-n0` + 단위 테스트
- 실행 계획·가이드: **iOS 우선** 순서로 재정렬, N0 결과 링크
- iOS/Android **기능 코드·Entitlement·Watch 타깃 추가 없음**

---

## 8. N0 판정

| 질문 | 답 |
| --- | --- |
| iOS 개발 가능? | **예 — 사용자 Mac + Xcode 약관 동의 후.** 저장소 iOS 셸·SPM·딥링크·네이티브 base 빌드/`cap sync`는 이미 건전. |
| 이 클라우드에서 시뮬 빌드? | **아니오** |
| 무료 계정 실기기? | **가능(7일 재설치).** Push/TestFlight는 유료. |
| 웹·Supabase 기록? | **보존.** 스키마/실계정 미변경. |
| 다음? | **N1 iOS 셸 스모크(사용자 Mac).** Live Activity 등 기능 구현은 N1 통과·별도 승인 후. |
