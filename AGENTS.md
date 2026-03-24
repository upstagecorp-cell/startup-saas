# 🤖 AGENTS.md

## 🎯 프로젝트 목적
이 프로젝트는 예비 창업자 및 초기 창업자를 위한  
AI 기반 창업 진단 및 실행 SaaS 플랫폼이다.

핵심 흐름:

진단 → 원인 분석 → 실행 액션 → 재진단

---

## ⚙️ 현재 시스템 상태

### 기술 스택
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + RLS + RPC)

---

### 현재 구현 완료

#### 인증
- 회원가입 / 로그인
- 이메일 인증
- 세션 유지
- 보호 라우팅 (/dashboard)

#### DB
- 전체 schema 설계 완료
- RLS 정책 적용 완료
- seed 데이터 입력 완료
- profiles 자동 생성 trigger 완료

#### 진단 기능
- diagnosis_sessions 생성
- 질문 순차 진행
- diagnosis_answers 저장
- session 완료 처리

#### 결과 엔진
- rule-based 점수 계산 구현 완료
- question_type별 scoring 처리
- section score 계산
- overall score 계산
- 결과 상태 계산

#### 결과 저장
- diagnosis_results 생성
- diagnosis_result_dimensions 생성
- RPC (`persist_diagnosis_result`) 기반 저장

#### 결과 UI
- dashboard에서 결과 조회 및 표시 완료

---

## 🔥 절대 깨면 안 되는 핵심 흐름


diagnosis_sessions 생성
→ diagnosis_answers 저장
→ session 완료 처리
→ generateDiagnosisResult(sessionId)
→ diagnosis_results 저장
→ diagnosis_result_dimensions 저장
→ dashboard 결과 표시


이 흐름은 절대 변경하거나 깨지면 안 된다.

---

## 📊 결과 계산 규칙

- 모든 정량형 질문은 0~100 점수화
- short_text / long_text는 scoring 제외
- question weight 적용
- section score = 가중 평균
- overall score = section 가중 평균

---

## ⚠️ question_type 처리 규칙

반드시 type별로 분기 처리:

- scale
- boolean
- single_choice
- multiple_choice
- number
- short_text (scoring 제외)
- long_text (scoring 제외)

🚨 자유입력은 절대 scoring 하면 안 된다

---

## ⚠️ status / enum 규칙 (중요)

### 앱 내부 상태
- healthy
- warning
- critical

### DB enum (dimension_status)
- strong
- moderate
- weak
- critical

### 매핑 규칙
- healthy → strong
- warning → moderate
- critical → critical

🚨 규칙:
- DB enum과 text 직접 혼용 금지
- 반드시 매핑 후 저장

---

## 🧱 DB / RPC 규칙

### persist_diagnosis_result

- diagnosis 결과 저장은 반드시 이 RPC 사용
- diagnosis_answers.score 업데이트 포함
- diagnosis_results / dimensions 동시 처리

---

### JSONB → DB 변환

- jsonb_to_recordset 사용 시 타입 정확히 선언
- enum 컬럼은 반드시 enum 타입으로 처리

예:
```sql
status dimension_status

또는:

payload.status::dimension_status
🚨 중요 방어 로직
score null인 dimension은 insert 금지
scorable=false 질문은 계산 제외
잘못된 schema는 throw 대신 skip 처리
빈 dimensionRows insert 금지
🧩 코드 구조 규칙
결과 계산 로직: lib/diagnosis
Supabase 접근: lib/supabase
UI는 DB 직접 접근 금지 (server action 경유)
❌ 금지 사항
.env.local Git 포함 금지
Supabase key 하드코딩 금지
기존 Auth 구조 변경 금지
RLS 우회 금지
🚀 다음 개발 우선순위
action recommendation 시스템
diagnosis_result_issues 생성
diagnosis_result_insights 생성
재진단 비교 기능
🧠 Codex 작업 원칙
코드 작성 전에 현재 코드베이스 먼저 분석
README.md / PROJECT_CONTEXT.md 먼저 확인
기존 DB 구조 유지
최소 수정 원칙 유지
실행 가능한 코드만 작성
diff가 아니라 완성 코드 제공
RPC / DB / TS 로직 항상 함께 고려
에러 발생 시 반드시 원인 로그 먼저 노출
📌 현재 작업 목표

👉 Action Recommendation 시스템 구현

dimension status 기반 추천
DB 저장
결과 화면 연결

