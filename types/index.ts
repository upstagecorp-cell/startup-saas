export type AppUserRole = "founder" | "team_admin" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: AppUserRole;
  createdAt: string;
}

export interface DiagnosisSession {
  id: string;
  ownerId: string;
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisIssueCause {
  issueId: string;
  causeKey: string;
  title: string;
  description: string | null;
  confidenceScore: number | null;
  sortOrder: number;
}

export interface DiagnosisIssue {
  id: string;
  dimensionKey: string | null;
  issueKey: string;
  title: string;
  description: string | null;
  severity: string | null;
  priority: string | null;
  scoreImpact: number | null;
  rootCause: string | null;
  sortOrder: number;
  causes: DiagnosisIssueCause[];
}

export interface DiagnosisRecommendation {
  id: string;
  issueId: string | null;
  issueKey: string | null;
  causeKey: string | null;
  recommendationType: string;
  title: string;
  description: string | null;
  rationale: string | null;
  priority: string | null;
  expectedImpact: string | null;
  effortLevel: string | null;
}

export type ResultActionStatus = "todo" | "doing" | "done";

export interface ResultAction {
  id: string;
  resultId: string;
  recommendationId: string | null;
  causeKey: string | null;
  title: string;
  description: string | null;
  status: ResultActionStatus;
  priority: string | null;
  dueDate: string | null;
  note: string | null;
  evidenceUrl: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ResultActionFeedbackSummary {
  total: number;
  todo: number;
  doing: number;
  done: number;
  completionRate: number;
  noteCount: number;
  evidenceCount: number;
  recordedActionCount: number;
  recentCompletedActions: Array<{
    id: string;
    title: string;
    completedAt: string | null;
    hasNote: boolean;
    hasEvidence: boolean;
  }>;
  shouldShowRediagnosisCta: boolean;
}

export interface DiagnosisResultComparisonContext {
  currentResultId: string;
  previousResultId: string | null;
  currentSessionId: string;
  previousSessionId: string | null;
  recentResults: Array<{
    resultId: string;
    sessionId: string;
    overallScore: number | null;
    riskLevel: string | null;
    createdAt: string;
  }>;
}

export type DiagnosisScoreChange = "improved" | "unchanged" | "declined";

export interface DiagnosisDimensionComparison {
  dimensionKey: string;
  dimensionName: string;
  currentScore: number | null;
  previousScore: number | null;
  scoreDiff: number | null;
  currentStatus: string | null;
  previousStatus: string | null;
  change: DiagnosisScoreChange;
}

export interface DiagnosisResultComparison {
  currentResultId: string;
  previousResultId: string;
  currentSessionId: string;
  previousSessionId: string;
  currentOverallScore: number | null;
  previousOverallScore: number | null;
  overallScoreDiff: number | null;
  currentOverallStatus: string | null;
  previousOverallStatus: string | null;
  overallChange: DiagnosisScoreChange;
  dimensions: DiagnosisDimensionComparison[];
  improvedDimensions: DiagnosisDimensionComparison[];
  unchangedDimensions: DiagnosisDimensionComparison[];
  declinedDimensions: DiagnosisDimensionComparison[];
}
