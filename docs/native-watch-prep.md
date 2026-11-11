# Apple Watch 1차 (표시만)

Watch는 iPhone Live Activity와 같은 대표 활동 스냅샷 하나만 보여 준다. 기록 원본, 로그인, Supabase 동기화는 iPhone에 남긴다.

## 화면

- 연결되고 활동이 있으면 이름과 경과 시간. 경과는 Watch가 전달받은 시작 시각으로 `Text(timerInterval:)`를 계산한다.
- 여러 활동이 진행 중이어도 대표 활동 하나만 온다. 대표 선정은 기존 `resolvePrimaryActivity`다.
- 연결되고 활동이 없으면 「진행 중인 활동 없음」.
- iPhone과 연결되지 않으면 「iPhone과 연결되지 않음」과 마지막 확인 시각을 보여 준다. 그때의 경과는 멈추고, 현재 진행 시간처럼 계속 세지 않는다.
- 한 번도 받은 적이 없으면 「아직 확인한 활동이 없어요」.

## 전달

iPhone `HazeWatchRelay`가 Live Activity에 넘기는 페이로드 하나를 `updateApplicationContext`로 바꾼다. 활동이 끝나면 빈 스냅샷이다. 실패해도 웹 저장과 Live Activity는 그대로다. Watch의 `UserDefaults`(`haze-watch-last-phone-message`)는 마지막 전화 메시지(이름, 시작 시각, 확인 시각, 진행 여부)만 남겨 재실행 때 마지막 상태를 구분한다. 두 번째 활동 DB가 아니다.

## 하지 않는 일

- Watch에서 활동 시작·종료
- Watch 로그인, Supabase, 별도 기록 저장
- iPhone 로컬 알림을 Watch에서 다시 예약
- 원격 푸시

## 검증 (2026-11-12)

- watchOS 27.2 · Apple Watch Series 12 46mm 시뮬레이터. `HazeWatchTests` 4건, `HazeWatchUITests` 3건. 픽스처 제목은 「연습 활동」뿐.
- iPhone 17 / iOS 27.2 `N1SmokeUITests` 2건, `N2ActivityUITests` 3건, N3 1건. Watch를 앱에 넣어도 기존 화면·Live Activity·로컬 알림 상태가 유지됨.
- **미검증:** 실제 Apple Watch, iPhone 시뮬레이터와 Watch 시뮬레이터를 페어링한 WCSession 전달, iPhone 13, 잠금 화면.
