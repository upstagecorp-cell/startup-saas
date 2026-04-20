# AGENTS.md

## Project Purpose

이 프로젝트는 예비 창업자 및 초기 창업자를 위한 AI 기반 창업 진단 및 실행 SaaS MVP입니다.

핵심 흐름:

```text
진단 -> 원인 분석 -> 실행 액션 -> 기록 -> 재진단
```

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, RLS, RPC

## Current Implementation

### Implemented

- 회원가입/로그인
- 이메일 인증 기반 Supabase Auth
- 세션 유지
- `/dashboard` 보호 라우팅
- `diagnosis_sessions` 생성
- `diagnosis_answers` 저장
- session 완료 처리
- rule-based 점수 계산
- `persist_diagnosis_result` RPC 기반 결과 저장
- `diagnosis_results` 저장
- `diagnosis_result_dimensions` 저장
- `diagnosis_result_issues` 저장
- `diagnosis_result_issue_causes` 저장
- `action_recommendations` 저장
- `result_actions` 생성
- `result_actions` 상태/메모/evidence 업데이트
- dashboard 결과 표시
- 재진단 비교

### Not Implemented Yet

- Stripe 결제
- `purchases`
- paid gate
- `/admin`
- `coach_notes`
- `action_plans/action_tasks` 기반 실행 flow
- 템플릿 자산화
- analytics funnel tracking
- AI 기반 개인화 추천

## Do Not Break

아래 핵심 흐름은 변경하거나 깨면 안 됩니다.

```text
diagnosis_sessions 생성
-> diagnosis_answers 저장
-> session 완료 처리
-> generateDiagnosisResult(sessionId)
-> diagnosis_results 저장
-> diagnosis_result_dimensions 저장
-> artifact 생성
-> action_recommendations 저장
-> result_actions 저장
-> dashboard 결과 표시
```

## Scoring Rules

- 모든 정량형 질문은 0~100 점수화
- `short_text`, `long_text`는 scoring 제외
- question weight 적용
- section score = 가중 평균
- overall score = section 가중 평균

반드시 type별 분기 처리:

- `scale`
- `boolean`
- `single_choice`
- `multiple_choice`
- `number`
- `short_text` scoring 제외
- `long_text` scoring 제외

자유입력은 절대 scoring하지 않습니다.

## Status Mapping

앱 내부 상태:

- `healthy`
- `warning`
- `critical`

DB-facing dimension status:

- `strong`
- `moderate`
- `weak`
- `critical`

매핑:

- `healthy -> strong`
- `warning -> moderate`
- `critical -> critical`

DB enum/text status와 앱 내부 status를 직접 혼용하지 않습니다.

## Current Execution Model

현재 활성 실행 레이어는 `result_actions`입니다.

- `action_recommendations`에서 `result_actions`를 생성합니다.
- 사용자는 `result_actions.status`를 변경합니다.
- 사용자는 `result_actions.note`, `result_actions.evidence_url`을 기록합니다.

`action_plans`, `action_tasks`, `action_execution_logs`는 schema에는 존재하지만 현재 MVP에서는 사용하지 않습니다.

## Routing Constraint

`app/page.tsx`가 유일한 root route(`/`)입니다.

route group 안에 또 다른 root `page.tsx`를 만들지 않습니다.

## Build Status

현재 production build는 통과합니다.

```bash
npm.cmd run typecheck
npm.cmd run check:encoding
npm.cmd run build
```

## Code Structure

- 결과 계산 로직: `lib/diagnosis`
- Supabase 접근: `lib/supabase`
- Dashboard server actions: `app/dashboard/actions.ts`
- UI는 DB 직접 접근 금지. server action 또는 server component 경유.

## Prohibited

- `.env.local` Git 포함 금지
- Supabase key 하드코딩 금지
- 기존 Auth 구조 변경 금지
- RLS 우회 금지
- `result_actions`와 `action_tasks`를 동시에 active source of truth로 사용 금지
