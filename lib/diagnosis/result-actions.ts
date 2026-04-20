import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type ResultActionStatus = "todo" | "doing" | "done";

export interface ResultActionView {
  id: string;
  result_id: string;
  recommendation_id: string | null;
  cause_key: string | null;
  title: string;
  description: string | null;
  status: ResultActionStatus;
  priority: string | null;
  due_date: string | null;
  note: string | null;
  evidence_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ResultActionFeedbackSummary {
  total: number;
  todo: number;
  doing: number;
  done: number;
  completion_rate: number;
  note_count: number;
  evidence_count: number;
  recorded_action_count: number;
  recent_completed_actions: Array<{
    id: string;
    title: string;
    completed_at: string | null;
    has_note: boolean;
    has_evidence: boolean;
  }>;
  should_show_rediagnosis_cta: boolean;
}

type RecommendationSource = {
  id: string;
  cause_key: string | null;
  title: string;
  description: string | null;
  priority: string | null;
};

function isMissingResultActionsSchemaError(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "42703" || error?.code === "PGRST204";
}

function computeDueDate(priority: string | null) {
  const date = new Date();

  if (priority === "high") {
    date.setDate(date.getDate() + 3);
  } else if (priority === "medium") {
    date.setDate(date.getDate() + 7);
  } else {
    date.setDate(date.getDate() + 14);
  }

  return date.toISOString().slice(0, 10);
}

export async function generateResultActionsFromRecommendations({
  supabase,
  resultId,
  userId
}: {
  supabase: SupabaseClient;
  resultId: string;
  userId: string;
}) {
  const { data: recommendations, error: recommendationError } = await supabase
    .from("action_recommendations")
    .select("id, source_ref, title, description, priority")
    .eq("result_id", resultId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (recommendationError) {
    throw new Error("Result actions could not load recommendations.");
  }

  if (!recommendations?.length) {
    return { skipped: true as const, reason: "no_recommendations" };
  }

  const payload = recommendations.map((recommendation) => ({
    user_id: userId,
    result_id: resultId,
    recommendation_id: recommendation.id,
    cause_key: recommendation.source_ref,
    title: recommendation.title,
    description: recommendation.description,
    status: "todo",
    priority: recommendation.priority,
    due_date: computeDueDate(recommendation.priority),
    note: null,
    evidence_url: null,
    started_at: null,
    completed_at: null
  }));

  const { error: upsertError } = await supabase.from("result_actions").upsert(payload, {
    onConflict: "result_id,recommendation_id",
    ignoreDuplicates: false
  });

  if (isMissingResultActionsSchemaError(upsertError)) {
    console.warn("Result action generation skipped because result_actions schema is unavailable.", {
      upsertError
    });

    return { skipped: true as const, reason: "result_actions_schema_unavailable" };
  }

  if (upsertError) {
    throw new Error("Result actions could not be saved.");
  }

  return {
    skipped: false as const,
    actionCount: payload.length
  };
}

export async function getResultActionsForResult({
  supabase,
  resultId,
  userId
}: {
  supabase: SupabaseClient;
  resultId: string;
  userId: string;
}) {
  const { data: actions, error } = await supabase
    .from("result_actions")
    .select(
      "id, result_id, recommendation_id, cause_key, title, description, status, priority, due_date, note, evidence_url, started_at, completed_at, created_at"
    )
    .eq("result_id", resultId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (isMissingResultActionsSchemaError(error)) {
    return {
      actions: [] as ResultActionView[],
      feedback: {
        total: 0,
        todo: 0,
        doing: 0,
        done: 0,
        completion_rate: 0,
        note_count: 0,
        evidence_count: 0,
        recorded_action_count: 0,
        recent_completed_actions: [],
        should_show_rediagnosis_cta: false
      } satisfies ResultActionFeedbackSummary,
      skipped: true as const
    };
  }

  if (error) {
    throw new Error("Result actions could not be loaded.");
  }

  const normalizedActions = (actions ?? []) as ResultActionView[];
  const todo = normalizedActions.filter((action) => action.status === "todo").length;
  const doing = normalizedActions.filter((action) => action.status === "doing").length;
  const done = normalizedActions.filter((action) => action.status === "done").length;
  const total = normalizedActions.length;
  const noteCount = normalizedActions.filter((action) => Boolean(action.note?.trim())).length;
  const evidenceCount = normalizedActions.filter((action) => Boolean(action.evidence_url?.trim())).length;
  const recordedActionCount = normalizedActions.filter(
    (action) => Boolean(action.note?.trim()) || Boolean(action.evidence_url?.trim())
  ).length;
  const recentCompletedActions = normalizedActions
    .filter((action) => action.status === "done")
    .sort((left, right) => {
      const leftTimestamp = left.completed_at ? new Date(left.completed_at).getTime() : 0;
      const rightTimestamp = right.completed_at ? new Date(right.completed_at).getTime() : 0;

      return rightTimestamp - leftTimestamp;
    })
    .slice(0, 3)
    .map((action) => ({
      id: action.id,
      title: action.title,
      completed_at: action.completed_at,
      has_note: Boolean(action.note?.trim()),
      has_evidence: Boolean(action.evidence_url?.trim())
    }));
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    actions: normalizedActions,
    feedback: {
      total,
      todo,
      doing,
      done,
      completion_rate: completionRate,
      note_count: noteCount,
      evidence_count: evidenceCount,
      recorded_action_count: recordedActionCount,
      recent_completed_actions: recentCompletedActions,
      should_show_rediagnosis_cta: done >= 1 || completionRate >= 30
    } satisfies ResultActionFeedbackSummary,
    skipped: false as const
  };
}
