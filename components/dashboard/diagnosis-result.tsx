import type { DiagnosisResultView } from "@/lib/diagnosis/results";
import { ResultActionsPanel } from "@/components/dashboard/result-actions-panel";
import { createDiagnosisSession } from "@/app/dashboard/actions";

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
    return "미정";
  }

  const labels: Record<string, string> = {
    healthy: "양호",
    warning: "주의",
    critical: "위험",
    strong: "강함",
    moderate: "보통",
    weak: "약함",
    high: "높음",
    medium: "보통",
    low: "낮음",
    todo: "대기",
    doing: "진행 중",
    done: "완료"
  };

  return labels[value] ?? value.replace(/_/g, " ");
}

function formatDiff(diff: number | null) {
  if (diff === null) {
    return "-";
  }

  const roundedDiff = Math.round(diff * 100) / 100;

  if (roundedDiff > 0) {
    return `+${roundedDiff}`;
  }

  return `${roundedDiff}`;
}

export function DiagnosisResult({ diagnosisResult }: DiagnosisResultProps) {
  const issuesByDimensionKey = new Map(
    diagnosisResult.dimensions.map((dimension) => [
      dimension.dimension_key,
      diagnosisResult.issues.filter((issue) => issue.dimension_key === dimension.dimension_key)
    ])
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-emerald-400/20 bg-emerald-500/10 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Diagnosis Result</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">진단 결과가 준비되었습니다.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">전체 점수</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatScore(diagnosisResult.result.overall_score)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">위험 단계</p>
            <p className="mt-3 text-2xl font-semibold capitalize text-white">
              {formatLabel(diagnosisResult.result.risk_level)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">다음 실행</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              {diagnosisResult.result.recommended_next_step ?? "아직 추천 실행이 없습니다."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">Feedback Loop</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">실행 이후 무엇이 달라졌는지 확인하세요.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              진단 결과가 실제 실행, 기록, 증거로 이어졌는지 확인하고 재진단이 필요한 시점을 판단합니다.
            </p>
          </div>
          {diagnosisResult.feedback.should_show_rediagnosis_cta ? (
            <form action={createDiagnosisSession}>
              <button
                className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400"
                type="submit"
              >
                재진단 시작
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">전체 액션</p>
            <p className="mt-3 text-3xl font-semibold text-white">{diagnosisResult.feedback.total}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">완료</p>
            <p className="mt-3 text-3xl font-semibold text-white">{diagnosisResult.feedback.done}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">진행 중</p>
            <p className="mt-3 text-3xl font-semibold text-white">{diagnosisResult.feedback.doing}</p>
          </div>
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">완료율</p>
            <p className="mt-3 text-3xl font-semibold text-white">{diagnosisResult.feedback.completion_rate}%</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">최근 완료한 액션</p>
            <div className="mt-4 space-y-3">
              {diagnosisResult.feedback.recent_completed_actions.length ? (
                diagnosisResult.feedback.recent_completed_actions.map((action) => (
                  <div key={action.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">{action.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {action.completed_at ? `${new Date(action.completed_at).toLocaleDateString()} 완료` : "완료"}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      기록: {action.has_note ? "메모 있음" : "메모 없음"} / {action.has_evidence ? "증거 링크 있음" : "증거 없음"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                  아직 완료한 액션이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">기록 현황</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">기록이 있는 액션</p>
                <p className="mt-2 text-2xl font-semibold text-white">{diagnosisResult.feedback.recorded_action_count}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-300">저장된 메모</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{diagnosisResult.feedback.note_count}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-300">증거 링크</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{diagnosisResult.feedback.evidence_count}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                {diagnosisResult.feedback.should_show_rediagnosis_cta
                  ? "재진단을 진행할 만큼 실행 기록이 쌓였습니다."
                  : "액션을 1개 이상 완료하거나 완료율 30%에 도달하면 재진단을 시작할 수 있습니다."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {diagnosisResult.comparison ? (
        <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-200">Re-diagnosis Change</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">이전 진단 이후의 변화</h3>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              완료 {diagnosisResult.feedback.done}개 / 완료율 {diagnosisResult.feedback.completion_rate}%
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">현재 점수</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatScore(diagnosisResult.comparison.current_overall_score)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">이전 점수</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatScore(diagnosisResult.comparison.previous_overall_score)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">점수 변화</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatDiff(diagnosisResult.comparison.overall_score_diff)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">상태 변화</p>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.15em] text-white">
                {formatLabel(diagnosisResult.comparison.previous_overall_status)} →{" "}
                {formatLabel(diagnosisResult.comparison.current_overall_status)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">개선</p>
              <div className="mt-4 space-y-2">
                {diagnosisResult.comparison.improved_dimensions.length ? (
                  diagnosisResult.comparison.improved_dimensions.map((dimension) => (
                    <div key={dimension.dimension_key} className="rounded-2xl bg-slate-950/50 p-3 text-sm text-white">
                      {dimension.dimension_name} ({formatDiff(dimension.score_diff)})
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-950/50 p-3 text-sm text-slate-200">개선된 영역이 없습니다.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">유지</p>
              <div className="mt-4 space-y-2">
                {diagnosisResult.comparison.unchanged_dimensions.length ? (
                  diagnosisResult.comparison.unchanged_dimensions.map((dimension) => (
                    <div key={dimension.dimension_key} className="rounded-2xl bg-white/5 p-3 text-sm text-white">
                      {dimension.dimension_name}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white/5 p-3 text-sm text-slate-200">유지된 영역이 없습니다.</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-200">하락</p>
              <div className="mt-4 space-y-2">
                {diagnosisResult.comparison.declined_dimensions.length ? (
                  diagnosisResult.comparison.declined_dimensions.map((dimension) => (
                    <div key={dimension.dimension_key} className="rounded-2xl bg-slate-950/50 p-3 text-sm text-white">
                      {dimension.dimension_name} ({formatDiff(dimension.score_diff)})
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-950/50 p-3 text-sm text-slate-200">하락한 영역이 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">진단 영역</p>
        <div className="mt-6 space-y-4">
          {diagnosisResult.dimensions.map((dimension) => (
            <div key={dimension.dimension_key} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{dimension.dimension_name}</h3>
                  <p className="mt-2 text-sm capitalize text-slate-400">{formatLabel(dimension.status)}</p>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white">
                  점수 {formatScore(dimension.score)}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {dimension.summary ?? "이 영역의 요약이 아직 없습니다."}
              </p>
              {(issuesByDimensionKey.get(dimension.dimension_key) ?? []).length ? (
                <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-rose-200">문제 원인</p>
                  {(issuesByDimensionKey.get(dimension.dimension_key) ?? []).map((issue) => (
                    <div key={issue.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{issue.title}</h4>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-xs uppercase text-slate-300">
                          {formatLabel(issue.severity)}
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-xs uppercase text-slate-300">
                          {formatLabel(issue.priority)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {issue.description ?? "상세 문제 설명이 아직 없습니다."}
                      </p>
                      {issue.causes.length ? (
                        <div className="mt-3 space-y-2">
                          {issue.causes.map((cause) => (
                            <div key={`${issue.id}-${cause.cause_key}`} className="rounded-2xl bg-slate-900/70 p-3">
                              <p className="text-sm font-medium text-white">{cause.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-400">
                                {cause.description ?? "원인 설명이 아직 없습니다."}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">추천 실행 액션</p>
        <div className="mt-6 space-y-4">
          {diagnosisResult.recommendations.length ? (
            diagnosisResult.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-white">{recommendation.title}</h3>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-slate-300">
                    {formatLabel(recommendation.priority)}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-slate-300">
                    {formatLabel(recommendation.effort_level)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {recommendation.description ?? "추천 액션 설명이 아직 없습니다."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">추천 이유</p>
                    <p className="mt-2 text-sm leading-6 text-white">
                      {recommendation.rationale ?? "추천 이유가 아직 없습니다."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">기대 효과</p>
                    <p className="mt-2 text-sm leading-6 text-white">
                      {recommendation.expected_impact ?? "기대 효과 설명이 아직 없습니다."}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-sm leading-7 text-slate-300">
              아직 추천 액션이 없습니다.
            </div>
          )}
        </div>
      </div>

      <ResultActionsPanel actions={diagnosisResult.actions} feedback={diagnosisResult.feedback} />
    </div>
  );
}
