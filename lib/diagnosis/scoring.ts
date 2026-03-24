export type SupportedQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "short_text"
  | "long_text"
  | "number"
  | "boolean"
  | "scale";

export type Direction = "asc" | "desc";
export type OverallStatus = "healthy" | "warning" | "critical";

export interface DiagnosisSectionRecord {
  id: string;
  key: string;
  title: string;
  sortOrder: number;
}

export interface DiagnosisQuestionRecord {
  id: string;
  sectionId: string | null;
  questionCode: string;
  questionText: string;
  questionType: SupportedQuestionType;
  answerSchema: Record<string, unknown> | null;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface DiagnosisAnswerRecord {
  questionId: string;
  answerText: string | null;
  answerNumber: number | null;
  answerBoolean: boolean | null;
  answerJson: Record<string, unknown> | null;
}

export interface QuestionScoreResult {
  questionId: string;
  sectionId: string | null;
  score: number | null;
  scorable: boolean;
  weight: number;
}

export interface SectionScoreInput {
  section: DiagnosisSectionRecord;
  questionScores: QuestionScoreResult[];
  weight?: number;
}

export interface SectionScoreResult {
  sectionId: string;
  sectionKey: string;
  sectionTitle: string;
  sortOrder: number;
  score: number | null;
  status: OverallStatus | null;
  scorableQuestionCount: number;
  answeredQuestionCount: number;
  appliedWeight: number;
}

const DEFAULT_SECTION_WEIGHT = 1;
const DEFAULT_DIRECTION: Direction = "asc";
const CORE_SECTION_KEYS = new Set(["problem", "customer", "execution"]);

type ChoiceOption = {
  value: string;
  label?: string;
  score: number;
};

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value));
}

function readDirection(answerSchema: Record<string, unknown> | null): Direction {
  return answerSchema?.direction === "desc" ? "desc" : DEFAULT_DIRECTION;
}

function applyDirection(rawScore: number, direction: Direction) {
  const clampedScore = clampScore(rawScore);

  return roundScore(direction === "desc" ? 100 - clampedScore : clampedScore);
}

function readOptions(answerSchema: Record<string, unknown> | null) {
  const options = answerSchema?.options;

  if (!Array.isArray(options)) {
    return null;
  }

  const parsedOptions: ChoiceOption[] = [];

  for (const option of options) {
    if (!option || typeof option !== "object") {
      return null;
    }

    const value = "value" in option ? option.value : undefined;
    const score = "score" in option ? option.score : undefined;

    if (typeof value !== "string" || typeof score !== "number") {
      return null;
    }

    const parsed: ChoiceOption = { value, score };

    if ("label" in option && typeof option.label === "string") {
      parsed.label = option.label;
    }

    parsedOptions.push(parsed);
  }

  return parsedOptions;
}

function readMultipleChoiceValues(answerJson: Record<string, unknown> | null) {
  const values = answerJson?.values;

  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(new Set(values.filter((value): value is string => typeof value === "string")));
}

function readRequired(answerSchema: Record<string, unknown> | null, fallback: boolean) {
  if (typeof answerSchema?.required === "boolean") {
    return answerSchema.required;
  }

  return fallback;
}

function asNumber(value: unknown, keyName: string) {
  if (typeof value !== "number") {
    return null;
  }

  return value;
}

function calculateLinearScore(answerNumber: number, answerSchema: Record<string, unknown>) {
  const min = asNumber(answerSchema.min, "min");
  const max = asNumber(answerSchema.max, "max");

  if (min === null || max === null || max <= min) {
    return null;
  }

  return ((answerNumber - min) / (max - min)) * 100;
}

function calculateTargetScore(answerNumber: number, answerSchema: Record<string, unknown>) {
  const target = asNumber(answerSchema.target, "target");
  const tolerance = asNumber(answerSchema.tolerance, "tolerance");

  if (target === null || tolerance === null || tolerance <= 0) {
    return null;
  }

  const distance = Math.abs(answerNumber - target);

  return 100 - (distance / tolerance) * 100;
}

