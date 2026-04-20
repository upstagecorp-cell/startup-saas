import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type {
  DiagnosisQuestionRecord,
  QuestionScoreResult,
  SectionScoreResult
} from "@/lib/diagnosis/scoring";

export type PersistIssueRow = {
  dimension_key: string;
  issue_key: string;
  title: string;
  description: string | null;
  severity: string | null;
  priority: string | null;
  score_impact: number | null;
  root_cause: string | null;
  sort_order: number;
};

export type PersistCauseRow = {
  issue_key: string;
  cause_key: string;
  title: string;
  description: string | null;
  confidence_score: number | null;
  sort_order: number;
};

export type PersistRecommendationRow = {
  issue_key: string;
  cause_key: string | null;
  recommendation_type: string;
  title: string;
  description: string | null;
  rationale: string | null;
  priority: string | null;
  expected_impact: string | null;
  effort_level: string | null;
};

type ArtifactGenerationInput = {
  supabase: SupabaseClient;
  resultId: string;
  userId: string;
  sectionScores: SectionScoreResult[];
  questions: DiagnosisQuestionRecord[];
  questionScores: QuestionScoreResult[];
};

type ArtifactSkipReason =
  | "artifact_schema_unavailable"
  | "artifact_rpc_unavailable"
  | "artifact_definitions_query_failed"
  | "artifact_rpc_failed"
  | "artifact_seed_empty"
  | "no_matching_artifacts"
  | "artifact_unexpected_error";

type IssueDefinitionRecord = {
  id: string;
  dimension_key: string;
  issue_key: string;
  title: string;
  description: string | null;
  trigger_status: "strong" | "moderate" | "weak" | "critical" | null;
  min_score: number | string | null;
  max_score: number | string | null;
  severity: string | null;
  priority: string | null;
  score_impact: number | string | null;
  sort_order: number;
};

type CauseDefinitionRecord = {
  issue_definition_id: string;
  cause_key: string;
  title: string;
  description: string | null;
  match_rule: unknown;
  confidence_weight: number | string | null;
  sort_order: number;
};

type ActionTemplateRecord = {
  cause_key: string;
  recommendation_type: string;
  title: string;
  description: string | null;
  rationale: string | null;
  priority: string | null;
  expected_impact: string | null;
  effort_level: string | null;
  sort_order: number;
};

type CauseMatchRule = {
  dimension_statuses?: string[];
  dimension_min_score?: number;
  dimension_max_score?: number;
  question_codes_any?: string[];
  question_codes_all?: string[];
  min_question_score?: number;
  max_question_score?: number;
};

const CANONICAL_DIMENSION_KEYS = new Set(["customer", "problem", "solution", "market", "revenue", "execution"]);
const DIMENSION_KEY_ALIASES: Record<string, string> = {
  customers: "customer",
  problems: "problem",
  solutions: "solution",
  markets: "market",
  revenues: "revenue",
  executions: "execution"
};

function toNullableNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsedValue = Number(value);

    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  return null;
}

function normalizeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isMissingArtifactSchemaError(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "42703" || error?.code === "PGRST204";
}

function isPermissionRelatedArtifactError(error: PostgrestError | null) {
  return error?.code === "42501";
}

function normalizeDimensionKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (CANONICAL_DIMENSION_KEYS.has(normalizedValue)) {
    return normalizedValue;
  }

  return DIMENSION_KEY_ALIASES[normalizedValue] ?? normalizedValue;
}

