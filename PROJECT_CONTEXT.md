# 🧠 Startup SaaS 프로젝트 상태

## 프로젝트 개요
예비 창업자 및 초기 창업자를 대상으로  
현재 상태를 진단하고, 문제 원인을 구조적으로 파악한 뒤,  
실행 가능한 액션과 재진단 흐름까지 연결하는 SaaS 플랫폼

핵심 방향:

진단 → 원인 분석 → 실행 액션 → 재진단

---

## 🛠 기술 스택

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + RLS + RPC)

---

## ✅ 현재 구현 완료

### 1. 인증 시스템
- Supabase Auth 연결 완료
- 회원가입 / 로그인 완료
- 이메일 인증 완료
- 세션 유지 완료
- middleware 기반 보호 라우팅 완료
- `/dashboard` 접근 제어 완료

---

### 2. DB / 기본 구조
- 전체 DB 스키마 설계 완료
- RLS 정책 적용 완료
- seed 데이터 입력 완료
- profiles 자동 생성 trigger 완료

핵심 테이블 구조:

- `profiles`
- `diagnosis_templates`
- `diagnosis_template_sections`
- `diagnosis_questions`
- `diagnosis_sessions`
- `diagnosis_answers`
- `diagnosis_results`
- `diagnosis_result_dimensions`

---

### 3. 진단 흐름
- 진단 시작 시 `diagnosis_sessions` 생성
- founder diagnosis 템플릿 기반 질문 로딩
- 질문 순차 진행 UI 완료
- 사용자 답변 저장 완료 (`diagnosis_answers`)
- 모든 질문 완료 시 session 상태 `completed` 처리 완료

---

### 4. Rule-based 결과 계산 엔진
- `diagnosis_answers` 기반 점수 계산 로직 구현 완료
- question_type별 scoring 로직 구현 완료
- section score 계산 완료
- overall score 계산 완료
- overall status 계산 완료
- recommended next step 생성 완료

지원 question_type:

- `scale`
- `boolean`
- `single_choice`
- `multiple_choice`
- `number`
- `short_text`
- `long_text`

처리 원칙:

- 정량형 질문은 0~100 점수화
- `short_text`, `long_text`는 점수 계산 제외
- question weight 적용
- section score = 가중 평균
- overall score = section 가중 평균

---

### 5. 결과 저장 로직
- `persist_diagnosis_result` RPC 구현 완료
- `diagnosis_answers.score` 업데이트 완료
- `diagnosis_sessions.overall_score` / `summary` 업데이트 완료
- `diagnosis_results` 저장 완료
- `diagnosis_result_dimensions` 저장 완료

---

### 6. 결과 조회 및 UI
- 결과 조회 로직 구현 완료
- dashboard에서 결과 표시 완료

현재 결과 UI 표시 항목:

- Overall Score
- Risk Level
- Next Step
- Dimension 리스트
  - dimension_name
  - score
  - status
  - summary

---

## 📊 현재 서비스 흐름

auth.users
→ profiles

diagnosis_templates
→ diagnosis_template_sections
→ diagnosis_questions

diagnosis_sessions
→ diagnosis_answers
→ diagnosis_results
→ diagnosis_result_dimensions

---

## ⚠️ 현재 상태 요약

현재 프로젝트는 아래 단계까지 완료됨:

👉 데이터 수집 완료  
👉 rule-based 결과 계산 완료  
👉 결과 저장 완료  
👉 결과 조회 및 결과 UI 완료

즉, 현재는

입력 → 계산 → 저장 → 결과 표시

까지 전부 연결된 상태

---

## 🚨 이번 작업에서 해결한 핵심 이슈

### 1. Supabase API key 문제
- 로그인 시 `Invalid API key` 발생
- `.env.local` 값 재설정으로 해결

### 2. 자유입력 질문에서 choice scoring 오류
- `short_text`, `long_text` 질문이 choice 로직으로 잘못 처리되던 문제 해결
- 자유입력 질문은 scoring 제외 처리

### 3. 결과 저장 실패
- score가 없는 dimension row까지 DB insert 하던 문제 해결
- null score dimension 제외 처리

### 4. dimension status enum 불일치
- 앱 상태값과 DB enum 값 불일치 해결

매핑 규칙:

- `healthy` → `strong`
- `warning` → `moderate`
- `critical` → `critical`

### 5. RPC SQL enum 타입 캐스팅 문제
- `diagnosis_result_dimensions.status`는 `dimension_status` enum
- text 그대로 insert하던 문제 해결
- SQL 쪽 enum 타입 처리 반영

