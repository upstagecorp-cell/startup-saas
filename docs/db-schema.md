# Database Schema Status

현재 MVP에서 사용하는 DB 객체만 정리.

## Diagnosis

- `diagnosis_templates`
- `diagnosis_template_sections`
- `diagnosis_questions`
- `diagnosis_sessions`
- `diagnosis_answers`

`business_type`은 첫 질문이며 분기 전용이다.

## Result

- `diagnosis_results`
- `diagnosis_result_dimensions`
- RPC: `persist_diagnosis_result`

## Recommendation

- `action_recommendations`

추천이 없으면 fallback recommendation을 강제 생성한다.

사용 필드:

- `result_id`
- `user_id`
- `recommendation_type`
- `title`
- `description`
- `rationale`
- `priority`
- `expected_impact`
- `effort_level`
- `source_type`
- `source_ref`
- `recommendation_version`
- `is_selected`

## Execution

- `result_actions`

`result_actions`가 유일한 실행 source of truth다.

사용 필드:

- `user_id`
- `diagnosis_result_id`
- `action_recommendation_id`
- `title`
- `description`
- `priority`
- `status`
- `due_date`
- `completed_at`
- `note`
- `evidence_url`

## Current Limits

- 추천 품질은 fallback 중심
- Stripe 결제 미연동
- 고급 추천 로직 없음
