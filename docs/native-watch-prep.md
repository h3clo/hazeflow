# Apple Watch 준비 (구현 아님)

N3 로컬 알림 이후의 의존성만 적는다. Watch 타깃, `WCSession`, 워치 알림 예약은 만들지 않는다.

## 이미 있는 것

- iPhone이 대표 활동 하나를 Live Activity로 보여 준다. 푸시 토큰은 없다.
- 알림 설정은 `{owner}-notification-settings`에만 있고 백업 스키마에 없다. 기본값은 꺼짐이다.
- 예약 대상은 `reminderPlan`의 일정·할 일·루틴·복습뿐이다. 활동 시작은 알림이 아니다.
- 로컬 알림 번호는 그 계획의 안정 해시이고, 탭하면 `day` / `tasks` / `study`와 날짜로 이동한다.

## Watch가 나중에 기대는 경계

- 기록의 원본은 iPhone과 기존 백업이다. Watch에 두 번째 저장소를 만들지 않는다.
- 진행 중 활동은 iPhone Live Activity 한 칸의 스냅샷을 본다. Watch가 활동을 직접 시작해도 iPhone의 기존 저장 경로만 호출한다.
- 알림은 iPhone이 예약한 로컬 알림을 유지한다. Watch가 같은 항목을 다시 예약하지 않는다.
- 원격 푸시, 유료 개발자 계정, 실계정 데이터 변경은 이 단계에 없다.

## 아직 없는 것

- Watch 앱 타깃과 `WCSession`
- Watch에서 iPhone으로 보낼 활동 시작·종료 인텐트
- Watch 전용 알림 설정
