import type { PostgrestError } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateAndPersistDiagnosisArtifacts } from "@/lib/diagnosis/artifacts";
import {
  generateResultActionsFromRecommendations,
  getResultActionsForResult,
  type ResultActionFeedbackSummary,
  type ResultActionView
} from "@/lib/diagnosis/result-actions";

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

export interface DiagnosisIssueCauseView {
  issue_id: string;
  cause_key: string;
  title: string;
  description: string | null;
  confidence_score: number | null;
  sort_order: number;
}

export interface DiagnosisIssueView {
  id: string;
  dimension_key: string | null;
  issue_key: string;
  title: string;
  description: string | null;
  severity: string | null;
  priority: string | null;
  score_impact: number | null;
  root_cause: string | null;
  sort_order: number;
  causes: DiagnosisIssueCauseView[];
}

export interface DiagnosisRecommendationView {
  id: string;
  issue_id: string | null;
  issue_key: string | null;
  cause_key: string | null;
  recommendation_type: string;
  title: string;
  description: string | null;
  rationale: string | null;
  priority: string | null;
  expected_impact: string | null;
  effort_level: string | null;
}

export interface DiagnosisDimensionComparisonView {
  dimension_key: string;
  dimension_name: string;
  current_score: number | null;
  previous_score: number | null;
  score_diff: number | null;
  current_status: string | null;
  previous_status: string | null;
  change: "improved" | "unchanged" | "declined";
}

export interface DiagnosisComparisonView {
  current_result_id: string;
  previous_result_id: string;
  current_session_id: string;
  previous_session_id: string;
  current_overall_score: number | null;
  previous_overall_score: number | null;
  overall_score_diff: number | null;
  current_overall_status: string | null;
  previous_overall_status: string | null;
  overall_change: "improved" | "unchanged" | "declined";
  dimensions: DiagnosisDimensionComparisonView[];
  improved_dimensions: DiagnosisDimensionComparisonView[];
  unchanged_dimensions: DiagnosisDimensionComparisonView[];
  declined_dimensions: DiagnosisDimensionComparisonView[];
}

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
  issues: DiagnosisIssueView[];
  recommendations: DiagnosisRecommendationView[];
  actions: ResultActionView[];
  feedback: ResultActionFeedbackSummary;
  comparison_context: {
    current_result_id: string;
    previous_result_id: string | null;
    current_session_id: string;
    previous_session_id: string | null;
    recent_results: Array<{
      result_id: string;
      session_id: string;
      overall_score: number | null;
      risk_level: string | null;
      created_at: string;
    }>;
  };
  comparison: DiagnosisComparisonView | null;
}

function normalizeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isArtifactSchemaUnavailableError(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "42703" || error?.code === "PGRST204";
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function classifyScoreChange(currentScore: number | null, previousScore: number | null) {
  if (currentScore === null || previousScore === null) {
    return "unchanged" as const;
  }

  const diff = roundToTwo(currentScore - previousScore);

  if (Math.abs(diff) < 1) {
    return "unchanged" as const;
  }

  return diff > 0 ? ("improved" as const) : ("declined" as const);
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

  let artifactGenerationResult:
    | Awaited<ReturnType<typeof generateAndPersistDiagnosisArtifacts>>
    | { skipped: true; reason: "artifact_generation_guard_caught" } = {
    skipped: true,
    reason: "artifact_generation_guard_caught"
  };

  try {
    artifactGenerationResult = await generateAndPersistDiagnosisArtifacts({
      supabase,
      resultId,
      userId: user.id,
      sectionScores,
      questions: normalizedQuestions,
      questionScores
    });
  } catch (error) {
    console.warn("Diagnosis artifact generation threw past fail-open guard and was ignored.", {
      sessionId: session.id,
      resultId,
      error
    });
  }

  console.log("generateDiagnosisResult artifacts prepared", {
    sessionId: session.id,
    resultId,
    artifactGenerationResult
  });

  const actionGenerationResult = await generateResultActionsFromRecommendations({
    supabase,
    resultId,
    userId: user.id
  });

  console.log("generateDiagnosisResult actions prepared", {
    sessionId: session.id,
    resultId,
    actionGenerationResult
  });

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
    .select("id, session_id, overall_score, risk_level, recommended_next_step, created_at")
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

  const dimensionRows =
    dimensions?.map((dimension) => ({
      dimension_key: dimension.dimension_key,
      dimension_name: dimension.dimension_name,
      score: dimension.score,
      status: dimension.status,
      summary: dimension.summary,
      sort_order: dimension.sort_order
    })) ?? [];
  const dimensionKeyById = new Map<string, string>();

  const { data: persistedDimensions, error: persistedDimensionsError } = await supabase
    .from("diagnosis_result_dimensions")
    .select("id, dimension_key")
    .eq("result_id", result.id);

  if (!persistedDimensionsError && persistedDimensions) {
    for (const dimension of persistedDimensions) {
      dimensionKeyById.set(dimension.id, dimension.dimension_key);
    }
  }

  const [issuesResponse, causesResponse, recommendationsResponse] = await Promise.all([
    supabase
      .from("diagnosis_result_issues")
      .select("id, dimension_id, issue_key, title, description, severity, priority, score_impact, root_cause, sort_order")
      .eq("result_id", result.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("diagnosis_result_issue_causes")
      .select("issue_id, cause_key, title, description, confidence_score, sort_order")
      .eq("result_id", result.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("action_recommendations")
      .select(
        "id, issue_id, recommendation_type, title, description, rationale, priority, expected_impact, effort_level, source_ref"
      )
      .eq("result_id", result.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
  ]);

  const artifactSchemaUnavailable =
    isArtifactSchemaUnavailableError(issuesResponse.error) ||
    isArtifactSchemaUnavailableError(causesResponse.error) ||
    isArtifactSchemaUnavailableError(recommendationsResponse.error);

  if (
    (issuesResponse.error && !isArtifactSchemaUnavailableError(issuesResponse.error)) ||
    (causesResponse.error && !isArtifactSchemaUnavailableError(causesResponse.error)) ||
    (recommendationsResponse.error && !isArtifactSchemaUnavailableError(recommendationsResponse.error))
  ) {
    throw new Error("Diagnosis artifacts could not be loaded.");
  }

  const causesByIssueId = new Map<string, DiagnosisIssueCauseView[]>();

  if (!artifactSchemaUnavailable) {
    for (const cause of causesResponse.data ?? []) {
      const issueCauses = causesByIssueId.get(cause.issue_id) ?? [];

      issueCauses.push({
        issue_id: cause.issue_id,
        cause_key: cause.cause_key,
        title: cause.title,
        description: cause.description,
        confidence_score: cause.confidence_score,
        sort_order: cause.sort_order
      });
      causesByIssueId.set(cause.issue_id, issueCauses);
    }
  }

  const issues: DiagnosisIssueView[] = artifactSchemaUnavailable
    ? []
    : (issuesResponse.data ?? []).map((issue) => ({
        id: issue.id,
        dimension_key: issue.dimension_id ? dimensionKeyById.get(issue.dimension_id) ?? null : null,
        issue_key: issue.issue_key,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        priority: issue.priority,
        score_impact: issue.score_impact,
        root_cause: issue.root_cause,
        sort_order: issue.sort_order,
        causes: causesByIssueId.get(issue.id) ?? []
      }));
  const issueKeyById = new Map(issues.map((issue) => [issue.id, issue.issue_key]));
  const recommendations: DiagnosisRecommendationView[] = artifactSchemaUnavailable
    ? []
    : (recommendationsResponse.data ?? []).map((recommendation) => ({
        id: recommendation.id,
        issue_id: recommendation.issue_id,
        issue_key: recommendation.issue_id ? issueKeyById.get(recommendation.issue_id) ?? null : null,
        cause_key: recommendation.source_ref,
        recommendation_type: recommendation.recommendation_type,
        title: recommendation.title,
        description: recommendation.description,
        rationale: recommendation.rationale,
        priority: recommendation.priority,
        expected_impact: recommendation.expected_impact,
        effort_level: recommendation.effort_level
      }));
  const resultActionsState = await getResultActionsForResult({
    supabase,
    resultId: result.id,
    userId: user.id
  });
  const { data: recentResults, error: recentResultsError } = await supabase
    .from("diagnosis_results")
    .select("id, session_id, overall_score, risk_level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentResultsError) {
    throw new Error("Recent diagnosis results could not be loaded.");
  }

  const recentResultRows =
    recentResults?.map((recentResult) => ({
      result_id: recentResult.id,
      session_id: recentResult.session_id,
      overall_score: recentResult.overall_score,
      risk_level: recentResult.risk_level,
      created_at: recentResult.created_at
    })) ?? [];
  const previousResult = recentResultRows.find((recentResult) => recentResult.result_id !== result.id) ?? null;
  let comparison: DiagnosisComparisonView | null = null;

  if (previousResult) {
    const { data: previousDimensions, error: previousDimensionsError } = await supabase
      .from("diagnosis_result_dimensions")
      .select("dimension_key, dimension_name, score, status, sort_order")
      .eq("result_id", previousResult.result_id)
      .order("sort_order", { ascending: true });

    if (previousDimensionsError) {
      throw new Error("Previous diagnosis result dimensions could not be loaded.");
    }

    const previousDimensionByKey = new Map(
      (previousDimensions ?? []).map((dimension) => [dimension.dimension_key, dimension])
    );
    const currentDimensionKeys = new Set(dimensionRows.map((dimension) => dimension.dimension_key));
    const previousOnlyDimensions =
      previousDimensions?.filter((dimension) => !currentDimensionKeys.has(dimension.dimension_key)) ?? [];
    const comparedDimensions: DiagnosisDimensionComparisonView[] = [
      ...dimensionRows.map((dimension) => {
        const previousDimension = previousDimensionByKey.get(dimension.dimension_key);
        const previousScore = previousDimension?.score ?? null;
        const change = classifyScoreChange(dimension.score, previousDimension?.score ?? null);

        return {
          dimension_key: dimension.dimension_key,
          dimension_name: dimension.dimension_name,
          current_score: dimension.score,
          previous_score: previousScore,
          score_diff:
            dimension.score !== null && previousScore !== null
              ? roundToTwo(dimension.score - previousScore)
              : null,
          current_status: dimension.status,
          previous_status: previousDimension?.status ?? null,
          change
        };
      }),
      ...previousOnlyDimensions.map((dimension) => ({
        dimension_key: dimension.dimension_key,
        dimension_name: dimension.dimension_name,
        current_score: null,
        previous_score: dimension.score,
        score_diff: null,
        current_status: null,
        previous_status: dimension.status,
        change: "unchanged" as const
      }))
    ];
    const overallChange = classifyScoreChange(result.overall_score, previousResult.overall_score);

    comparison = {
      current_result_id: result.id,
      previous_result_id: previousResult.result_id,
      current_session_id: result.session_id,
      previous_session_id: previousResult.session_id,
      current_overall_score: result.overall_score,
      previous_overall_score: previousResult.overall_score,
      overall_score_diff:
        result.overall_score !== null && previousResult.overall_score !== null
          ? roundToTwo(result.overall_score - previousResult.overall_score)
          : null,
      current_overall_status: result.risk_level,
      previous_overall_status: previousResult.risk_level,
      overall_change: overallChange,
      dimensions: comparedDimensions,
      improved_dimensions: comparedDimensions.filter((dimension) => dimension.change === "improved"),
      unchanged_dimensions: comparedDimensions.filter((dimension) => dimension.change === "unchanged"),
      declined_dimensions: comparedDimensions.filter((dimension) => dimension.change === "declined")
    };
  }

  return {
    result: {
      overall_score: result.overall_score,
      risk_level: result.risk_level,
      recommended_next_step: result.recommended_next_step
    },
    dimensions: dimensionRows,
    issues,
    recommendations,
    actions: resultActionsState.actions,
    feedback: resultActionsState.feedback,
    comparison_context: {
      current_result_id: result.id,
      previous_result_id: previousResult?.result_id ?? null,
      current_session_id: result.session_id,
      previous_session_id: previousResult?.session_id ?? null,
      recent_results: recentResultRows
    },
    comparison
  };
}
