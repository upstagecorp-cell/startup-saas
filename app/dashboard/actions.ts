"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateDiagnosisResult } from "@/lib/diagnosis/results";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupportedQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "short_text"
  | "long_text"
  | "number"
  | "boolean"
  | "scale";

interface SubmitDiagnosisAnswerInput {
  sessionId: string;
  questionId: string;
  questionType: SupportedQuestionType;
  value: string;
}

interface UpdateResultActionInput {
  actionId: string;
  status: "todo" | "doing" | "done";
  note?: string;
  evidenceUrl?: string;
}

async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase 환경 변수를 확인해 주세요.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createDiagnosisSession() {
  const { supabase, user } = await getAuthenticatedContext();

  const { data: template, error: templateError } = await supabase
    .from("diagnosis_templates")
    .select("id")
    .eq("code", "founder_diagnosis")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (templateError || !template) {
    throw new Error("진단 템플릿을 불러오지 못했습니다.");
  }

  const { data: latestSession, error: latestSessionError } = await supabase
    .from("diagnosis_sessions")
    .select("session_number")
    .eq("user_id", user.id)
    .order("session_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSessionError) {
    throw new Error("기존 진단 세션을 확인하지 못했습니다.");
  }

  const nextSessionNumber = (latestSession?.session_number ?? 0) + 1;

  const { data: session, error: sessionError } = await supabase
    .from("diagnosis_sessions")
    .insert({
      user_id: user.id,
      template_id: template.id,
      session_number: nextSessionNumber,
      status: "in_progress"
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error("진단 세션을 생성하지 못했습니다.");
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?session=${session.id}`);
}

function buildAnswerPayload(questionType: SupportedQuestionType, value: string) {
  if (questionType === "boolean") {
    return {
      answer_text: null,
      answer_number: null,
      answer_boolean: value === "true",
      answer_json: {}
    };
  }

  if (questionType === "number" || questionType === "scale") {
    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
      throw new Error("숫자 답변 형식이 올바르지 않습니다.");
    }

    return {
      answer_text: null,
      answer_number: parsedValue,
      answer_boolean: null,
      answer_json: {}
    };
  }

  return {
    answer_text: value,
    answer_number: null,
    answer_boolean: null,
    answer_json: {}
  };
}

export async function submitDiagnosisAnswer({
  sessionId,
  questionId,
  questionType,
  value
}: SubmitDiagnosisAnswerInput) {
  const { supabase, user } = await getAuthenticatedContext();

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("답변을 입력해 주세요.");
  }

  const { data: session, error: sessionError } = await supabase
    .from("diagnosis_sessions")
    .select("id, template_id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    throw new Error("진단 세션을 찾을 수 없습니다.");
  }

  const answerPayload = buildAnswerPayload(questionType, normalizedValue);

  const { error: answerError } = await supabase.from("diagnosis_answers").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      question_id: questionId,
      ...answerPayload
    },
    {
      onConflict: "session_id,question_id"
    }
  );

  if (answerError) {
    throw new Error("답변을 저장하지 못했습니다.");
  }

  const { count: totalQuestions, error: totalQuestionsError } = await supabase
    .from("diagnosis_questions")
    .select("*", { count: "exact", head: true })
    .eq("template_id", session.template_id)
    .eq("is_active", true);

  if (totalQuestionsError) {
    throw new Error("질문 수를 확인하지 못했습니다.");
  }

  const { count: savedAnswers, error: savedAnswersError } = await supabase
    .from("diagnosis_answers")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (savedAnswersError) {
    throw new Error("답변 진행 상태를 확인하지 못했습니다.");
  }

  const isCompleted = Boolean(totalQuestions) && savedAnswers === totalQuestions;

  if (isCompleted) {
    const { error: completeError } = await supabase
      .from("diagnosis_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (completeError) {
      throw new Error("진단 완료 상태를 저장하지 못했습니다.");
    }
  }

  if (isCompleted) {
    await generateDiagnosisResult(sessionId);
  }

  revalidatePath("/dashboard");

  return {
    completed: isCompleted
  };
}

export async function updateResultAction({ actionId, status, note, evidenceUrl }: UpdateResultActionInput) {
  const { supabase, user } = await getAuthenticatedContext();
  const normalizedNote = note?.trim() ?? null;
  const normalizedEvidenceUrl = evidenceUrl?.trim() ?? null;
  const { data: existingAction, error: existingActionError } = await supabase
    .from("result_actions")
    .select("id, result_id, status, started_at, completed_at")
    .eq("id", actionId)
    .eq("user_id", user.id)
    .single();

  if (existingActionError || !existingAction) {
    throw new Error("실행 액션을 찾을 수 없습니다.");
  }

  const payload: {
    status: "todo" | "doing" | "done";
    note: string | null;
    evidence_url: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  } = {
    status,
    note: normalizedNote,
    evidence_url: normalizedEvidenceUrl
  };

  if (status === "doing" && existingAction.status !== "doing") {
    payload.started_at = existingAction.started_at ?? new Date().toISOString();
    payload.completed_at = null;
  }

  if (status === "done" && existingAction.status !== "done") {
    payload.started_at = existingAction.started_at ?? new Date().toISOString();
    payload.completed_at = new Date().toISOString();
  }

  if (status === "todo") {
    payload.started_at = null;
    payload.completed_at = null;
  }

  const { data: action, error: actionError } = await supabase
    .from("result_actions")
    .update(payload)
    .eq("id", actionId)
    .eq("user_id", user.id)
    .select("id, result_id")
    .single();

  if (actionError || !action) {
    throw new Error("실행 액션 상태를 업데이트하지 못했습니다.");
  }

  revalidatePath("/dashboard");

  return {
    actionId: action.id,
    resultId: action.result_id
  };
}