function calculateRangeScore(answerNumber: number, answerSchema: Record<string, unknown>) {
  const goodMin = asNumber(answerSchema.good_min, "good_min");
  const goodMax = asNumber(answerSchema.good_max, "good_max");
  const tolerance = asNumber(answerSchema.tolerance, "tolerance");

  if (goodMin === null || goodMax === null || tolerance === null || goodMax < goodMin || tolerance <= 0) {
    return null;
  }

  if (answerNumber >= goodMin && answerNumber <= goodMax) {
    return 100;
  }

  const distance = Math.min(Math.abs(answerNumber - goodMin), Math.abs(answerNumber - goodMax));

  return 100 - (distance / tolerance) * 100;
}

export function calculateQuestionScore(
  question: DiagnosisQuestionRecord,
  answer: DiagnosisAnswerRecord | null
): QuestionScoreResult {
  const direction = readDirection(question.answerSchema);
  const baseResult = {
    questionId: question.id,
    sectionId: question.sectionId,
    weight: question.weight
  };

  if (question.questionType === "short_text" || question.questionType === "long_text") {
    return {
      ...baseResult,
      score: null,
      scorable: false
    };
  }

  if (!answer) {
    return {
      ...baseResult,
      score: null,
      scorable: true
    };
  }

  switch (question.questionType) {
    case "scale": {
      if (answer.answerNumber === null) {
        return {
          ...baseResult,
          score: null,
          scorable: true
        };
      }

      const rawScore = calculateLinearScore(answer.answerNumber, question.answerSchema ?? {});

      return {
        ...baseResult,
        score: rawScore === null ? null : applyDirection(rawScore, direction),
        scorable: true
      };
    }

    case "boolean": {
      if (answer.answerBoolean === null) {
        return {
          ...baseResult,
          score: null,
          scorable: true
        };
      }

      return {
        ...baseResult,
        score: applyDirection(answer.answerBoolean ? 100 : 0, direction),
        scorable: true
      };
    }

    case "single_choice": {
      if (!answer.answerText) {
        return {
          ...baseResult,
          score: null,
          scorable: true
        };
      }

      const options = readOptions(question.answerSchema);
      const option = options?.find((item) => item.value === answer.answerText);

      return {
        ...baseResult,
        score: option ? applyDirection(option.score, direction) : null,
        scorable: true
      };
    }

    case "multiple_choice": {
      const selectedValues = readMultipleChoiceValues(answer.answerJson);
      const isRequired = readRequired(question.answerSchema, question.isRequired);

      if (selectedValues.length === 0) {
        return {
          ...baseResult,
          score: isRequired ? 0 : null,
          scorable: true
        };
      }

      const options = readOptions(question.answerSchema);
      const selectedOptions = options
        ?.filter((option) => selectedValues.includes(option.value))
        .filter((option) => typeof option.score === "number");

      if (!selectedOptions || selectedOptions.length === 0) {
        return {
          ...baseResult,
          score: null,
          scorable: true
        };
      }

      const selectedScoresSum = selectedOptions.reduce((sum, option) => sum + option.score, 0);

      return {
        ...baseResult,
        score: applyDirection(selectedScoresSum / selectedOptions.length, direction),
        scorable: true
      };
    }

    case "number": {
      if (answer.answerNumber === null) {
        return {
          ...baseResult,
          score: null,
          scorable: true
        };
      }

      const answerSchema = question.answerSchema ?? {};
      const scoringMethod = answerSchema.scoring_method;
      let rawScore: number | null = null;

      if (scoringMethod === "linear") {
        rawScore = calculateLinearScore(answer.answerNumber, answerSchema);
      } else if (scoringMethod === "target") {
        rawScore = calculateTargetScore(answer.answerNumber, answerSchema);
      } else if (scoringMethod === "range") {
        rawScore = calculateRangeScore(answer.answerNumber, answerSchema);
      }

      return {
        ...baseResult,
        score: rawScore === null ? null : applyDirection(rawScore, direction),
        scorable: true
      };
    }

    default:
      return {
        ...baseResult,
        score: null,
        scorable: false
      };
  }
}

