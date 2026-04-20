import Link from "next/link";

import { Container } from "@/components/ui/container";

const problems = [
  "무엇을 먼저 해야 할지 몰라 실행이 멈춰 있습니다.",
  "콘텐츠와 광고를 시도하지만 결과가 기록되지 않습니다.",
  "진단, 실행, 점검이 분리되어 다음 판단 근거가 쌓이지 않습니다."
];

const steps = [
  {
    title: "진단",
    description: "현재 사업 단계, 자본, 실행 역량을 짧은 질문으로 확인합니다."
  },
  {
    title: "실행 액션",
    description: "결과에 맞춰 지금 해야 할 우선순위와 액션을 제시합니다."
  },
  {
    title: "기록과 재진단",
    description: "실행 메모와 증거를 남기고 다음 진단에서 변화를 비교합니다."
  }
];

export default function HomePage() {
  return (
    <div className="pb-20">
      <Container className="pt-20 sm:pt-28">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              예비 창업자와 초기 창업자를 위한 실행 진단 플랫폼
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                지금 해야 할 창업 실행 순서를 5분 진단으로 확인하세요.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                방향 없이 도구를 늘리지 마세요. 진단 결과를 우선순위, 실행 액션, 기록 루프로 연결해
                다음 판단의 근거를 만듭니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400"
                href="/dashboard"
              >
                5분 진단 시작하기
              </Link>
              <a
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                href="#workflow"
              >
                작동 방식 보기
              </a>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">Result Preview</p>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">전체 점수와 위험 단계</p>
                  <p>현재 사업 상태를 한눈에 확인합니다.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">원인과 추천 액션</p>
                  <p>낮은 점수의 원인을 찾고 바로 실행할 일을 정리합니다.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">메모와 증거 기록</p>
                  <p>실행 결과를 남겨 재진단 비교에 반영합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Container>

      <Container id="workflow" className="mt-20">
        <section className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">{step.title}</h2>
              <p className="mt-3 leading-7 text-slate-300">{step.description}</p>
            </article>
          ))}
        </section>
      </Container>

      <Container className="mt-20">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">Why Now</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              창업 실패 비용은 실행 순서를 잘못 잡을 때 커집니다.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {problems.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-7 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
          <Link
            className="mt-8 inline-flex rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400"
            href="/dashboard"
          >
            내 사업 상태 진단하기
          </Link>
        </section>
      </Container>
    </div>
  );
}
