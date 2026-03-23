import { Container } from "@/components/ui/container";

const pillars = [
  {
    title: "Structured diagnosis",
    description:
      "Guide founders through market, team, execution, and readiness checks with a consistent flow."
  },
  {
    title: "AI-powered reporting",
    description:
      "Turn responses into actionable summaries, risk signals, and next-step recommendations."
  },
  {
    title: "Launch-ready architecture",
    description:
      "Start simple now while leaving clean extension points for auth, billing, admin, and analytics."
  }
];

const sections = [
  "Founders can create diagnosis sessions and return later.",
  "Supabase auth and user profiles can be connected without reshaping the app tree.",
  "The layout is ready for future dashboard, admin, and marketing route groups."
];

export default function HomePage() {
  return (
    <div className="pb-20">
      <Container className="pt-20 sm:pt-28">
        <section className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              Next.js App Router starter for an AI diagnostic SaaS
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Build the foundation for a founder diagnosis platform with room to scale.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                This starter structure focuses on clear boundaries between app routes, shared
                components, domain utilities, and future authentication concerns.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a
                className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400"
                href="#foundation"
              >
                Explore foundation
              </a>
              <a
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                href="#next-steps"
              >
                Plan next steps
              </a>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">
                Initial structure
              </p>
              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">app/</p>
                  <p>Routes, layouts, and future marketing or dashboard groups.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">components/</p>
                  <p>Reusable UI and layout building blocks for fast feature delivery.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-medium text-white">lib/</p>
                  <p>Environment helpers and Supabase entry points for future auth setup.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Container>

      <Container id="foundation" className="mt-20">
        <section className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <h2 className="text-xl font-semibold text-white">{pillar.title}</h2>
              <p className="mt-3 leading-7 text-slate-300">{pillar.description}</p>
            </article>
          ))}
        </section>
      </Container>

      <Container id="next-steps" className="mt-20">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">
              Why this structure works
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              Ready for Supabase auth without forcing it into every file today.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {sections.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-7 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
