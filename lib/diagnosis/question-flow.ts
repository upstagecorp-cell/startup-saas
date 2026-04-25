const BUSINESS_TYPE_QUESTION_CODE = "business_type";

export type SupportedBusinessType = "online" | "offline";

type QuestionLike = {
  id: string;
  questionCode: string;
  answerSchema: Record<string, unknown> | null;
};

type AnswerLike = {
  questionId: string;
  answerText: string | null;
};

function normalizeBusinessType(value: string | null | undefined): SupportedBusinessType | null {
  if (value === "online" || value === "offline") {
    return value;
  }

  return null;
}

function readBusinessTypes(answerSchema: Record<string, unknown> | null) {
  const businessTypes = answerSchema?.business_types;

  if (!Array.isArray(businessTypes)) {
    return [];
  }

  return businessTypes.filter((value): value is SupportedBusinessType => value === "online" || value === "offline");
}

export function getBusinessTypeQuestionCode() {
  return BUSINESS_TYPE_QUESTION_CODE;
}

export function resolveBusinessTypeFromAnswers<TAnswer extends AnswerLike>(
  questions: QuestionLike[],
  answersByQuestionId: Map<string, TAnswer>
) {
  const businessTypeQuestion = questions.find((question) => question.questionCode === BUSINESS_TYPE_QUESTION_CODE);

  if (!businessTypeQuestion) {
    return null;
  }

  const answer = answersByQuestionId.get(businessTypeQuestion.id);

  return normalizeBusinessType(answer?.answerText);
}

export function resolveDiagnosisQuestions<TQuestion extends QuestionLike>(
  questions: TQuestion[],
  businessType: SupportedBusinessType | null
) {
  const businessTypeQuestion = questions.find((question) => question.questionCode === BUSINESS_TYPE_QUESTION_CODE) ?? null;
  const branchCandidateQuestions = questions.filter(
    (question) => question.questionCode !== BUSINESS_TYPE_QUESTION_CODE
  );

  if (!businessTypeQuestion) {
    return questions;
  }

  if (!businessType) {
    return [businessTypeQuestion];
  }

  const explicitBranchQuestions = branchCandidateQuestions.filter((question) =>
    readBusinessTypes(question.answerSchema).includes(businessType)
  );
  const shouldFallbackToOnlineSet = businessType === "offline" && explicitBranchQuestions.length === 0;

  const resolvedBranchQuestions = branchCandidateQuestions.filter((question) => {
    const supportedBusinessTypes = readBusinessTypes(question.answerSchema);

    if (supportedBusinessTypes.length > 0) {
      return supportedBusinessTypes.includes(businessType);
    }

    if (businessType === "online") {
      return true;
    }

    return shouldFallbackToOnlineSet;
  });

  return [businessTypeQuestion, ...resolvedBranchQuestions];
}
