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
  updated_at: string | null;
}

export interface ResultActionFeedbackSummary {
  total: number;
  todo: number;
  doing: number;
  done: number;
  completed_actions_count: number;
  last_completed_at: string | null;
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
  should_trigger_rediagnosis: boolean;
  trigger_reason: string | null;
}

function getPriorityRank(priority: string | null) {
  if (priority === "high") {
    return 0;
  }

  if (priority === "medium") {
    return 1;
  }

  if (priority === "low") {
    return 2;
  }

  return 3;
}

function getStatusRank(status: ResultActionStatus) {
  if (status === "doing") {
    return 0;
  }

  if (status === "todo") {
    return 1;
  }

  return 2;
}

function isActionOverdue(action: ResultActionView) {
  if (action.status === "done" || !action.due_date) {
    return false;
  }

  return action.due_date < new Date().toISOString().slice(0, 10);
}

function comparePrimaryAction(left: ResultActionView, right: ResultActionView) {
  const leftStatusRank = getStatusRank(left.status);
  const rightStatusRank = getStatusRank(right.status);

  if (leftStatusRank !== rightStatusRank) {
    return leftStatusRank - rightStatusRank;
  }

  const leftOverdueRank = isActionOverdue(left) ? 0 : 1;
  const rightOverdueRank = isActionOverdue(right) ? 0 : 1;

  if (leftOverdueRank !== rightOverdueRank) {
    return leftOverdueRank - rightOverdueRank;
  }

  const leftPriorityRank = getPriorityRank(left.priority);
  const rightPriorityRank = getPriorityRank(right.priority);

  if (leftPriorityRank !== rightPriorityRank) {
    return leftPriorityRank - rightPriorityRank;
  }

  if (left.due_date && right.due_date && left.due_date !== right.due_date) {
    return left.due_date.localeCompare(right.due_date);
  }

  if (left.due_date && !right.due_date) {
    return -1;
  }

  if (!left.due_date && right.due_date) {
    return 1;
  }

  return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
}

export function getPrimaryResultAction(actions: ResultActionView[]) {
  const pendingAction = actions
    .filter((action) => action.status !== "done")
    .sort(comparePrimaryAction)[0];

  if (pendingAction) {
    return pendingAction;
  }

  return actions
    .slice()
    .sort((left, right) => {
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    })[0] ?? null;
}

export function buildResultActionFeedback(action: ResultActionView | null) {
  if (!action || action.status !== "done") {
    return null;
  }

  return `You completed "${action.title}", which moves this diagnosis into real execution.`;
}

export function getLatestCompletedResultAction(actions: ResultActionView[]) {
  return actions
    .filter((action) => action.status === "done")
    .sort((left, right) => {
      const leftTimestamp = left.completed_at ? new Date(left.completed_at).getTime() : 0;
      const rightTimestamp = right.completed_at ? new Date(right.completed_at).getTime() : 0;

      return rightTimestamp - leftTimestamp;
    })[0] ?? null;
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

function buildRediagnosisTrigger({
  completedActionsCount,
  lastCompletedAt
}: {
  completedActionsCount: number;
  lastCompletedAt: string | null;
}) {
  if (completedActionsCount >= 3) {
    return {
      shouldTrigger: true,
      reason: "completed_actions_count"
    };
  }

  if (lastCompletedAt) {
    const elapsedDays = (Date.now() - new Date(lastCompletedAt).getTime()) / (1000 * 60 * 60 * 24);

    if (elapsedDays > 7) {
      return {
        shouldTrigger: true,
        reason: "last_completed_at_over_7_days"
      };
    }
  }

  return {
    shouldTrigger: false,
    reason: null
  };
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
    console.log("Result action generation skipped because no recommendations exist.", {
      resultId,
      recommendationCount: 0,
      resultActionsCreatedCount: 0
    });

    return { skipped: true as const, reason: "no_recommendations" };
  }

  const payload = recommendations.map((recommendation) => ({
    user_id: userId,
    diagnosis_result_id: resultId,
    action_recommendation_id: recommendation.id,
    title: recommendation.title,
    description: recommendation.description,
    status: "todo",
    priority: recommendation.priority,
    due_date: computeDueDate(recommendation.priority),
    note: null,
    evidence_url: null,
    completed_at: null
  }));

  const { error: upsertError } = await supabase.from("result_actions").upsert(payload, {
    onConflict: "diagnosis_result_id,action_recommendation_id",
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

  console.log("Result actions generated from recommendations.", {
    resultId,
    recommendationCount: recommendations.length,
    resultActionsCreatedCount: payload.length
  });

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
      "id, result_id:diagnosis_result_id, recommendation_id:action_recommendation_id, title, description, status, priority, due_date, note, evidence_url, completed_at, created_at, updated_at"
    )
    .eq("diagnosis_result_id", resultId)
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
        completed_actions_count: 0,
        last_completed_at: null,
        recent_completed_actions: [],
        should_show_rediagnosis_cta: false,
        should_trigger_rediagnosis: false,
        trigger_reason: null
      } satisfies ResultActionFeedbackSummary,
      skipped: true as const
    };
  }

  if (error) {
    console.warn("Result actions load failed", error);

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
        completed_actions_count: 0,
        last_completed_at: null,
        recent_completed_actions: [],
        should_show_rediagnosis_cta: false,
        should_trigger_rediagnosis: false,
        trigger_reason: null
      } satisfies ResultActionFeedbackSummary,
      skipped: true as const
    };
  }

  const normalizedActions = (actions ?? []).map((action) => ({
    ...action,
    cause_key: null,
    started_at: null
  })) as ResultActionView[];
  const todo = normalizedActions.filter((action) => action.status === "todo").length;
  const doing = normalizedActions.filter((action) => action.status === "doing").length;
  const done = normalizedActions.filter((action) => action.status === "done").length;
  const total = normalizedActions.length;
  const completedActions = normalizedActions.filter((action) => action.status === "done");
  const completedActionsCount = completedActions.length;
  const noteCount = normalizedActions.filter((action) => Boolean(action.note?.trim())).length;
  const evidenceCount = normalizedActions.filter((action) => Boolean(action.evidence_url?.trim())).length;
  const recordedActionCount = normalizedActions.filter(
    (action) => Boolean(action.note?.trim()) || Boolean(action.evidence_url?.trim())
  ).length;
  const recentCompletedActions = completedActions
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
  const lastCompletedAt = recentCompletedActions[0]?.completed_at ?? null;
  const rediagnosisTrigger = buildRediagnosisTrigger({
    completedActionsCount,
    lastCompletedAt
  });

  return {
    actions: normalizedActions,
    feedback: {
      total,
      todo,
      doing,
      done,
      completed_actions_count: completedActionsCount,
      last_completed_at: lastCompletedAt,
      completion_rate: completionRate,
      note_count: noteCount,
      evidence_count: evidenceCount,
      recorded_action_count: recordedActionCount,
      recent_completed_actions: recentCompletedActions,
      should_show_rediagnosis_cta: rediagnosisTrigger.shouldTrigger,
      should_trigger_rediagnosis: rediagnosisTrigger.shouldTrigger,
      trigger_reason: rediagnosisTrigger.reason
    } satisfies ResultActionFeedbackSummary,
    skipped: false as const
  };
}
