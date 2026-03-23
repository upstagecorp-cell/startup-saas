# Project Instructions

이 프로젝트는 AI 기반 창업 진단 및 실행 SaaS 플랫폼이다.

## 핵심 흐름
진단 → 원인 분석 → 실행 액션 → 재진단

## 현재 상태
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth 완료
- 회원가입 / 로그인 / 이메일 인증 / 세션 유지 완료
- profiles 자동 생성 trigger 완료
- Supabase DB schema / RLS / seed 완료
- diagnosis_sessions / diagnosis_answers 저장 완료
- 아직 diagnosis_results 계산 로직은 미구현

## 작업 원칙
1. 바로 코드부터 쓰지 말고 현재 코드베이스를 먼저 읽고 이해할 것
2. README.md 와 PROJECT_CONTEXT.md 를 먼저 참고할 것
3. 기존 DB 구조를 최대한 유지할 것
4. 최소 수정으로 진행할 것
5. 실행 가능한 코드만 제안할 것
6. diff 형식이 아니라 최종 코드/SQL 본문을 줄 것

## 다음 우선 작업
- diagnosis_answers 기반 rule-based 결과 계산 엔진 구현
- diagnosis_results 생성
- diagnosis_result_dimensions 생성
- dashboard에서 결과 표시

## 주의사항
- .env.local은 수정하거나 노출하지 말 것
- Supabase auth 구조와 RLS 정책을 깨지 말 것
- 기존 질문/답변 흐름을 유지하면서 결과 계산 단계만 추가할 것