function mapSectionStatusToDimensionStatus(status: SectionScoreResult["status"]) {
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

function issueMatchesDimension(sectionScore: SectionScoreResult, issueDefinition: IssueDefinitionRecord) {
  const dimensionStatus = mapSectionStatusToDimensionStatus(sectionScore.status);
  const minScore = toNullableNumber(issueDefinition.min_score);
  const maxScore = toNullableNumber(issueDefinition.max_score);
  const normalizedSectionKey = normalizeDimensionKey(sectionScore.sectionKey);
  const normalizedIssueDimensionKey = normalizeDimensionKey(issueDefinition.dimension_key);

  if (!normalizedSectionKey || !normalizedIssueDimensionKey || normalizedIssueDimensionKey !== normalizedSectionKey) {
    return false;
  }

  if (issueDefinition.trigger_status && issueDefinition.trigger_status !== dimensionStatus) {
    return false;
  }

  if (sectionScore.score === null) {
    return false;
  }

  if (minScore !== null && sectionScore.score < minScore) {
    return false;
  }

  if (maxScore !== null && sectionScore.score > maxScore) {
    return false;
  }

  return true;
}

function questionCodeSetForIssue(
  issueDefinition: IssueDefinitionRecord,
  sectionScore: SectionScoreResult,
  questions: DiagnosisQuestionRecord[],
  questionScores: QuestionScoreResult[]
) {
  const questionIdsInSection = new Set(
    questions.filter((question) => question.sectionId === sectionScore.sectionId).map((question) => question.id)
  );

  return new Map(
    questionScores
      .filter((questionScore) => questionIdsInSection.has(questionScore.questionId))
      .map((questionScore) => {
        const question = questions.find((candidate) => candidate.id === questionScore.questionId);

        return [question?.questionCode ?? issueDefinition.issue_key, questionScore];
      })
  );
}

function causeMatchesIssue(
  causeDefinition: CauseDefinitionRecord,
  sectionScore: SectionScoreResult,
  issueDefinition: IssueDefinitionRecord,
  questionScoresByCode: Map<string, QuestionScoreResult>
) {
  const matchRule = normalizeObject(causeDefinition.match_rule) as CauseMatchRule | null;

  if (!matchRule) {
    return true;
  }

  const dimensionStatus = mapSectionStatusToDimensionStatus(sectionScore.status);

  if (matchRule.dimension_statuses?.length && (!dimensionStatus || !matchRule.dimension_statuses.includes(dimensionStatus))) {
    return false;
  }

  if (typeof matchRule.dimension_min_score === "number" && (sectionScore.score ?? -1) < matchRule.dimension_min_score) {
    return false;
  }

  if (typeof matchRule.dimension_max_score === "number" && (sectionScore.score ?? 101) > matchRule.dimension_max_score) {
    return false;
  }

  const anyQuestionCodes = normalizeStringArray(matchRule.question_codes_any);
  const allQuestionCodes = normalizeStringArray(matchRule.question_codes_all);

  if (anyQuestionCodes.length) {
    const hasAnyMatchedQuestion = anyQuestionCodes.some((questionCode) => {
      const questionScore = questionScoresByCode.get(questionCode);

      if (!questionScore || questionScore.score === null) {
        return false;
      }

      if (typeof matchRule.min_question_score === "number" && questionScore.score < matchRule.min_question_score) {
        return false;
      }

      if (typeof matchRule.max_question_score === "number" && questionScore.score > matchRule.max_question_score) {
        return false;
      }

      return true;
    });

    if (!hasAnyMatchedQuestion) {
      return false;
    }
  }

  if (allQuestionCodes.length) {
    const hasAllMatchedQuestions = allQuestionCodes.every((questionCode) => {
      const questionScore = questionScoresByCode.get(questionCode);

      if (!questionScore || questionScore.score === null) {
        return false;
      }

      if (typeof matchRule.min_question_score === "number" && questionScore.score < matchRule.min_question_score) {
        return false;
      }

      if (typeof matchRule.max_question_score === "number" && questionScore.score > matchRule.max_question_score) {
        return false;
      }

      return true;
    });

    if (!hasAllMatchedQuestions) {
      return false;
    }
  }

  return issueMatchesDimension(sectionScore, issueDefinition);
}

function scoreImpactFromSectionScore(sectionScore: SectionScoreResult) {
  if (sectionScore.score === null) {
    return null;
  }

  return Math.round((100 - sectionScore.score) * 100) / 100;
}

export async function generateAndPersistDiagnosisArtifacts({
  supabase,
  resultId,
  userId,
  sectionScores,
  questions,
  questionScores
}: ArtifactGenerationInput) {
  try {
    const [issueDefinitionsResponse, causeDefinitionsResponse, actionTemplatesResponse] = await Promise.all([
      supabase
        .from("diagnosis_issue_definitions")
        .select(
          "id, dimension_key, issue_key, title, description, trigger_status, min_score, max_score, severity, priority, score_impact, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("diagnosis_issue_cause_definitions")
        .select("issue_definition_id, cause_key, title, description, match_rule, confidence_weight, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("diagnosis_action_templates")
        .select(
          "cause_key, recommendation_type, title, description, rationale, priority, expected_impact, effort_level, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    ]);

    if (
      isMissingArtifactSchemaError(issueDefinitionsResponse.error) ||
      isMissingArtifactSchemaError(causeDefinitionsResponse.error) ||
      isMissingArtifactSchemaError(actionTemplatesResponse.error)
    ) {
      console.warn("Diagnosis artifact generation skipped because artifact schema is not available yet.", {
        resultId,
        issueDefinitionsError: issueDefinitionsResponse.error,
        causeDefinitionsError: causeDefinitionsResponse.error,
        actionTemplatesError: actionTemplatesResponse.error,
        missingSchema: true
      });

      return { skipped: true as const, reason: "artifact_schema_unavailable" satisfies ArtifactSkipReason };
    }

    if (
      isPermissionRelatedArtifactError(issueDefinitionsResponse.error) ||
      isPermissionRelatedArtifactError(causeDefinitionsResponse.error) ||
      isPermissionRelatedArtifactError(actionTemplatesResponse.error)
    ) {
      console.warn("Diagnosis artifact generation skipped because artifact definitions could not be read.", {
        resultId,
        issueDefinitionsError: issueDefinitionsResponse.error,
        causeDefinitionsError: causeDefinitionsResponse.error,
        actionTemplatesError: actionTemplatesResponse.error,
        suspectedReason: "rls_or_permission"
      });

      return { skipped: true as const, reason: "artifact_definitions_query_failed" satisfies ArtifactSkipReason };
    }

    if (issueDefinitionsResponse.error || causeDefinitionsResponse.error || actionTemplatesResponse.error) {
      console.warn("Diagnosis artifact generation skipped because artifact definition queries failed.", {
        resultId,
        issueDefinitionsError: issueDefinitionsResponse.error,
        causeDefinitionsError: causeDefinitionsResponse.error,
        actionTemplatesError: actionTemplatesResponse.error,
        missingSchema: false,
        suspectedReason: "query_failure"
      });

      return { skipped: true as const, reason: "artifact_definitions_query_failed" satisfies ArtifactSkipReason };
    }

    const issueDefinitions = (issueDefinitionsResponse.data ?? []) as IssueDefinitionRecord[];
    const causeDefinitions = (causeDefinitionsResponse.data ?? []) as CauseDefinitionRecord[];
    const actionTemplates = (actionTemplatesResponse.data ?? []) as ActionTemplateRecord[];

    if (!issueDefinitions.length || !causeDefinitions.length || !actionTemplates.length) {
      console.warn("Diagnosis artifact generation skipped because artifact seed data is empty or incomplete.", {
        resultId,
        issueDefinitionCount: issueDefinitions.length,
        causeDefinitionCount: causeDefinitions.length,
        actionTemplateCount: actionTemplates.length,
        suspectedReason: "seed_empty"
      });

      return { skipped: true as const, reason: "artifact_seed_empty" satisfies ArtifactSkipReason };
    }

    const issueRows: PersistIssueRow[] = [];
    const causeRows: PersistCauseRow[] = [];
    const recommendationRows: PersistRecommendationRow[] = [];
    const issueDefinitionByKey = new Map(
      issueDefinitions.map((issueDefinition) => [issueDefinition.issue_key, issueDefinition])
    );

    for (const sectionScore of sectionScores) {
      if (sectionScore.score === null || !sectionScore.status) {
        continue;
      }

      const matchingIssueDefinitions = issueDefinitions.filter((issueDefinition) =>
        issueMatchesDimension(sectionScore, issueDefinition)
      );

      for (const issueDefinition of matchingIssueDefinitions) {
        issueRows.push({
          dimension_key: sectionScore.sectionKey,
          issue_key: issueDefinition.issue_key,
          title: issueDefinition.title,
          description: issueDefinition.description,
          severity: issueDefinition.severity,
          priority: issueDefinition.priority,
          score_impact: toNullableNumber(issueDefinition.score_impact) ?? scoreImpactFromSectionScore(sectionScore),
          root_cause: null,
          sort_order: issueDefinition.sort_order
        });

        const questionScoresByCode = questionCodeSetForIssue(issueDefinition, sectionScore, questions, questionScores);
        const matchingCauseDefinitions = causeDefinitions
          .filter((causeDefinition) => causeDefinition.issue_definition_id === issueDefinition.id)
          .filter((causeDefinition) =>
            causeMatchesIssue(causeDefinition, sectionScore, issueDefinition, questionScoresByCode)
          );

        for (const causeDefinition of matchingCauseDefinitions) {
          causeRows.push({
            issue_key: issueDefinition.issue_key,
            cause_key: causeDefinition.cause_key,
            title: causeDefinition.title,
            description: causeDefinition.description,
            confidence_score: toNullableNumber(causeDefinition.confidence_weight),
            sort_order: causeDefinition.sort_order
          });

          const matchingActionTemplates = actionTemplates.filter(
            (actionTemplate) => actionTemplate.cause_key === causeDefinition.cause_key
          );

          for (const actionTemplate of matchingActionTemplates) {
            recommendationRows.push({
              issue_key: issueDefinition.issue_key,
              cause_key: causeDefinition.cause_key,
              recommendation_type: actionTemplate.recommendation_type,
              title: actionTemplate.title,
              description: actionTemplate.description,
              rationale: actionTemplate.rationale,
              priority: actionTemplate.priority,
              expected_impact: actionTemplate.expected_impact,
              effort_level: actionTemplate.effort_level
            });
          }
        }

        if (!matchingCauseDefinitions.length) {
          const fallbackActionTemplates = actionTemplates.filter(
            (actionTemplate) => actionTemplate.cause_key === issueDefinition.issue_key
          );

          for (const actionTemplate of fallbackActionTemplates) {
            recommendationRows.push({
              issue_key: issueDefinition.issue_key,
              cause_key: null,
              recommendation_type: actionTemplate.recommendation_type,
              title: actionTemplate.title,
              description: actionTemplate.description,
              rationale: actionTemplate.rationale,
              priority: actionTemplate.priority,
              expected_impact: actionTemplate.expected_impact,
              effort_level: actionTemplate.effort_level
            });
          }
        }
      }
    }

    const dedupedIssueRows = Array.from(new Map(issueRows.map((issueRow) => [issueRow.issue_key, issueRow])).values());
    const dedupedCauseRows = Array.from(
      new Map(causeRows.map((causeRow) => [`${causeRow.issue_key}:${causeRow.cause_key}`, causeRow])).values()
    );
    const dedupedRecommendationRows = Array.from(
      new Map(
        recommendationRows.map((recommendationRow) => [
          `${recommendationRow.issue_key}:${recommendationRow.cause_key ?? "none"}:${recommendationRow.title}`,
          recommendationRow
        ])
      ).values()
    );

    if (!dedupedIssueRows.length && !dedupedCauseRows.length && !dedupedRecommendationRows.length) {
      console.warn("Diagnosis artifact generation skipped because no artifact rules matched the current result.", {
        resultId,
        issueDefinitionCount: issueDefinitionByKey.size,
        matchedIssueCount: dedupedIssueRows.length,
        matchedCauseCount: dedupedCauseRows.length,
        matchedRecommendationCount: dedupedRecommendationRows.length,
        suspectedReason: "no_rule_match"
      });

      return { skipped: true as const, reason: "no_matching_artifacts" satisfies ArtifactSkipReason };
    }

    const { error: persistError } = await supabase.rpc("persist_diagnosis_artifacts", {
      p_result_id: resultId,
      p_user_id: userId,
      p_issue_rows: dedupedIssueRows,
      p_cause_rows: dedupedCauseRows,
      p_recommendation_rows: dedupedRecommendationRows
    });

    if (isMissingArtifactSchemaError(persistError)) {
      console.warn("Diagnosis artifact persistence skipped because artifact RPC or schema is unavailable.", {
        resultId,
        persistError,
        missingSchema: true
      });

      return { skipped: true as const, reason: "artifact_rpc_unavailable" satisfies ArtifactSkipReason };
    }

    if (isPermissionRelatedArtifactError(persistError)) {
      console.warn("Diagnosis artifact persistence skipped because of RLS or permission failure.", {
        resultId,
        persistError,
        suspectedReason: "rls_or_permission"
      });

      return { skipped: true as const, reason: "artifact_rpc_failed" satisfies ArtifactSkipReason };
    }

    if (persistError) {
      console.warn("Diagnosis artifact persistence skipped because RPC execution failed.", {
        resultId,
        persistError,
        missingSchema: false,
        suspectedReason: "rpc_failure"
      });

      return { skipped: true as const, reason: "artifact_rpc_failed" satisfies ArtifactSkipReason };
    }

    return {
      skipped: false as const,
      issueCount: dedupedIssueRows.length,
      causeCount: dedupedCauseRows.length,
      recommendationCount: dedupedRecommendationRows.length,
      issueDefinitionCount: issueDefinitionByKey.size
    };
  } catch (error) {
    console.warn("Diagnosis artifact generation failed unexpectedly and was skipped.", {
      resultId,
      error,
      suspectedReason: "unexpected_runtime_error"
    });

    return { skipped: true as const, reason: "artifact_unexpected_error" satisfies ArtifactSkipReason };
  }
}
