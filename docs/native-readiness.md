# iOS · Android · Apple Watch — 선행 분석 (구현 금지)

기준: 2026-11-11. **이 문서는 설계·순서만** 다룬다. Capacitor 네이티브 기능 확장·Watch 코드는 별도 승인 전까지 시작하지 않는다.

## 현재 코드 구조

| 레이어 | 위치 | 역할 |
| --- | --- | --- |
| 도메인·동기화 | `domain.js`, `sync-state.js`, `sync-engine.js`, `cloud.js` | IndexedDB/상태 flatten, 충돌, `hazeflow_apply` 전송 |
| 웹 UI | `app.js`, `feature-ui.js`, Vite `dist/` | SPA. GitHub Pages는 `/hazeflow/` |
| Capacitor 셸 | `capacitor.config.json`, `ios/`, `android/` | 앱 Id `io.h3clo.hazeflow`, `webDir: dist`, deep link `io.h3clo.hazeflow://auth/callback` |
| 앱 빌드 | `npm run build:app` → `cap sync` | `HAZEFLOW_NATIVE=1`로 `/` base. Pages `server.url` 미사용 |
| 서버 | Supabase `hazeflow_records` + photos bucket | 계정 단위 RLS. 웹·앱이 같은 스키마 공유 |

세션은 기기별이지만 같은 이메일로 로그인하면 같은 서버 기록을 쓴다. 상세: [mobile-app.md](mobile-app.md).

## 네이티브 착수 전 필수 선행

1. **격리 Supabase 라이브 QA 통과** — [supabase-live-qa.md](supabase-live-qa.md) 시나리오 1–10. 웹 기기 A/B 왕복이 깨진 채로 네이티브를 키우면 디버깅 비용이 폭증한다.
2. **Xcode 약관·로컬 iOS 빌드** — 기존 중단점. 사용자가 Xcode를 한 번 열어 약관·SDK를 완료해야 `app:ios` 컴파일이 가능하다.
3. **Android Studio / JDK·SDK** — 로컬 `app:android` 빌드 환경.
4. **실기기 인증 콜백** — Redirect URL에 등록된 스킴으로 가입/재설정 복귀 1회 검증(개인 계정은 사용자만).
5. **사진·카메라** — HEIC·권한·파일 선택기. 웹 sandbox와 별도 실기기 확인.
6. **백그라운드 동기화 기대치** — 웹과 동일하게 “종료 직후 전송 시도 + 재시작 이어쓰기”. OS 백그라운드 타이머 보장은 범위 밖으로 명시.

## 권장 개발 순서 (승인 후)

1. **P0 웹 라이브 동기화 그린** — 격리 프로젝트 시크릿 → optional live suite → 실패 시 웹 수정 PR만.
2. **P0 Capacitor 스모크** — `npm run app:sync` 후 시뮬레이터 로그인·Today 로드·sandbox 없는 로컬 저장 확인(실데이터 금지).
3. **P1 iOS 실기기** — 인증 복귀, 사진 1장, 활동 시작/종료가 Mac/웹 sandbox 계정(격리)과 왕복.
4. **P1 Android 실기기** — 동일 시나리오 + 뒤로가기 스택.
5. **P2 네이티브 편의** — 세션 Keychain/Keystore, 공유 시트로보내기, 푸시(별도 비용·권한 검토).
6. **P3 Apple Watch** — **별도 승인.** Watch는 Capacitor 웹뷰가 아님. 최소 범위 제안: 진행 중 대표 활동 표시·종료 버튼 → 기존 Supabase/`hazeflow_apply` 또는 iPhone 앱 중계. 스키마 변경 최소화. HealthKit 연동은 더 뒤·별도 보안 검토.

## Watch를 맨 뒤로 두는 이유

- 공유 코드가 웹 JS 중심이라 Watch용 Swift 모델·네트워크를 새로 짜야 한다.
- 대표 활동·종료 UX가 웹/폰에서 안정된 뒤에야 Watch 표면이 단순해진다.
- 배터·백그라운드·Health 권한 범위가 제품 비전(압박 없는 기록)과 충돌하기 쉽다.

## 하지 말 것

- 이 단계에서 Watch/네이티브 UI 구현 PR
- 운영 계정으로 네이티브 동기화 시험
- `server.url`로 GitHub Pages를 앱에 고정(오프라인·버전 꼬임)