function getBaseStatus(score: number): OverallStatus {
  if (score < 55) {
    return "critical";
  }

  if (score < 80) {
    return "warning";
  }

  return "healthy";
}

export function calculateSectionScore({ section, questionScores, weight = DEFAULT_SECTION_WEIGHT }: SectionScoreInput) {
  const scoredQuestions = questionScores.filter(
    (questionScore) => questionScore.scorable && questionScore.score !== null && questionScore.sectionId === section.id
  );
  const totalWeight = scoredQuestions.reduce((sum, questionScore) => sum + questionScore.weight, 0);
  const weightedScore = scoredQuestions.reduce((sum, questionScore) => {
    return sum + (questionScore.score ?? 0) * questionScore.weight;
  }, 0);
  const score = totalWeight > 0 ? roundScore(weightedScore / totalWeight) : null;

  return {
    sectionId: section.id,
    sectionKey: section.key,
    sectionTitle: section.title,
    sortOrder: section.sortOrder,
    score,
    status: score === null ? null : getBaseStatus(score),
    scorableQuestionCount: scoredQuestions.length,
    answeredQuestionCount: scoredQuestions.length,
    appliedWeight: weight
  } satisfies SectionScoreResult;
}

export function calculateOverallScore(sectionScores: SectionScoreResult[]) {
  const scoredSections = sectionScores.filter((sectionScore) => sectionScore.score !== null);
  const totalWeight = scoredSections.reduce((sum, sectionScore) => sum + sectionScore.appliedWeight, 0);
  const weightedScore = scoredSections.reduce((sum, sectionScore) => {
    return sum + (sectionScore.score ?? 0) * sectionScore.appliedWeight;
  }, 0);

  return totalWeight > 0 ? roundScore(weightedScore / totalWeight) : null;
}

export function calculateOverallStatus(overallScore: number | null, sectionScores: SectionScoreResult[]): OverallStatus {
  if (overallScore === null) {
    return "critical";
  }

  const coreSections = sectionScores.filter(
    (sectionScore) => sectionScore.score !== null && CORE_SECTION_KEYS.has(sectionScore.sectionKey)
  );
  const status = getBaseStatus(overallScore);

  if (status === "healthy" && coreSections.some((sectionScore) => (sectionScore.score ?? 0) < 40)) {
    return "critical";
  }

  if (status === "healthy" && coreSections.some((sectionScore) => (sectionScore.score ?? 0) < 60)) {
    return "warning";
  }

  if (status === "warning" && coreSections.some((sectionScore) => (sectionScore.score ?? 0) < 35)) {
    return "critical";
  }

  return status;
}

export function buildSectionSummary(sectionScore: SectionScoreResult) {
  if (sectionScore.score === null) {
    return "No scorable answers were available for this section.";
  }

  if (sectionScore.score < 55) {
    return `${sectionScore.sectionTitle} needs immediate attention.`;
  }

  if (sectionScore.score < 80) {
    return `${sectionScore.sectionTitle} has meaningful gaps to address next.`;
  }

  return `${sectionScore.sectionTitle} is currently in a healthy range.`;
}

export function buildRecommendedNextStep(sectionScores: SectionScoreResult[]) {
  const worstSection = sectionScores
    .filter((sectionScore) => sectionScore.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0];

  if (!worstSection) {
    return "Review the submitted answers and complete the next diagnosis iteration.";
  }

  return `Prioritize improvements in ${worstSection.sectionTitle.toLowerCase()} before the next diagnosis cycle.`;
}
