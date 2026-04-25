# Architecture

현재 MVP 동작 기준 문서.

## Routes

- `/`
- `/login`
- `/signup`
- `/dashboard`

## 핵심 루프

```text
진단 → 결과 → 추천 액션 → 실행 → 기록 → 재진단
```

## Diagnosis Pipeline

```text
createDiagnosisSession()
-> diagnosis_answers upsert
-> business_type 기준 질문 분기
-> diagnosis_sessions completed
-> generateDiagnosisResult(sessionId)
-> persist_diagnosis_result RPC
-> fallback recommendation 보장
-> result_actions 생성
-> dashboard render
```

## 실행 레이어 구조

- `action_recommendations`
- `result_actions`

동작 흐름:

1. `diagnosis_results` 생성
2. 추천이 없으면 fallback recommendation 생성
3. `result_actions` 생성
4. dashboard에서 실행 가능 상태로 표시

## Scoring

- `scale`, `boolean`, `single_choice`, `multiple_choice`, `number`는 점수화
- `short_text`, `long_text`는 점수 제외
- `business_type`은 분기 전용이며 점수 제외

## Not In Scope

- Stripe
- admin
- 고급 AI 추천
