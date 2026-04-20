# Current MVP Flow

이 문서는 현재 구현된 사용자/서버/DB 흐름만 설명합니다.

## Implemented

### 1. Authentication

```text
/signup or /login
-> Supabase Auth
-> session cookie
-> /dashboard access
```

`/dashboard`는 로그인 사용자만 접근할 수 있습니다.

### 2. Start Diagnosis

```text
Dashboard start button
-> createDiagnosisSession()
-> active founder_diagnosis template lookup
-> diagnosis_sessions insert
-> redirect /dashboard?session={sessionId}
```

### 3. Answer Questions

```text
DiagnosisFlow
-> submitDiagnosisAnswer()
-> build answer payload by question_type
-> diagnosis_answers upsert
-> count active questions
-> count saved answers
```

question type 처리:

- `boolean`: `answer_boolean`
- `number`, `scale`: `answer_number`
- 나머지 선택/텍스트: `answer_text`

### 4. Complete Session

모든 active 질문에 답변하면:

```text
diagnosis_sessions.status = completed
diagnosis_sessions.completed_at = now
generateDiagnosisResult(sessionId)
```

### 5. Generate Core Result

```text
load session
-> load sections
-> load questions
-> load answers
-> calculate question scores
-> calculate section scores
-> calculate overall score/status
-> persist_diagnosis_result RPC
```

`short_text`와 `long_text`는 scoring하지 않습니다.

### 6. Generate Issues, Causes, Recommendations

```text
generateAndPersistDiagnosisArtifacts()
-> load issue definitions
-> load cause definitions
-> load action templates
-> match rules by dimension score/status
-> persist_diagnosis_artifacts RPC
```

생성 대상:

- `diagnosis_result_issues`
- `diagnosis_result_issue_causes`
- `action_recommendations`

schema/seed/RPC가 없으면 skip-safe로 동작하며 core result display는 유지됩니다.

### 7. Generate Result Actions

```text
generateResultActionsFromRecommendations()
-> load action_recommendations
-> create result_actions
```

현재 MVP의 실행 액션은 `result_actions`입니다.

### 8. Display Result

```text
getDiagnosisResult(sessionId)
-> diagnosis_results
-> diagnosis_result_dimensions
-> diagnosis_result_issues
-> diagnosis_result_issue_causes
-> action_recommendations
-> result_actions
-> recent results for comparison
```

대시보드 표시 항목:

- 전체 점수
- 위험 단계
- 다음 실행
- 영역별 점수/status/summary
- 문제/원인
- 추천 실행 액션
- 이번 주 실행 목록
- 실행 메모/evidence
- 재진단 비교

### 9. Update Execution Action

```text
ResultActionsPanel
-> updateResultAction()
-> result_actions update
-> revalidate /dashboard
```

상태:

- `todo`
- `doing`
- `done`

기록:

- `note`
- `evidence_url`

### 10. Re-diagnosis Comparison

결과 조회 시 최근 결과를 함께 로드합니다.

```text
current result
-> previous result
-> overall score diff
-> dimension score diff
-> improved / unchanged / declined
```

## Not Implemented Yet

- 결제
- paid gate
- plan-based execution page
- `action_plans/action_tasks` 기반 task flow
- admin review
- coach notes
- template asset delivery
- analytics funnel tracking

## Important Constraint

현재 active execution layer는 `result_actions`입니다.

`action_plans/action_tasks`는 schema에는 존재하지만 현재 MVP flow에는 연결되어 있지 않습니다.
