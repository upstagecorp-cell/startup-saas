import type { PostgrestError } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  buildRecommendedNextStep,
  buildSectionSummary,
  calculateOverallScore,
  calculateOverallStatus,
  calculateQuestionScore,
  calculateSectionScore,
  type DiagnosisAnswerRecord,
  type DiagnosisQuestionRecord,
  type DiagnosisSectionRecord,
  type SectionScoreResult
} from "@/lib/diagnosis/scoring";

type SessionRecord = {
  id: string;
  user_id: string;
  template_id: string;
  status: string;
};

type PersistAnswerScoreRow = {
  question_id: string;
  score: number | null;
};

type PersistDimensionRow = {
  dimension_key: string;
  dimension_name: string;
  score: number | null;
  benchmark_score: number | null;
  status: "strong" | "moderate" | "weak" | "critical" | null;
  summary: string | null;
  sort_order: number;
};

export interface DiagnosisResultView {
  result: {
    overall_score: number | null;
    risk_level: string | null;
    recommended_next_step: string | null;
  };
  dimensions: Array<{
    dimension_key: string;
    dimension_name: string;
    score: number | null;
    status: string | null;
    summary: string | null;
    sort_order: number;
  }>;
}

function normalizeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toQuestionRecord(row: {
  id: string;
  section_id: string | null;
  question_code: string;
  question_text: string;
  question_type: DiagnosisQuestionRecord["questionType"];
  answer_schema: unknown;
  weight: number | string;
  is_required: boolean;
  sort_order: number;
}): DiagnosisQuestionRecord {
  return {
    id: row.id,
    sectionId: row.section_id,
    questionCode: row.question_code,
    questionText: row.question_text,
    questionType: row.question_type,
    answerSchema: normalizeObject(row.answer_schema),
    weight: typeof row.weight === "number" ? row.weight : Number(row.weight),
    isRequired: row.is_required,
    sortOrder: row.sort_order
  };
}

function toSectionRecord(row: {
  id: string;
  key: string;
  title: string;
  sort_order: number;
}): DiagnosisSectionRecord {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    sortOrder: row.sort_order
  };
}

function toAnswerRecord(row: {
  question_id: string;
  answer_text: string | null;
  answer_number: number | string | null;
  answer_boolean: boolean | null;
  answer_json: unknown;
}): DiagnosisAnswerRecord {
  return {
    questionId: row.question_id,
    answerText: row.answer_text,
    answerNumber:
      typeof row.answer_number === "number"
        ? row.answer_number
        : typeof row.answer_number === "string"
          ? Number(row.answer_number)
          : null,
    answerBoolean: row.answer_boolean,
    answerJson: normalizeObject(row.answer_json)
  };
}

function mapDimensionStatus(status: SectionScoreResult["status"]): PersistDimensionRow["status"] {
  if (status === "healthy") {
    return "strong";
  }

  if (status === "warning") {
    return "moderate";
  }

  if (status === "critical") {
    return "critical";
  }

  return null;
}

function buildDimensionRows(sectionScores: SectionScoreResult[]): PersistDimensionRow[] {
  return sectionScores.map((sectionScore) => ({
    dimension_key: sectionScore.sectionKey,
    dimension_name: sectionScore.sectionTitle,
    score: sectionScore.score,
    benchmark_score: null,
    status: mapDimensionStatus(sectionScore.status),
    summary: buildSectionSummary(sectionScore),
    sort_order: sectionScore.sortOrder
  }));
}

