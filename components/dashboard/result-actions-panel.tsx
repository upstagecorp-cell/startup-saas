"use client";

import { useState, useTransition } from "react";

import { updateResultAction } from "@/app/dashboard/actions";
import type { ResultActionFeedbackSummary, ResultActionView } from "@/lib/diagnosis/result-actions";

interface ResultActionsPanelProps {
  actionLimit: number;
  actionLimitReached: boolean;
  actions: ResultActionView[];
  feedback: ResultActionFeedbackSummary;
}

function formatLabel(value: string | null) {
  if (!value) {
    return "미정";
  }

  const labels: Record<string, string> = {
    todo: "대기",
    doing: "진행 중",
    done: "완료",
    high: "높음",
    medium: "보통",
    low: "낮음"
  };

  return labels[value] ?? value.replace(/_/g, " ");
}

export function ResultActionsPanel({ actionLimit, actionLimitReached, actions, feedback }: ResultActionsPanelProps) {
  const [notesByActionId, setNotesByActionId] = useState<Record<string, string>>(() =>
    Object.fromEntries(actions.map((action) => [action.id, action.note ?? ""]))
  );
  const [evidenceByActionId, setEvidenceByActionId] = useState<Record<string, string>>(() =>
    Object.fromEntries(actions.map((action) => [action.id, action.evidence_url ?? ""]))
  );
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitAction(actionId: string, status: "todo" | "doing" | "done") {
    setError(null);
    setPendingActionId(actionId);

    startTransition(async () => {
      try {
        await updateResultAction({
          actionId,
          status,
          note: notesByActionId[actionId] ?? "",
          evidenceUrl: evidenceByActionId[actionId] ?? ""
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "실행 액션 업데이트에 실패했습니다.");
      } finally {
        setPendingActionId(null);
      }
    });
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">이번 주 실행 목록</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">먼저 실행하고, 결과를 기록한 뒤 다시 점검하세요.</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">전체</p>
            <p className="mt-2 text-xl font-semibold text-white">{feedback.total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">진행 중</p>
            <p className="mt-2 text-xl font-semibold text-white">{feedback.doing}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">완료</p>
            <p className="mt-2 text-xl font-semibold text-white">{feedback.done}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">완료율</p>
            <p className="mt-2 text-xl font-semibold text-white">{feedback.completion_rate}%</p>
          </div>
        </div>
      </div>

      {error ? <p className="mt-5 text-sm text-rose-300">{error}</p> : null}

      {actionLimitReached ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold text-amber-100">Upgrade required</p>
          <p className="mt-2 text-sm leading-6 text-amber-50">
            Free users can execute {actionLimit} actions. Upgrade to continue with additional actions.
          </p>
          <button
            className="mt-4 rounded-full bg-amber-400 px-5 py-3 text-sm font-medium text-slate-950"
            type="button"
          >
            Upgrade
          </button>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {actions.length ? (
          actions.map((action) => {
            const isCurrentActionPending = isPending && pendingActionId === action.id;
            const isActionBlocked = actionLimitReached && action.status === "todo";

            return (
              <div key={action.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-semibold text-white">{action.title}</h4>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-slate-300">
                        {formatLabel(action.status)}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-slate-300">
                        {formatLabel(action.priority)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {action.description ?? "실행 액션 설명이 아직 없습니다."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    기한 {action.due_date ?? "미정"}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">실행 메모</span>
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
                      onChange={(event) =>
                        setNotesByActionId((currentState) => ({
                          ...currentState,
                          [action.id]: event.target.value
                        }))
                      }
                      value={notesByActionId[action.id] ?? ""}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">증거 링크</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
                      onChange={(event) =>
                        setEvidenceByActionId((currentState) => ({
                          ...currentState,
                          [action.id]: event.target.value
                        }))
                      }
                      type="url"
                      value={evidenceByActionId[action.id] ?? ""}
                    />
                    <p className="mt-2 text-xs text-slate-500">실행 후 문서, 화면, 결과 링크를 남겨 주세요.</p>
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {action.status === "todo" ? (
                    <button
                      className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400 disabled:opacity-60"
                      disabled={isCurrentActionPending || isActionBlocked}
                      onClick={() => submitAction(action.id, "doing")}
                      type="button"
                    >
                      {isCurrentActionPending ? "업데이트 중..." : "시작"}
                    </button>
                  ) : null}

                  {action.status === "doing" ? (
                    <button
                      className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-60"
                      disabled={isCurrentActionPending}
                      onClick={() => submitAction(action.id, "done")}
                      type="button"
                    >
                      {isCurrentActionPending ? "업데이트 중..." : "완료"}
                    </button>
                  ) : null}

                  {action.status === "done" ? (
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-100">
                      완료됨
                    </div>
                  ) : null}

                  <button
                    className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-60"
                    disabled={isCurrentActionPending}
                    onClick={() => submitAction(action.id, action.status)}
                    type="button"
                  >
                    기록 저장
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-sm leading-7 text-slate-300">
            아직 실행 가능한 액션이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
