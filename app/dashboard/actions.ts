"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveBusinessTypeFromAnswers, resolveDiagnosisQuestions } from "@/lib/diagnosis/question-flow";
import { generateDiagnosisResult } from "@/lib/diagnosis/results";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_ACTION_LIMIT, FREE_DIAGNOSIS_LIMIT } from "@/lib/usage-limits";

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

function logDiagnosisSubmitError({
  step,
  payload,
  error
}: {
  step: string;
  payload: Record<string, unknown>;
  error: unknown;
}) {
  console.error("DIAGNOSIS SUBMIT ERROR", {
    step,
    payload,
    error
  });
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
  const { data: latestIncompleteSession, error: latestIncompleteSessionError } = await supabase
    .from("diagnosis_sessions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["draft", "in_progress"])
    .order("session_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestIncompleteSessionError) {
    throw new Error("Incomplete diagnosis session could not be checked.");
  }

  if (latestIncompleteSession) {
    redirect(`/dashboard?session=${latestIncompleteSession.id}`);
  }

  const { count: diagnosisCount, error: diagnosisCountError } = await supabase
    .from("diagnosis_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (diagnosisCountError) {
    throw new Error("Diagnosis usage could not be checked.");
  }

  if ((diagnosisCount ?? 0) >= FREE_DIAGNOSIS_LIMIT) {
    throw new Error("Free plan includes 1 diagnosis. Upgrade to start another diagnosis.");
  }

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
  let submitStep = "start";
  let submitPayload: Record<string, unknown> = { sessionId, questionId, questionType };

  try {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("답변을 입력해 주세요.");
  }

  submitStep = "load_session";
  submitPayload = { sessionId, userId: user.id };
  const { data: session, error: sessionError } = await supabase
    .from("diagnosis_sessions")
    .select("id, template_id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    throw new Error("진단 세션을 찾을 수 없습니다.");
  }

  submitStep = "build_answer_payload";
  submitPayload = { sessionId, questionId, questionType, value: normalizedValue };
  const answerPayload = buildAnswerPayload(questionType, normalizedValue);

  submitStep = "save_answer";
  const diagnosisAnswerPayload = {
      session_id: sessionId,
      user_id: user.id,
      question_id: questionId,
      ...answerPayload
    };
  submitPayload = diagnosisAnswerPayload;
  const { error: answerError } = await supabase.from("diagnosis_answers").upsert(
    diagnosisAnswerPayload,
    {
      onConflict: "session_id,question_id"
    }
  );

  if (answerError) {
    throw new Error("답변을 저장하지 못했습니다.");
  }

  submitStep = "load_template_questions";
  submitPayload = { sessionId, templateId: session.template_id };
  const { data: templateQuestions, error: totalQuestionsError } = await supabase
    .from("diagnosis_questions")
    .select("id, question_code, answer_schema")
    .eq("template_id", session.template_id)
    .eq("is_active", true);

  if (totalQuestionsError) {
    throw new Error("질문 수를 확인하지 못했습니다.");
  }

  submitStep = "load_saved_answers";
  submitPayload = { sessionId, userId: user.id };
  const { data: savedAnswers, error: savedAnswersError } = await supabase
    .from("diagnosis_answers")
    .select("question_id, answer_text")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (savedAnswersError) {
    throw new Error("답변 진행 상태를 확인하지 못했습니다.");
  }

  const businessType = resolveBusinessTypeFromAnswers(
    (templateQuestions ?? []).map((question) => ({
      id: question.id,
      questionCode: question.question_code,
      answerSchema:
        question.answer_schema && typeof question.answer_schema === "object" ? question.answer_schema : null
    })),
    new Map(
      (savedAnswers ?? []).map((answer) => [
        answer.question_id,
        {
          questionId: answer.question_id,
          answerText: answer.answer_text
        }
      ])
    )
  );
  const applicableQuestions = resolveDiagnosisQuestions(
    (templateQuestions ?? []).map((question) => ({
      id: question.id,
      questionCode: question.question_code,
      answerSchema:
        question.answer_schema && typeof question.answer_schema === "object" ? question.answer_schema : null
    })),
    businessType
  );
  const applicableQuestionIds = new Set(applicableQuestions.map((question) => question.id));
  const answeredApplicableQuestionCount = (savedAnswers ?? []).filter((answer) =>
    applicableQuestionIds.has(answer.question_id)
  ).length;
  const isCompleted =
    applicableQuestions.length > 0 && answeredApplicableQuestionCount === applicableQuestions.length;

  if (isCompleted) {
    submitStep = "complete_session";
    submitPayload = { sessionId, userId: user.id, status: "completed" };
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
    submitStep = "generate_result";
    submitPayload = { sessionId, userId: user.id };
    try {
      await generateDiagnosisResult(sessionId);
    } catch (error) {
      logDiagnosisSubmitError({
        step: submitStep,
        payload: submitPayload,
        error
      });
    }
  }

  revalidatePath("/dashboard");

  return {
    completed: isCompleted
  };
  } catch (error) {
    logDiagnosisSubmitError({
      step: submitStep,
      payload: submitPayload,
      error
    });

    revalidatePath("/dashboard");

    return {
      completed: submitStep === "complete_session" || submitStep === "generate_result",
      answerSaved: submitStep !== "save_answer",
      error: "diagnosis_submit_failed"
    };
  }
}

export async function updateResultAction({ actionId, status, note, evidenceUrl }: UpdateResultActionInput) {
  const { supabase, user } = await getAuthenticatedContext();
  const normalizedNote = note?.trim() ?? null;
  const normalizedEvidenceUrl = evidenceUrl?.trim() ?? null;
  const { data: existingAction, error: existingActionError } = await supabase
    .from("result_actions")
    .select("id, diagnosis_result_id, status, completed_at")
    .eq("id", actionId)
    .eq("user_id", user.id)
    .single();

  if (existingActionError || !existingAction) {
    throw new Error("실행 액션을 찾을 수 없습니다.");
  }

  if (existingAction.status === "todo" && status !== "todo") {
    const { count: activeActionCount, error: activeActionCountError } = await supabase
      .from("result_actions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "todo");

    if (activeActionCountError) {
      throw new Error("Action usage could not be checked.");
    }

    if ((activeActionCount ?? 0) >= FREE_ACTION_LIMIT) {
      throw new Error("Free plan includes 3 actions. Upgrade to execute more actions.");
    }
  }

  const payload: {
    status: "todo" | "doing" | "done";
    note: string | null;
    evidence_url: string | null;
    completed_at?: string | null;
  } = {
    status,
    note: normalizedNote,
    evidence_url: normalizedEvidenceUrl
  };

  if (status === "doing" && existingAction.status !== "doing") {
    payload.completed_at = null;
  }

  if (status === "done" && existingAction.status !== "done") {
    payload.completed_at = new Date().toISOString();
  }

  if (status === "todo") {
    payload.completed_at = null;
  }

  const { data: action, error: actionError } = await supabase
    .from("result_actions")
    .update(payload)
    .eq("id", actionId)
    .eq("user_id", user.id)
    .select("id, diagnosis_result_id")
    .single();

  if (actionError || !action) {
    throw new Error("실행 액션 상태를 업데이트하지 못했습니다.");
  }

  revalidatePath("/dashboard");

  return {
    actionId: action.id,
    resultId: action.diagnosis_result_id
  };
}
