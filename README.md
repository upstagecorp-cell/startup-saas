# 🚀 Startup SaaS - AI Founder Diagnosis Platform

## 🧠 핵심 방향
진단 → 원인 분석 → 실행 액션 → 재진단

---

## 📌 프로젝트 소개
예비 창업자 및 초기 창업자를 대상으로  
현재 상태를 진단하고, 문제를 구조적으로 분석한 뒤  
실행 가능한 액션까지 연결하는 SaaS 플랫폼

---

## 🛠 기술 스택
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + RLS + RPC)

---

## ✅ 현재 구현 상태

### 인증
- 회원가입 / 로그인
- 이메일 인증
- 세션 유지
- 보호 라우팅 (/dashboard)

---

### DB
- 전체 스키마 설계 완료
- RLS 정책 적용 완료
- seed 데이터 입력 완료
- profiles 자동 생성 trigger 완료

---

### 진단 기능
- 진단 시작 → diagnosis_sessions 생성
- 질문 순차 진행 UI
- 답변 저장 (diagnosis_answers)
- session 완료 처리

---

### 결과 엔진 (핵심)
- rule-based 점수 계산 구현 완료
- question_type별 scoring 처리
- section score 계산
- overall score 계산
- 결과 상태 계산

---

### 결과 저장
- diagnosis_results 생성
- diagnosis_result_dimensions 생성
- RPC (`persist_diagnosis_result`) 기반 저장

---

### 결과 UI
- dashboard에서 결과 표시

표시 항목:
- Overall Score
- Risk Level
- Next Step
- Dimension별 점수 / 상태 / 설명

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

현재는 아래까지 완료된 상태:

✔ 데이터 수집  
✔ 결과 계산  
✔ 결과 저장  
✔ 결과 조회 및 UI 표시  

즉:

입력 → 계산 → 저장 → 결과 표시

---

## ❗ 아직 미구현

- diagnosis_result_issues 생성
- diagnosis_result_insights 생성
- action recommendation 시스템
- 재진단 비교 기능

---

## 🎯 다음 작업

👉 Action Recommendation 시스템 구현

---

## ⚙️ 실행 방법

```bash
git clone https://github.com/upstagecorp-cell/startup-saas.git
cd startup-saas
npm install

.env.local 생성:

NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
npm run dev
⚠️ 주의사항
.env.local 절대 Git에 포함 금지
Supabase API Key 하드코딩 금지
DB migration 반드시 적용
persist_diagnosis_result RPC 필수
📂 프로젝트 구조
app/
  login/
  signup/
  dashboard/

components/
  auth/
  ui/

lib/
  diagnosis/
  supabase/
🧠 핵심 설계 원칙
초기 버전은 rule-based
AI는 이후 단계에서 추가
DB 구조 유지하면서 확장
user_id 기반 접근 제어 유지
RLS 정책 유지
DB enum과 앱 상태값 반드시 매핑
🚀 현재 개발 단계

Phase 1: 인증 + 데이터 수집 완료
Phase 2: 결과 계산 + 결과 UI 완료
👉 Next: Action Recommendation 시스템


