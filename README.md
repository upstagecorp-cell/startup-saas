# 🚀 Startup SaaS - Founder Diagnosis Platform

AI 기반 창업 진단 및 실행 가이드 SaaS 플랫폼

---

## 📌 프로젝트 개요

이 프로젝트는 예비 창업자 및 초기 창업자를 대상으로
현재 상태를 진단하고, 문제를 분석하며, 실행 가능한 액션을 제시하는 SaaS입니다.

---

## 🧱 기술 스택

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Supabase (Auth + Database)

---

## ✅ 현재 구현 상태

### 🔐 Authentication

* 회원가입 (Email / Password)
* 이메일 인증 (Email confirmation)
* 로그인
* 세션 유지
* 보호 라우팅 (/dashboard)

---

## 📁 프로젝트 구조

```
app/
  ├─ login/
  ├─ signup/
  ├─ dashboard/
  └─ (marketing)/

components/
  ├─ auth/
  ├─ layout/
  └─ ui/

lib/
  └─ supabase/
```

---

## ⚙️ 환경 변수 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

---

## 🚀 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 접속:

```
http://localhost:3000
```

---

## 🎯 앞으로 개발 계획

### 1. 사용자 진단 시스템

* 질문지 설계
* 응답 저장
* 상태 분석

### 2. 결과 리포트 생성

* 리스크 분석
* 성장 단계 판단
* 액션 추천

### 3. Dashboard 확장

* 진행 상태 표시
* 실행 로그
* 재진단 기능

---

## 💡 목표

단순한 정보 제공이 아니라
**창업자의 실행을 직접 도와주는 AI SaaS 플랫폼 구축**

---

## 👨‍💻 개발 상태

현재 MVP가 아닌
**즉시 사용 가능한 SaaS 수준으로 개발 진행 중**
