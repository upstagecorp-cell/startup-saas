# 🚀 Startup SaaS 프로젝트 상태

## ✅ 현재 구현 완료

* Supabase Auth 연결 완료
* 회원가입 (email/password)
* 이메일 인증 (confirm)
* 로그인 기능
* 세션 유지 (middleware 포함)
* 보호 라우팅 (/dashboard 접근 제어)

---

## 🧱 기술 스택

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Supabase (Auth + DB)

---

## 📁 주요 구조

* app/ → 라우팅

  * /login
  * /signup
  * /dashboard
* components/ → UI 및 auth 관련 컴포넌트
* lib/supabase → client / server 분리

---

## ⚠️ 현재 상태 요약

* 로그인 성공 시 dashboard 진입 정상
* 세션 유지 정상
* 인증 시스템 완료

---

## 🎯 다음 작업

1. 사용자 데이터 구조 설계 (DB)
2. 진단 질문 시스템 설계
3. 답변 저장 구조 만들기
4. dashboard 기능 확장

---

## 🧠 핵심 방향

* 진단 → 원인 분석 → 실행 액션 → 재진단 흐름의 SaaS
# 🚀 Startup SaaS - AI Founder Diagnosis Platform

## 🧠 핵심 방향
진단 → 원인 분석 → 실행 액션 → 재진단

---

## 📌 프로젝트 소개
예비 창업자 및 초기 창업자를 대상으로  
현재 상태를 진단하고, 실행 가능한 액션까지 연결하는 SaaS 플랫폼

---

## 🛠 기술 스택
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + RLS)

---

## ✅ 현재 구현 상태

### 인증
- 회원가입 / 로그인
- 이메일 인증
- 세션 유지
- 보호 라우팅 (/dashboard)

### DB
- 전체 스키마 설계 완료
- RLS 정책 적용 완료
- seed 데이터 입력 완료

### 진단 기능
- 진단 시작 → session 생성
- 질문 순차 진행
- 답변 저장 (diagnosis_answers)
- 세션 상태 완료 처리

---

## ❗ 아직 미구현

- diagnosis 결과 계산 로직
- 점수 산정 (section / overall)
- 결과 UI
- 액션 추천 시스템

---

## 🚧 다음 작업

1. diagnosis_answers 기반 결과 계산 엔진
2. diagnosis_results 생성
3. diagnosis_result_dimensions 생성
4. dashboard 결과 표시

---

## 📂 프로젝트 구조
app/
login/
signup/
dashboard/

components/
auth/
ui/
layout/

lib/
supabase/

---

## ⚙️ 실행 방법

```bash
npm install
npm run dev
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

---

# 2️⃣ PROJECT_CONTEXT.md (Codex + 개발용 핵심)

👉 이 파일이 제일 중요하다  
👉 Codex는 이거 읽고 “구조 이해” 한다

지금 너 상태 기준으로 **결과 엔진 단계로 업데이트해야 한다**

---

## 👉 복붙용 PROJECT_CONTEXT.md (업데이트 버전)

```md
# 🧠 Startup SaaS 프로젝트 상태

---

## ✅ 현재 구현 완료

### 인증 시스템
- Supabase Auth 연결
- 회원가입 / 로그인
- 이메일 인증
- 세션 유지
- 보호 라우팅 (/dashboard)

---

### 진단 흐름 (1단계 완료)

- 진단 시작 버튼 → diagnosis_sessions 생성
- founder_diagnosis 템플릿 기반 질문 로딩
- 질문 순차 진행 (section 기반)
- 답변 저장 (diagnosis_answers)
- 모든 질문 완료 시 session 상태 → completed

---

## 📊 현재 DB 핵심 흐름
auth.users
→ profiles

diagnosis_templates
→ diagnosis_template_sections
→ diagnosis_questions

diagnosis_sessions
→ diagnosis_answers

---


---

## ❗ 현재 상태 요약

👉 "데이터 수집 단계 완료"

- 사용자 입력 데이터는 모두 정상 저장됨
- 하지만 결과 해석 로직 없음

---

## 🚨 다음 핵심 단계 (중요)

👉 "진단 결과 엔진 구현"

---

## 🎯 목표 흐름
diagnosis_sessions
→ diagnosis_answers
→ diagnosis_results
→ diagnosis_result_dimensions
→ diagnosis_result_issues
→ action_recommendations

---

## 📌 다음 작업 상세

### 1. 결과 계산
- answer 기반 점수 계산
- section별 점수
- overall_score 계산

### 2. 결과 저장
- diagnosis_results 생성
- diagnosis_result_dimensions 생성

### 3. 결과 표시
- dashboard에서 결과 UI

---

## 🧠 설계 원칙

- 초기 버전은 rule-based
- AI는 이후 단계에서 추가
- DB 구조 유지
- 확장 가능한 구조 유지

---

## ⚠️ 주의사항

- RLS 정책 유지
- user_id 기반 접근 유지
- 기존 흐름 깨지지 않도록 최소 수정

---

## 🚀 현재 개발 단계

👉 Phase 2: 결과 계산 엔진 구현 단계
