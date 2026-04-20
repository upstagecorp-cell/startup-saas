# Diagnosis Artifacts And Result Actions Checklist

이 문서는 현재 MVP의 artifact 및 실행 액션 레이어를 검증하기 위한 체크리스트입니다.

## Current Status

Implemented:

- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`
- `result_actions`
- `persist_diagnosis_artifacts`
- dashboard issue/cause/recommendation display
- dashboard result action display/update

Not implemented yet:

- `diagnosis_result_insights` 생성/표시
- `action_plans` 기반 plan UI
- `action_tasks` 기반 task UI
- 관리자 검토/수정
- 결제 gate

## Guardrails

- `app/dashboard/actions.ts -> generateDiagnosisResult() -> persist_diagnosis_result` 흐름을 유지합니다.
- Artifact generation은 core result persistence 이후의 post-processing layer입니다.
- `short_text`, `long_text`는 scoring하지 않습니다.
- 현재 active execution layer는 `result_actions`입니다.
- `action_plans/action_tasks`를 active execution layer로 취급하지 않습니다.
- Artifact schema 또는 seed가 없는 환경에서도 core result screen은 표시되어야 합니다.

## 1. Migration Check

필요 객체:

- `diagnosis_issue_definitions`
- `diagnosis_issue_cause_definitions`
- `diagnosis_action_templates`
- `diagnosis_result_issue_causes`
- `result_actions`
- `persist_diagnosis_artifacts`

관련 migration:

- `supabase/migrations/20260417_add_diagnosis_artifact_rules_and_rpc.sql`
- `supabase/migrations/20260417_add_result_actions.sql`

## 2. Core Result Check

진단 완료 후 아래가 생성되어야 합니다.

- `diagnosis_results`
- `diagnosis_result_dimensions`

이 단계는 artifact/result action schema와 무관하게 동작해야 합니다.

## 3. Artifact Check

seed와 rule이 맞으면 아래가 생성됩니다.

- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`

검증 SQL:

- `docs/diagnosis-artifacts-manual-verification.sql`

## 4. Result Actions Check

`action_recommendations`가 존재하면 `result_actions`가 생성되어야 합니다.

확인 항목:

- `result_actions.result_id`
- `result_actions.recommendation_id`
- `result_actions.status`
- `result_actions.title`
- `result_actions.due_date`

대시보드에서 확인할 항목:

- 전체 액션 수
- 진행 중 액션 수
- 완료 액션 수
- 완료율
- 메모
- evidence URL

## 5. Re-diagnosis Check

액션을 완료하거나 완료율이 기준에 도달하면 재진단 CTA가 표시됩니다.

재진단 후 결과 화면에서 확인할 항목:

- 현재 점수
- 이전 점수
- 점수 변화
- 개선/유지/하락 dimension

## Expected MVP Behavior

- issue/cause/recommendation이 없으면 추천 섹션은 비어 있어도 dashboard는 깨지지 않습니다.
- recommendation이 없으면 `result_actions` 생성은 skip됩니다.
- `result_actions`가 없으면 실행 목록은 empty state를 보여줍니다.
- `action_plans/action_tasks`는 현재 표시되지 않습니다.
