"use client";

import { useState, useTransition } from "react";

import { updateResultAction } from "@/app/dashboard/actions";
import type { ResultActionView } from "@/lib/diagnosis/result-actions";

interface PrimaryExecutionActionProps {
  action: ResultActionView;
  actionLimitReached: boolean;
  feedback: string | null;
}

function buildStatusLabel(status: ResultActionView["status"]) {
  if (status === "done") {
    return "Completed";
  }

  if (status === "doing") {
    return "In Progress";
  }

  return "Pending";
}

function buildPriorityLabel(priority: string | null) {
  if (priority === "high") {
    return "High Priority";
  }

  if (priority === "medium") {
    return "Medium Priority";
  }

  if (priority === "low") {
    return "Low Priority";
  }

  return "Priority Not Set";
}

function isActionOverdue(action: ResultActionView) {
  if (action.status === "done" || !action.due_date) {
    return false;
  }

  return action.due_date < new Date().toISOString().slice(0, 10);
}

export function PrimaryExecutionAction({ action, actionLimitReached, feedback }: PrimaryExecutionActionProps) {
  const [note, setNote] = useState(action.note ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(action.evidence_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isCompleted = action.status === "done";
  const isOverdue = isActionOverdue(action);
  const isActionBlocked = actionLimitReached && action.status === "todo";

  function handleCompleteAction() {
    setError(null);

    startTransition(async () => {
      try {
        await updateResultAction({
          actionId: action.id,
          status: "done",
          note,
          evidenceUrl
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Primary action update failed.");
      }
    });
  }

  return (
    <div className="rounded-[32px] border border-brand-400/20 bg-brand-500/10 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-200">Primary Action</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{action.title}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
            {action.description ?? "Complete this action to move from diagnosis into execution."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <div className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white">
            {buildStatusLabel(action.status)}
          </div>
          <div className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white">
            {buildPriorityLabel(action.priority)}
          </div>
          <div
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              isOverdue ? "border-rose-400/30 bg-rose-500/10 text-rose-100" : "border-white/10 text-white"
            }`}
          >
            {isOverdue ? "Overdue" : "Due"} {action.due_date ?? "Not Set"}
          </div>
        </div>
      </div>

      {isOverdue ? (
        <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This primary action is past its due date. Complete it first or update the execution note with the current
          blocker.
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          {feedback}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {isActionBlocked ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-50">
          Free users can execute 3 actions. Upgrade to continue the action loop.
        </div>
      ) : null}

      {!isCompleted ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Execution Note</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
                onChange={(event) => setNote(event.target.value)}
                value={note}
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Evidence Link</span>
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
                onChange={(event) => setEvidenceUrl(event.target.value)}
                type="url"
                value={evidenceUrl}
              />
              <p className="mt-2 text-xs text-slate-500">Add the proof link only if you have one right now.</p>
            </label>
          </div>

          <div className="mt-6">
            <button
              className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-60"
              disabled={isPending || isActionBlocked}
              onClick={handleCompleteAction}
              type="button"
            >
              {isPending ? "Completing..." : "Complete Task"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
