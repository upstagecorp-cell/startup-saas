# Diagnosis And Execution Checklist

현재 MVP 검증용 체크리스트.

## Core

- `business_type`이 첫 질문으로 표시됨
- `short_text`, `long_text`는 저장되지만 점수 제외
- 모든 필수 질문 답변 후 `diagnosis_results` 생성
- `diagnosis_result_dimensions` 생성

## Fallback Recommendation

결과 생성 후 확인:

- `action_recommendations` 최소 1개 생성
- 추천이 없으면 fallback recommendation 강제 생성
- fallback은 가장 약한 dimension을 기준으로 생성

## Result Actions

확인:

- `result_actions` 최소 1개 생성
- `diagnosis_result_id`가 현재 결과를 가리킴
- `action_recommendation_id`가 추천 액션을 가리킴
- `status = todo`
- `due_date` 설정됨

## Dashboard

확인:

- 결과 페이지 렌더링
- Primary Action 표시
- 추천 실행 액션 표시
- note 저장
- evidence URL 저장
- 완료 상태 업데이트

## 현재 한계

- 추천 품질은 fallback 중심
- Stripe 결제 미연동
- 고급 추천 로직 없음
