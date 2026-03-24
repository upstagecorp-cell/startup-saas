import type { DiagnosisResultView } from "@/lib/diagnosis/results";

interface DiagnosisResultProps {
  diagnosisResult: DiagnosisResultView;
}

function formatScore(score: number | null) {
  if (score === null) {
    return "-";
  }

  return `${Math.round(score)}`;
}

function formatLabel(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value.replace(/_/g, " ");
}

export function DiagnosisResult({ diagnosisResult }: DiagnosisResultProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-emerald-400/20 bg-emerald-500/10 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Diagnosis Result</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Your diagnosis result is ready.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overall Score</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatScore(diagnosisResult.result.overall_score)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk Level</p>
            <p className="mt-3 text-2xl font-semibold capitalize text-white">
              {formatLabel(diagnosisResult.result.risk_level)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Next Step</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              {diagnosisResult.result.recommended_next_step ?? "No recommendation available yet."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">Dimensions</p>
        <div className="mt-6 space-y-4">
          {diagnosisResult.dimensions.map((dimension) => (
            <div key={dimension.dimension_key} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{dimension.dimension_name}</h3>
                  <p className="mt-2 text-sm capitalize text-slate-400">{formatLabel(dimension.status)}</p>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white">
                  Score {formatScore(dimension.score)}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {dimension.summary ?? "No summary available for this dimension."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
