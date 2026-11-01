# 토스 일별 평가액 동기화

## 사용자 동작

- 실시간 시세 대신 하루 한 번 조회한 **주식 평가액 + 확인 시각**만 계정에 저장한다.
- 연결창, 기기별 API 키, 기기별 IP 등록은 필요 없다. 아이폰·아이패드·갤럭시·PC는 같은 Haze Flow 계정으로 로그인하면 저장값을 읽는다.
- 토스 자료가 없는 계정/비로그인 상태에서는 해당 영역의 HTML 자체를 만들지 않는다. DB RLS도 다른 계정의 조회를 차단한다.
- 맥이 꺼져 있거나 잠든 동안 새 조회는 진행되지 않으며 마지막 확인 날짜를 표시한다. 다음에 맥을 사용하면 필요한 날의 조회를 자동으로 시도한다. 종가를 보장하는 데이터가 아니라 조회 시점의 일별 평가액이다.
- 수동으로 입력한 총자산과 중복 합산하지 않고 일별 토스 평가액을 별도로 표시한다.

## 자동 조회

`server/toss-publisher.mjs`가 기존에 허용된 맥 IP에서 토스의 읽기 API로 평가액을 계산한다. 종목별 상세는 맥 메모리에서 계산에 사용하고 클라우드에는 보내지 않는다. 한국시간 기준 당일 성공 기록이 있으면 다시 조회하지 않는다. 실패하면 30분 뒤 재시도하며 마지막 정상 금액을 보존한다.

`npm run toss:background`로 사용자 LaunchAgent `io.h3clo.hazeflow.toss-publisher`를 설치했다. macOS 로그인 시 브라우저 없이 자동 실행하며, 맥 잠자기를 막지 않는다. 토스 접근 키는 `.env.toss.local`, 계정 일별 자료만 갱신할 수 있는 제한 키는 `.env.toss-publisher.local`에 0600으로 보관한다. 두 파일과 상태 파일은 gitignore 대상이다. 관리자/service-role 키는 사용하지 않는다.

- 상태: `.toss-publisher-status.json` (개인 금액/키 없음)
- 로그: `~/Library/Logs/HazeFlow/toss-publisher*.log` (상태와 시각만)
- 중지: `launchctl bootout gui/$(id -u)/io.h3clo.hazeflow.toss-publisher`
- 자동 시작 해제: 중지 후 `~/Library/LaunchAgents/io.h3clo.hazeflow.toss-publisher.plist` 삭제
- 수동 단발 실행: `npm run toss:publish` (당일 성공한 경우 생략)
- 키 변경 진단용 로컬 설정: `npm run toss:local`. 앱에서 사용하지 않으며 임시 연결창 기능은 제거했다.

## 클라우드 권한

`supabase/migrations/202611010001_toss_cache.sql`:

- `hazeflow_toss_daily`: 소유자별 날짜/평가액/확인 시각. 본인 SELECT만 허용.
- `hazeflow_toss_cache`: 마지막 정상 요약과 실패 상태. 본인 SELECT만 허용.
- `hazeflow_private.toss_publishers`: 제한 발행키의 SHA-256 해시만 보관. anon/authenticated 접근 불가.
- `hazeflow_publish_toss`: 전용 키와 소유자를 검증하고 일별 금액만 갱신. 다른 Haze Flow 기록을 읽거나 쓰거나 주문을 실행할 권한은 없다.

## 검증

실제 토스 읽기 및 계정 저장 성공, LaunchAgent 등록/실행 확인. 실제 API의 익명 읽기 거부(401) 확인. PostgreSQL 테스트로 다른 계정 조회 차단, 잘못된 발행키/오래된 시각/잘못된 금액 차단, 실패 시 정상값 보존 검증. 브라우저 예시 화면에서 다른 계정의 토스 영역 0개 확인.

유료 호스팅/플랜에 가입하지 않았다. 토스 API 자체의 허용 IP 조건은 일별 조회에도 적용된다. 맥이 꺼져 있는 동안에도 신규 조회를 하려면 별도 서버가 필요하며 현재 구성은 그런 상시 조회를 제공하지 않는다.
