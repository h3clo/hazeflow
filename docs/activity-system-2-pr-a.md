# 활동 시스템 2.0 — PR A (도메인)

## 결정: 전역 schemaVersion 3 비사용

같은 계정·날짜에 레거시와 신규 기록이 혼재할 수 있다. 루트 `schemaVersion`을 3으로 올리면 **모든** 구간의 계산 규칙이 한꺼번에 바뀌어, 물질화 없이 과거 표시 분이 달라진다.

**PR A 선택:** `schemaVersion`은 **2 유지**. 기록별 선택 필드만 사용한다.

| 값 | 의미 |
|---|---|
| `activityTiming` 없음 | 레거시: 다음 **레거시** 시작으로 종료 추론 |
| `activityTiming: 'independent'` | 신규: 명시 `endDate`/`endTime`만 종료 |

독립 기록은 레거시 체인의 **이웃으로 쓰이지 않는다**. 그래서 신규 독립 기록을 추가해도 기존 레거시 추론 종료가 바뀌지 않는다. **과거 end 물질화 없이** 혼합 데이터가 안전하다.

캡처 UI는 아직 플래그를 쓰지 않는다(화면 동작 불변). PR B에서 신규 저장 시 `independentTimingFields()`를 붙인다.

## 공통 API (`activity-timing.js`, `domain.js` 재수출)

- `activityIntervals` — 이중 규칙
- `ongoingActivities` — 진행 중 목록
- `finishActivityFields` — 종료 필드 생성(쓰기 없음)
- `sumActivityMinutes` — 활동별 분 합(겹침 중복 허용)
- `mergedElapsedMinutes` — 겹친 구간 병합 후 실제 경과
- `independentTimingFields` / `isIndependentTiming`

## 대표 활동(계정 동기화 · 구현됨)

`preferences.activityUi`를 `hazeflow_records`의 `["preferences","activityUi"]` 행으로 동기화한다. **Postgres 스키마 변경 없음.** 기기 로컬 `{owner}-primary-activity`는 즉시 UI 캐시이며, 로드·동기화 후 계정 state에서 미러한다.

```text
{
  primaryActivityId: string | null,
  primaryUpdatedAt: number,   // ms epoch, 충돌 시 큰 값 우선(LWW)
  primaryUpdatedBy: string    // device id (감사·동시성 힌트)
}
```

규칙:

1. 대표는 **표시만** 바꾸고 `activityIntervals` 분에 영향 없음.
2. `primaryActivityId`가 진행 중이 아니면 UI는 진행 중 목록의 안전한 기본값(시작 시각 최신)으로 폴백한다.
3. 두 기기가 동시에 바꾸면 `primaryUpdatedAt` LWW. 동일 시각이면 `primaryUpdatedBy` 사전식 tie-break. 일반 기록 필드 병합과 달리 사용자 충돌 UI를 띄우지 않는다.
4. 기기 시계 오차로 오래된 값이 이길 수 있는 위험이 남아 있다. 서버 `version` 기반 causality를 쓰려면 후속 개선.
5. 로그아웃·계정 전환 시 owner 네임스페이스가 바뀌어 다른 계정의 대표가 노출되지 않는다.

## PR B (구현)

- `activity-start-confirm.js`: `shouldConfirmOngoingStart` · `resolveOngoingEndChoices` · `applyOngoingEnds` · `captureTimingFields`
- 활동 모드 저장 시 ongoing이 있으면 유지/종료 체크 UI. **미체크=유지**(자동 종료 없음)
- 신규 활동에 `activityTiming:'independent'` 부여. memo는 확인·플래그 없음

## 비범위

물질화(PR F), 네이티브/Watch, 실계정 변경.
