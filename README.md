# Startup SaaS

AI 기반 창업 진단 및 실행 SaaS MVP입니다.

핵심 제품 흐름은 다음과 같습니다.

```text
진단 세션 생성
-> 답변 저장
-> 세션 완료 처리
-> rule-based 결과 계산
-> 결과/영역/문제/원인/추천 저장
-> result_actions 생성
-> 실행 상태/메모/evidence 기록
-> 재진단 비교
```

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, RLS, RPC

## 현재 구현됨

### 인증

- 회원가입
- 로그인
- 이메일 인증 기반 Supabase Auth
- 세션 유지
- `/dashboard` 보호 라우팅

### 진단

- `diagnosis_sessions` 생성
- 활성 `founder_diagnosis` 템플릿 로드
- 질문 순차 진행 UI
- `diagnosis_answers` 저장
- 전체 질문 답변 완료 시 세션 `completed` 처리

### 결과 계산

- `lib/diagnosis/scoring.ts` 기반 rule-based scoring
- 지원 question type:
  - `scale`
  - `boolean`
  - `single_choice`
  - `multiple_choice`
  - `number`
  - `short_text` scoring 제외
  - `long_text` scoring 제외
- 질문 weight 반영
- section score 계산
- overall score 계산
- overall status 계산

### 결과 저장

- `persist_diagnosis_result` RPC 사용
- `diagnosis_answers.score` 업데이트
- `diagnosis_results` 저장
- `diagnosis_result_dimensions` 저장
- score/status가 없는 dimension row는 저장하지 않음

### 문제/원인/추천

- rule definition 기반 artifact 생성
- `diagnosis_result_issues` 저장
- `diagnosis_result_issue_causes` 저장
- `action_recommendations` 저장
- artifact schema 또는 seed가 없을 때도 core result flow는 fail-open으로 동작

### 현재 실행 레이어

현재 MVP의 활성 실행 레이어는 `result_actions`입니다.

- `action_recommendations`에서 `result_actions` 생성
- 액션 상태:
  - `todo`
  - `doing`
  - `done`
- 사용자 기록:
  - `note`
  - `evidence_url`
  - `started_at`
  - `completed_at`
- 대시보드에서 완료율, 기록 수, 최근 완료 액션 표시
- 액션 완료 또는 완료율 조건에 따라 재진단 CTA 표시

중요: `action_plans`, `action_tasks`, `action_execution_logs` 테이블은 초기 schema에 존재하지만 현재 MVP 실행 흐름에서는 사용하지 않습니다.

### 재진단 비교

- 최근 결과 조회
- 이전 결과와 current result 비교
- overall score diff 계산
- dimension별 개선/유지/하락 구분

### UI

- `/` 랜딩
- `/login`
- `/signup`
- `/dashboard`
- 진단 진행 화면
- 결과 화면
- 문제/원인/추천 액션 화면
- result action 기록 화면

## 아직 구현되지 않음

- Stripe 결제
- `purchases` 테이블
- paid gate
- 관리자 `/admin`
- `coach_notes`
- 관리자 플랜/액션 수정 화면
- `action_plans` 기반 실행 플랜 UI
- `action_tasks` 기반 task execution flow
- 템플릿 자산화:
  - `template_url`
  - `expected_output`
  - `completion_criteria`
- PostHog/GA 퍼널 이벤트 추적
- AI 기반 개인화 추천

## 라우팅 제약

`app/page.tsx`가 유일한 root route(`/`)입니다.

route group 안에 `app/(marketing)/page.tsx`처럼 또 다른 root page를 만들면 `/` 라우트가 중복되어 production build의 prerender 단계가 실패할 수 있습니다.

## 빌드 상태

현재 production build는 통과합니다.

검증 명령:

```bash
npm.cmd run typecheck
npm.cmd run check:encoding
npm.cmd run build
```

PowerShell에서 `npm` 실행 정책 문제가 있으면 `npm.cmd`를 사용합니다.

## 개발 명령

```bash
npm install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run check:encoding
npm.cmd run build
```

필수 환경 변수:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 핵심 파일

- 진단 서버 액션: `app/dashboard/actions.ts`
- 대시보드: `app/dashboard/page.tsx`
- 진단 UI: `components/dashboard/diagnosis-flow.tsx`
- 결과 UI: `components/dashboard/diagnosis-result.tsx`
- 실행 액션 UI: `components/dashboard/result-actions-panel.tsx`
- scoring: `lib/diagnosis/scoring.ts`
- result orchestration: `lib/diagnosis/results.ts`
- artifact generation: `lib/diagnosis/artifacts.ts`
- result action generation/loading: `lib/diagnosis/result-actions.ts`
- Supabase clients: `lib/supabase/*`

## 개발 원칙

- 기존 핵심 흐름을 깨지 않는다.
- 결과 저장은 `persist_diagnosis_result` RPC를 사용한다.
- 자유입력(`short_text`, `long_text`)은 scoring하지 않는다.
- 앱 내부 status와 DB status를 직접 혼용하지 않는다.
- UI는 DB에 직접 쓰지 않고 server action 또는 서버 레이어를 경유한다.
- 현재 실행 레이어는 `result_actions`로 유지한다.
- `action_plans/action_tasks`는 실제 사용 전까지 active flow로 문서화하지 않는다.
