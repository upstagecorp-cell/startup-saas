# Startup SaaS

AI 기반 창업 진단 및 실행 SaaS MVP.

## 현재 시스템 상태

- 진단 플로우: 정상 동작
- 결과 생성: 정상 동작
- fallback 추천 생성: 항상 1개 이상 생성됨
- 실행 액션(`result_actions`): 정상 생성됨
- 대시보드 렌더링: 정상

## 핵심 루프

```text
진단 → 결과 → 추천 액션 → 실행 → 기록 → 재진단
```

## 주요 동작 규칙

- 첫 질문은 `business_type`이며 `online` / `offline` 분기에 사용됨
- 자유 입력 질문(`short_text` / `long_text`) 정상 처리
- 텍스트 답변은 점수 계산에서 제외됨
- 추천이 없을 경우 fallback 액션 강제 생성
- 항상 최소 1개의 실행 액션 보장
- 실행 레이어는 `result_actions`만 사용

## 실행 레이어

- `action_recommendations`: 추천 액션 저장
- `result_actions`: 사용자가 실행하고 기록하는 액션

`result_actions`에서 관리하는 값:

- `status`
- `note`
- `evidence_url`
- `due_date`
- `completed_at`

## 제외 범위

- Stripe 결제
- admin
- AI 고급 추천

## 검증 명령

```bash
npm.cmd run typecheck
npm.cmd run check:encoding
npm.cmd run build
```
