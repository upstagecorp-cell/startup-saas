# Current MVP Flow

현재 실제 동작 기준.

## 1. Login

```text
/signup or /login
-> Supabase Auth
-> /dashboard
```

## 2. Diagnosis

```text
dashboard start
-> diagnosis_sessions 생성
-> business_type 선택
-> 분기된 질문 답변 저장
-> diagnosis_answers upsert
```

자유 입력:

- `short_text`, `long_text`는 `answer_text`로 저장
- 점수 계산에서 제외

## 3. Result

```text
모든 필수 질문 답변
-> diagnosis_sessions completed
-> generateDiagnosisResult()
-> diagnosis_results 생성
-> diagnosis_result_dimensions 생성
```

## 4. Recommendation And Action

```text
추천 생성 시도
-> 추천이 없으면 fallback recommendation 강제 생성
-> result_actions 생성
```

보장:

- `action_recommendations` 최소 1개
- `result_actions` 최소 1개

## 5. Dashboard Execution

dashboard 표시:

- 진단 결과
- 추천 실행 액션
- Primary Action
- 실행 상태
- 메모
- 증거 링크

## 6. Re-diagnosis

```text
실행 기록
-> 재진단
-> 이전 결과와 현재 결과 비교
```
