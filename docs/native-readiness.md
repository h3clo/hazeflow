# iOS · Android · Apple Watch — 선행 분석 (구현 금지)

기준: 2026-11-11. **설계·순서·환경 제약만.** Capacitor 네이티브 기능 확장·Watch 코드는 별도 승인 전까지 시작하지 않는다.

## 현재 코드 구조

| 레이어 | 위치 | 역할 |
| --- | --- | --- |
| 도메인·동기화 | `domain.js`, `sync-state.js`, `sync-engine.js`, `cloud.js` | IndexedDB/상태 flatten, 충돌, `hazeflow_apply` 전송 |
| 웹 UI | `app.js`, `feature-ui.js`, Vite `dist/` | SPA. GitHub Pages는 `/hazeflow/` |
| Capacitor 셸 | `capacitor.config.json`, `ios/`, `android/` | 앱 Id `io.h3clo.hazeflow`, `webDir: dist`, deep link `io.h3clo.hazeflow://auth/callback` |
| 앱 빌드 | `npm run build:app` → `cap sync` | `HAZEFLOW_NATIVE=1`로 `/` base. Pages `server.url` 미사용 |
| 서버 | Supabase `hazeflow_records` + photos bucket | 계정 단위 RLS. 웹·앱이 같은 스키마 공유 |

세션은 기기별이지만 같은 이메일로 로그인하면 같은 서버 기록을 쓴다. 상세: [mobile-app.md](mobile-app.md). 웹 라이브 QA: [supabase-live-qa.md](supabase-live-qa.md) (**2026-11-11 통과**).

## 권장 개발 순서 (승인 후 · 구현은 아직 금지)

1. **로컬 툴체인 준비 (사용자 PC)** — 아래 도구·약관. 클라우드 에이전트만으로는 iOS 서명·실기기 불가.
2. **Capacitor 스모크** — `npm run app:sync` → iOS Simulator / Android Emulator에서 QA 계정 로그인·Today 로드. 실계정·`main` 데이터 금지.
3. **iOS 실기기** — 인증 콜백(`io.h3clo.hazeflow://auth/callback`), 사진 1장, 활동 시작/종료가 웹(동일 QA)과 왕복.
4. **Android 실기기** — 동일 시나리오 + 시스템 뒤로가기 스택.
5. **네이티브 편의 (선택)** — Keychain/Keystore 세션, 공유 시트 내보내기. 푸시는 비용·권한 별도 검토.
6. **Apple Watch (별도 승인)** — Capacitor 웹뷰 아님. 최소안: 대표 활동 표시·종료 → iPhone 중계 또는 동일 Supabase RPC. HealthKit은 더 뒤.

## 필요한 도구

| 대상 | 도구 | 비고 |
| --- | --- | --- |
| 공통 | Node 22+, Xcode/Android Studio용 Mac 또는 Android용 JDK | 저장소에 `ios/`, `android/` 이미 있음 |
| iOS | macOS + Xcode (최신 안정) + CocoaPods/`cap sync` | 시뮬레이터는 무료. 실기기는 케이블·개발자 모드 |
| Android | Android Studio (SDK·에뮬레이터) 또는 실기기 USB 디버깅 | Windows/Linux/macOS 가능 |
| Watch | Xcode + Watch 시뮬레이터/실기 · **Swift 워치 앱 타깃** | 웹 공유 코드 재사용 제한적 |
| 계정 | Supabase QA Auth (옵션 D) | 개인 실계정으로 네이티브 시험 금지 |

## 권한·설정 (앱/콘솔)

- **Supabase Redirect URLs:** `io.h3clo.hazeflow://auth/callback` 정확 일치(이미 문서화). 와일드카드 추가 금지.
- **iOS:** 사진/카메라 사용 설명 문자열(Info.plist). 푸시·Health·백그라운드 모드는 기능 승인 전 추가하지 않음.
- **Android:** 인터넷·(필요 시) 카메라/저장소. 뒤로가기 동작은 기존 셸 유지.
- **서명:** 로컬 디버그 서명으로 실기기 설치 가능. **App Store / Play 게시·유료 개발자 프로그램은 이 단계 범위 밖.**

## 무료 개발 환경의 제약

| 항목 | 무료로 가능한 것 | 막히거나 비용·동의 필요한 것 |
| --- | --- | --- |
| iOS 시뮬레이터 | 빌드·UI·기본 로그인 흐름 | 실제 카메라·일부 백그라운드·푸시 제한 |
| iOS 실기기 | Apple ID로 개발자 모드 사이드로드(기기 수·만료 제한) | **유료 Apple Developer($/년)** 없이는 TestFlight·스토어·일부 능력 제한. **Xcode 약관은 사용자가 한 번 동의**해야 컴파일 |
| Android 에뮬/실기기 | 디버그 APK 설치 무료 | Play 게시·Play App Signing은 개발자 등록 |
| Watch | 시뮬레이터로 UI 골격 | 실기 Watch·독립 네트·Health는 폰 페어링·권한·유료 팀 필요할 수 있음 |
| Supabase | 기존 무료 프로젝트 + QA 유저 | 새 무료 프로젝트 한도(2)·Preview Branch 시간당 과금 |
| 클라우드 에이전트 | 문서·웹·선택적 live Node 테스트 | **Mac/Xcode/실기기 없음** → 네이티브 빌드·약관 동의·스토어 업로드 대행 불가 |

## 착수 전 체크 (구현 PR 전)

- [x] 웹 실 Supabase 라이브 QA 1–10 (옵션 D)
- [ ] 사용자 Mac에서 Xcode 약관·첫 빌드
- [ ] Android Studio SDK 설치 또는 실기기
- [ ] QA 계정으로만 앱 로그인 시험 합의
- [ ] Watch/푸시/HealthKit **미승인 유지**

## 하지 말 것

- 승인 전 Watch/네이티브 UI 구현 PR
- 운영 개인 계정으로 네이티브 동기화 시험
- `server.url`로 GitHub Pages를 앱에 고정(오프라인·버전 꼬임)
