# Database Schema Status

이 문서는 현재 MVP에서 실제로 사용 중인 DB 객체와 아직 사용하지 않는 객체를 구분합니다.

## Implemented And Active

### Auth/Profile

- `auth.users`
- `profiles`

`profiles`는 auth user 생성 시 자동 생성되는 구조입니다.

### Diagnosis Definition

- `diagnosis_templates`
- `diagnosis_template_sections`
- `diagnosis_questions`
- `diagnosis_question_conditions`

현재 앱은 active `founder_diagnosis` 템플릿을 기준으로 질문을 로드합니다.

### Diagnosis Runtime

- `diagnosis_sessions`
- `diagnosis_answers`

동작:

- 진단 시작 시 `diagnosis_sessions` 생성
- 답변 제출 시 `diagnosis_answers` upsert
- 모든 active 질문 답변 완료 시 session status를 `completed`로 변경

### Result Persistence

- `diagnosis_results`
- `diagnosis_result_dimensions`
- RPC: `persist_diagnosis_result`

`persist_diagnosis_result`는 현재 결과 저장의 필수 경로입니다.

처리 내용:

- `diagnosis_answers.score` 업데이트
- `diagnosis_sessions.overall_score` / `summary` 업데이트
- `diagnosis_results` 저장
- `diagnosis_result_dimensions` 저장

### Artifact Persistence

- `diagnosis_issue_definitions`
- `diagnosis_issue_cause_definitions`
- `diagnosis_action_templates`
- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`
- RPC: `persist_diagnosis_artifacts`

현재 artifact layer는 rule-based입니다.

정의 테이블:

- `diagnosis_issue_definitions`
- `diagnosis_issue_cause_definitions`
- `diagnosis_action_templates`

결과 테이블:

- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`

### Active Execution Layer

- `result_actions`

현재 MVP에서 실제 실행 상태, 메모, 증거 링크를 저장하는 테이블입니다.

필드 역할:

- `result_id`: 연결된 진단 결과
- `recommendation_id`: 원본 추천
- `status`: `todo`, `doing`, `done`
- `note`: 사용자 실행 메모
- `evidence_url`: 실행 증거 링크
- `started_at`
- `completed_at`
- `due_date`

## Exists But Not Active In MVP Flow

초기 schema에는 아래 테이블이 존재하지만 현재 UI와 server action flow에서는 사용하지 않습니다.

- `action_plans`
- `action_tasks`
- `action_execution_logs`
- `diagnosis_result_insights`
- `ai_analysis_logs`

중요:

- `action_plans/action_tasks`를 현재 구현된 실행 레이어처럼 문서화하지 않습니다.
- 현재 실행 source of truth는 `result_actions`입니다.
- `diagnosis_result_insights`는 아직 생성/조회 UI가 없습니다.
- `ai_analysis_logs`는 현재 active AI flow가 없어 사용하지 않습니다.

## Not Implemented Yet

- `purchases`
- Stripe checkout/session 저장
- paid gate 관련 DB
- `coach_notes`
- template asset tables
- analytics event tables

## Status Mapping

앱 내부 status:

- `healthy`
- `warning`
- `critical`

DB-facing dimension status:

- `strong`
- `moderate`
- `weak`
- `critical`

현재 매핑:

- `healthy -> strong`
- `warning -> moderate`
- `critical -> critical`

DB enum/text status와 앱 내부 status를 직접 혼용하지 않습니다.

## Encoding Audit

DB 인코딩과 깨진 한국어 row 점검은 다음 파일을 Supabase SQL Editor에서 실행합니다.

- `docs/db-encoding-audit.sql`

이 SQL은 schema나 데이터를 변경하지 않습니다.
