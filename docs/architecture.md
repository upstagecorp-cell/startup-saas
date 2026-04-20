# Architecture

이 문서는 현재 MVP 구현 상태만 설명합니다.

## Implemented

### App Router

현재 활성 라우트:

- `/`
- `/login`
- `/signup`
- `/dashboard`

`app/page.tsx`가 유일한 root route(`/`)입니다.

중요 제약:

- `app/(marketing)/page.tsx` 같은 route group page를 추가하면 `/`가 중복됩니다.
- root route는 반드시 `app/page.tsx` 한 곳에서만 소유합니다.

### Server/Client Boundaries

- `app/dashboard/page.tsx`는 server component입니다.
- `components/dashboard/diagnosis-flow.tsx`는 client component입니다.
- `components/dashboard/result-actions-panel.tsx`는 client component입니다.
- server action은 `app/dashboard/actions.ts`에 있습니다.
- Supabase server client는 `lib/supabase/server.ts`에서 생성합니다.
- Supabase browser client는 `lib/supabase/client.ts`에서 생성합니다.

### Diagnosis Pipeline

```text
createDiagnosisSession()
-> diagnosis_sessions insert
-> DiagnosisFlow answer submit
-> diagnosis_answers upsert
-> all active questions answered
-> diagnosis_sessions completed
-> generateDiagnosisResult(sessionId)
-> persist_diagnosis_result RPC
-> generateAndPersistDiagnosisArtifacts()
-> generateResultActionsFromRecommendations()
-> dashboard result render
```

### Result Engine

주요 파일:

- `lib/diagnosis/scoring.ts`
- `lib/diagnosis/results.ts`

지원 question type:

- `scale`
- `boolean`
- `single_choice`
- `multiple_choice`
- `number`
- `short_text` scoring 제외
- `long_text` scoring 제외

### Artifact Layer

주요 파일:

- `lib/diagnosis/artifacts.ts`
- `supabase/migrations/20260417_add_diagnosis_artifact_rules_and_rpc.sql`

현재 artifact layer는 rule-based입니다.

생성 대상:

- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`

schema 또는 seed가 아직 적용되지 않은 DB에서도 core result flow가 깨지지 않도록 fail-open 방식으로 동작합니다.

### Active Execution Layer

현재 MVP에서 실제 사용되는 실행 레이어는 `result_actions`입니다.

주요 파일:

- `lib/diagnosis/result-actions.ts`
- `components/dashboard/result-actions-panel.tsx`
- `supabase/migrations/20260417_add_result_actions.sql`

동작:

- `action_recommendations`를 기반으로 `result_actions`를 생성합니다.
- 사용자는 action status를 `todo`, `doing`, `done`으로 변경합니다.
- 사용자는 action별 `note`와 `evidence_url`을 저장합니다.
- dashboard는 완료율, 기록 수, 최근 완료 액션을 표시합니다.

## Not Implemented Yet

- Stripe 결제
- `purchases`
- paid gate
- `/admin`
- `coach_notes`
- 관리자 액션/플랜 수정
- `action_plans` 기반 UI
- `action_tasks` 기반 실행 flow
- 템플릿 자산화
- PostHog/GA 이벤트 추적
- AI 기반 개인화 추천

## Build Status

Production build는 현재 통과합니다.

```bash
npm.cmd run build
```

`next.config.ts`는 workspace root 추론 경고를 피하기 위해 `outputFileTracingRoot: process.cwd()`를 명시합니다.
