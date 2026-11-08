# 활동 기록 UX 간소화 인계 문서 (UX_HANDOFF.md)

작성 일시: 2026-11-07 21:50:30 (KST)

---

## 1. 완료한 작업

- **룰 기반 카테고리 자동 분류 엔진 구현 (`activity-classify.js`)**:
  - 외부 AI API 연동 없이 정규식과 키워드/패턴 분석을 통해 한 줄 입력 텍스트를 분류.
  - 사용자 요구 예시 4가지 지원:
    - `레그프레스 25 10` → `운동`
    - `영어 공부 시작` → `공부`
    - `점심으로 김치찌개 먹음` → `식사`
    - `회의 참석` → `업무`
  - 기존 카테고리 체계(`일상`, `식사`, `운동`, `업무`, `휴식`, `감정`, `공부`)와 100% 호환.
  - 불확실하거나 모호한 입력은 억지 추측 없이 안전하게 기본 카테고리(`일상`)로 fallback.
  - 기존 `workout.js`의 `workoutSession` 파서를 내장 재사용하여 세트/유산소 형식도 정확히 운동으로 인식.

- **자동 분류 단위 테스트 작성 및 통과 (`tests/activity-classify.test.js`)**:
  - `npm test` 기준 기존 480개 + 신규 3개 테스트 전체 483개 패스 (Pass 483/483).

- **`app.js` 모듈 연동 시작**:
  - `classifyActivity` import 추가.

---

## 2. 수정한 / 추가한 파일

1. **`activity-classify.js`** (신규 생성)
   - `classifyActivity(text)` 함수 및 키워드/정규식 규칙 세트.
2. **`tests/activity-classify.test.js`** (신규 생성)
   - 사용자 필수 예시 4건 및 카테고리별 검증 테스트 3종.
3. **`app.js`** (수정 진행 중)
   - 상단 `import {classifyActivity} from './activity-classify.js';` 추가됨.
4. **`docs/UX_HANDOFF.md`** (신규 생성 - 본 인계 문서)
5. **`docs/PROJECT_GUIDE.md`** (인계 메모 갱신)

---

## 3. 미완료 작업

- **UI 레이아웃 및 컴포넌트 재구성 (`app.js` - `captureView()`)**:
  - 기본 노출 화면:
    1. 최상단 `textarea` (`id="capture-text"`, `placeholder="지금 뭐 하고 있어?"`)
    2. 메인 액션 바: `captureMode(mode)` (▶ 활동 시작 / ＋ 짧은 기록) + `[기록]` 버튼 + 카테고리 표시 배지
    3. 접을 수 있는 `details.capture-extra-settings`:
       - 카테고리 직접 선택 버튼 그룹 (`일상, 식사, 운동, 업무, 휴식, 감정, 공부`)
       - 기록 시간 입력창 (`capture-time` 및 `capture-now` 버튼)
       - 사진 첨부 (`photoField`)
       - 카테고리가 식사/운동일 때의 세부 옵션(식비, 영양정보, 즐겨찾기, 지난 운동 불러오기 등)
- **이벤트 핸들러 및 상태 동기화**:
  - `capture-text` 입력 시 `manualKind !== true`이면 실시간 카테고리 배지 갱신.
  - `capture-category` 버튼 클릭 시 `drafts[date].manualKind = true` 설정 (사용자 직접 선택 우선).
  - 저장(`type === 'capture'`) 시 `!manualKind`이면 `classifyActivity(text)`로 최종 kind 확정.
- **스타일 시트 조정 (`style.css`)**:
  - `.capture-action-bar`, `.capture-kind-badge`, `.capture-extra-settings` 등 간소화된 한 줄 레이아웃 스타일 적용.

---

## 4. 테스트 결과와 알려진 문제

- **단위 테스트 결과**:
  - `npm test`: **483 tests passed (0 failed)**
  - `npm run build`: **Vite build 정상 통과 (오류 없음)**
- **알려진 문제 / 상태**:
  - 사용자 데이터베이스(IndexedDB)나 Supabase 계정 데이터는 전혀 변경되지 않았으며 영향 없음.
  - `app.js`의 `captureView` UI 변경은 착수 전이므로, 앱 동작 및 가계부/활동 기록 기존 기능에 어떤 부작용도 없는 안전한 상태임.

---

## 5. 다음 AI가 이어서 작업할 순서

1. **`app.js`의 `captureView()` 함수 개편**:
   - `captureView()` 내부 마크업을 `textarea` 최상단 배치 + 액션 바(모드 라디오 + 기록 버튼 + 자동 배지) + `<details class="capture-extra-settings">` 구조로 변경.
2. **`rememberCapture`, `restoreCapture`, `capture` 이벤트 처리**:
   - `drafts[date].manualKind` 플래그 관리 및 텍스트 타이핑 시 실시간 배지 업데이트.
   - 저장 시 `classifyActivity` 자동 반영.
3. **`style.css` 보완**:
   - `.capture-extra-settings` 및 `.capture-action-bar` 반응형 스타일 점검.
4. **검증 및 배포**:
   - `npm test` 및 `npm run build` 확인 후 GitHub Pages 배포 진행.

---

## 6. 현재 변경사항 안전 보존 방법

현재 변경사항은 로컬 Git 작업 디렉터리에 안전하게 남아 있습니다:
- 커밋되지 않은 파일: `activity-classify.js`, `tests/activity-classify.test.js`, `app.js`
- 변경사항을 별도 백업 브랜치에 보존하고 싶다면:
  ```bash
  git checkout -b feature/activity-ux-simple
  git add activity-classify.js tests/activity-classify.test.js app.js docs/UX_HANDOFF.md
  git commit -m "feat: rule-based activity classifier and setup for capture UX simplification"
  ```
- 또는 `main` 브랜치에 그대로 두어도 기존 기능에 영향이 없으며 `npm test` 및 `npm run build`가 100% 통과하는 안정 상태입니다.