---

## 📌 현재 결과 상태 체계

앱 내부 결과 상태:
- `healthy`
- `warning`
- `critical`

DB dimension enum 상태:
- `strong`
- `moderate`
- `weak`
- `critical`

현재 매핑:
- `healthy` → `strong`
- `warning` → `moderate`
- `critical` → `critical`

주의:
- DB enum과 앱 문자열 상태를 직접 혼용하면 안 됨

---

## 📂 현재 핵심 파일

### 진단 계산
- `lib/diagnosis/scoring.ts`
- `lib/diagnosis/results.ts`

### 진단 액션 연결
- `app/dashboard/actions.ts`

### Supabase 관련
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`

### DB / RPC
- `supabase/migrations/20260323_initial_founder_diagnosis_schema.sql`
- `supabase/migrations/20260324_add_persist_diagnosis_result_rpc.sql`

### 결과 UI
- dashboard 결과 표시 관련 page / component 파일

---

## 🧠 현재 설계 원칙

- 초기 버전은 rule-based로 유지
- AI 기반 분석은 이후 단계에서 추가
- DB 구조를 최대한 유지하면서 확장
- 기존 인증 흐름과 RLS 정책 유지
- user_id 기반 접근 제어 유지
- 결과 계산 로직은 `lib/diagnosis` 하위에서 관리
- DB enum 타입과 앱 상태 문자열은 반드시 명시적으로 매핑

---

## ❗ 아직 미구현

### 1. 문제/이슈 생성 로직
- `diagnosis_result_issues` 생성 미구현

### 2. 인사이트 생성 로직
- `diagnosis_result_insights` 생성 미구현

### 3. 액션 추천 시스템
- `action_recommendations` 생성 및 저장 미구현
- 결과 화면 내 액션 추천 연결 미구현

### 4. 재진단 비교
- 이전 결과와 현재 결과 비교 미구현

### 5. 결과 설명 고도화
- 현재는 summary / next step 수준
- 구체적인 원인 설명 및 실행 가이드 부족

---

## 🎯 다음 핵심 단계

👉 Phase 3: Action Recommendation 시스템 구현

---

## 📌 다음 작업 상세

### 1. action recommendation 생성
- dimension status 기반 rule-based action 추천 생성
- critical / moderate / strong 기준 분기

### 2. DB 저장
- `action_recommendations` 연결
- 필요 시 `diagnosis_result_issues` / `diagnosis_result_insights` 생성

### 3. 결과 화면 확장
- dimension별 추천 액션 표시
- 우선순위 / 난이도 / 설명 표시

### 4. 이후 단계
- 재진단 비교 기능
- AI 기반 요약 / 추천 고도화

---

## 🚀 현재 개발 단계

👉 Phase 1: 인증 및 데이터 수집 완료  
👉 Phase 2: 결과 계산 엔진 및 결과 UI 완료  
👉 Next Phase: 실행 액션 추천 시스템 구현

---

## ⚠️ 다음 세션 / 다음 Codex 작업 시 반드시 알아야 할 것

1. 현재 진단 결과 계산은 정상 동작 중
2. 결과 저장 RPC도 정상 반영 완료
3. 결과 화면도 정상 표시 중
4. 다음 작업은 “결과를 보여주는 것”이 아니라  
   “결과를 바탕으로 사용자가 실제 행동할 수 있게 만드는 것”
5. 따라서 다음 구현 우선순위는 무조건 action recommendation

---

## 다음 작업 시작용 요약 프롬프트

현재 프로젝트는 Next.js + TypeScript + Tailwind + Supabase 기반 창업 진단 SaaS입니다.

현재까지 완료:
- Auth / 세션 유지 / 보호 라우팅
- DB schema / RLS / seed
- diagnosis session 생성
- 질문 순차 진행
- diagnosis_answers 저장
- session 완료 처리
- rule-based diagnosis result 계산
- diagnosis_results 저장
- diagnosis_result_dimensions 저장
- dashboard 결과 조회 및 결과 UI 표시

현재 다음 작업:
- dimension status 기반 action recommendation 시스템 구현
- 필요 시 diagnosis_result_issues / diagnosis_result_insights 생성
- 결과 화면에 추천 액션 표시 연결

주의사항:
- short_text / long_text는 점수 계산 제외
- DB enum(dimension_status)과 앱 상태 문자열을 직접 혼용하면 안 됨
- status 매핑 유지:
  healthy → strong
  warning → moderate
  critical → critical
- persist_diagnosis_result RPC 구조 유지