export async function generateDiagnosisResult(sessionId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase configuration is unavailable.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const { data: session, error: sessionError } = await supabase
    .from("diagnosis_sessions")
    .select("id, user_id, template_id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single<SessionRecord>();

  if (sessionError || !session) {
    throw new Error("Diagnosis session could not be loaded.");
  }

  console.log("generateDiagnosisResult session loaded", {
    sessionId,
    session
  });

  const { data: sections, error: sectionsError } = await supabase
    .from("diagnosis_template_sections")
    .select("id, key, title, sort_order")
    .eq("template_id", session.template_id)
    .order("sort_order", { ascending: true });

  if (sectionsError || !sections) {
    throw new Error("Diagnosis sections could not be loaded.");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("diagnosis_questions")
    .select("id, section_id, question_code, question_text, question_type, answer_schema, weight, is_required, sort_order")
    .eq("template_id", session.template_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (questionsError || !questions) {
    throw new Error("Diagnosis questions could not be loaded.");
  }

  const { data: answers, error: answersError } = await supabase
    .from("diagnosis_answers")
    .select("question_id, answer_text, answer_number, answer_boolean, answer_json")
    .eq("session_id", session.id)
    .eq("user_id", user.id);

  if (answersError || !answers) {
    throw new Error("Diagnosis answers could not be loaded.");
  }

  const normalizedQuestions = questions.map(toQuestionRecord);
  const normalizedSections = sections.map(toSectionRecord);
  const answersByQuestionId = new Map(answers.map((answer) => [answer.question_id, toAnswerRecord(answer)]));
  const questionScores = normalizedQuestions.map((question) => {
    return calculateQuestionScore(question, answersByQuestionId.get(question.id) ?? null);
  });
  const sectionScores = normalizedSections.map((section) =>
    calculateSectionScore({
      section,
      questionScores
    })
  );
  const overallScore = calculateOverallScore(sectionScores);
  const overallStatus = calculateOverallStatus(overallScore, sectionScores);
  const recommendedNextStep = buildRecommendedNextStep(sectionScores);
  const summary = `Overall diagnosis status is ${overallStatus}.`;

  console.log("generateDiagnosisResult aggregation prepared", {
    sessionId: session.id,
    userId: user.id,
    questionCount: questions.length,
    answerCount: answers.length,
    sectionScores,
    overallScore,
    overallStatus
  });

  const answerScores: PersistAnswerScoreRow[] = questionScores.map((questionScore) => ({
    question_id: questionScore.questionId,
    score: questionScore.scorable ? questionScore.score : null
  }));
  const dimensionRows = buildDimensionRows(sectionScores);
  const filteredDimensionRows = dimensionRows.filter((row) => row.score !== null && row.status !== null);

  console.log("persist_diagnosis_result payload prepared", {
    sessionId: session.id,
    userId: user.id,
    overallScore,
    overallStatus,
    answerScoresCount: answerScores.length,
    dimensionRows,
    filteredDimensionRows
  });

  let resultId: string | null = null;
  let persistError: PostgrestError | null = null;

  try {
    const rpcResult = await supabase.rpc("persist_diagnosis_result", {
      p_session_id: session.id,
      p_user_id: user.id,
      p_overall_score: overallScore,
      p_risk_level: overallStatus,
      p_recommended_next_step: recommendedNextStep,
      p_summary: summary,
      p_answer_scores: answerScores,
      p_dimension_rows: filteredDimensionRows
    });

    resultId = rpcResult.data;
    persistError = rpcResult.error;
  } catch (error) {
    console.error("persist_diagnosis_result threw before response", {
      error,
      serializedError: JSON.stringify(error, null, 2),
      sessionId: session.id,
      userId: user.id,
      overallScore,
      overallStatus,
      filteredDimensionRows,
      answerScores
    });

    throw error;
  }

  if (persistError || !resultId) {
    console.error("persist_diagnosis_result failed", {
      persistError,
      serializedPersistError: JSON.stringify(persistError, null, 2),
      persistErrorMessage: persistError?.message ?? null,
      persistErrorDetails: persistError?.details ?? null,
      persistErrorHint: persistError?.hint ?? null,
      persistErrorCode: persistError?.code ?? null,
      resultId,
      sessionId: session.id,
      userId: user.id,
      overallScore,
      overallStatus,
      filteredDimensionRows,
      answerScores
    });

    throw new Error(
      `Diagnosis result could not be saved. message=${persistError?.message ?? "unknown"} code=${persistError?.code ?? "unknown"} details=${persistError?.details ?? "none"} hint=${persistError?.hint ?? "none"}`
    );
  }

  return {
    resultId,
    overallScore,
    overallStatus,
    sectionScores
  };
}

export async function getDiagnosisResult(sessionId: string): Promise<DiagnosisResultView | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase configuration is unavailable.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication is required.");
  }

  const { data: result, error: resultError } = await supabase
    .from("diagnosis_results")
    .select("id, overall_score, risk_level, recommended_next_step")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (resultError) {
    throw new Error("Diagnosis result could not be loaded.");
  }

  if (!result) {
    return null;
  }

  const { data: dimensions, error: dimensionsError } = await supabase
    .from("diagnosis_result_dimensions")
    .select("dimension_key, dimension_name, score, status, summary, sort_order")
    .eq("result_id", result.id)
    .order("sort_order", { ascending: true });

  if (dimensionsError) {
    throw new Error("Diagnosis result dimensions could not be loaded.");
  }

  return {
    result: {
      overall_score: result.overall_score,
      risk_level: result.risk_level,
      recommended_next_step: result.recommended_next_step
    },
    dimensions:
      dimensions?.map((dimension) => ({
        dimension_key: dimension.dimension_key,
        dimension_name: dimension.dimension_name,
        score: dimension.score,
        status: dimension.status,
        summary: dimension.summary,
        sort_order: dimension.sort_order
      })) ?? []
  };
}
