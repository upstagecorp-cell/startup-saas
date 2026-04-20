# Project Context

현재 프로젝트는 예비 창업자와 초기 창업자를 위한 AI 기반 창업 진단 및 실행 SaaS MVP입니다.

## Product Direction

핵심 방향:

```text
진단 -> 원인 분석 -> 실행 액션 -> 기록 -> 재진단
```

현재 제품은 plan-based SaaS가 아니라, 진단 결과에서 `result_actions`를 생성해 실행 기록을 받는 MVP입니다.

## Implemented

- Supabase Auth
- 회원가입/로그인
- 세션 유지
- `/dashboard` 보호 라우팅
- 진단 세션 생성
- 질문 순차 진행
- 답변 저장
- 세션 완료 처리
- rule-based scoring
- 결과 저장 RPC
- dimension 결과 저장
- issue/cause/recommendation artifact 생성
- `result_actions` 생성
- 액션 상태 변경
- 액션 메모/evidence 저장
- 결과 UI
- 재진단 비교
- Korean mojibake source scan
- production build 통과

## Current Active Execution Model

현재 active execution layer:

- `result_actions`

현재 active recommendation layer:

- `action_recommendations`

실제 흐름:

```text
diagnosis_result
-> diagnosis_result_issues
-> diagnosis_result_issue_causes
-> action_recommendations
-> result_actions
-> user status/note/evidence
```

`action_plans`, `action_tasks`, `action_execution_logs`는 초기 schema에 존재하지만 현재 구현된 UI/server action flow에서는 사용하지 않습니다.

## Not Implemented Yet

- Stripe 결제
- `purchases`
- paid gate
- `/admin`
- `coach_notes`
- 관리자 플랜/액션 수정
- `action_plans/action_tasks` 기반 실행 화면
- 템플릿 URL/완료 기준/산출물 관리
- analytics funnel tracking
- AI 기반 개인화 추천

## Routing Constraint

`app/page.tsx`가 유일한 `/` route입니다.

route group 안에 또 다른 `page.tsx`를 만들어 `/`를 중복 소유하지 않습니다.

## Build Status

현재 production build는 통과합니다.

검증:

```bash
npm.cmd run typecheck
npm.cmd run check:encoding
npm.cmd run build
```

## Key Guardrails

- `diagnosis_sessions -> diagnosis_answers -> completed -> generateDiagnosisResult -> diagnosis_results -> dashboard` 흐름을 깨지 않습니다.
- 결과 저장은 `persist_diagnosis_result` RPC를 사용합니다.
- 자유입력 질문은 scoring하지 않습니다.
- status mapping을 유지합니다.
- 현재 실행 source of truth는 `result_actions`입니다.
- `action_plans/action_tasks`를 active 구현처럼 다루지 않습니다.
