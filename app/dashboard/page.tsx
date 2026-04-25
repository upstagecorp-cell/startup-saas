import { redirect } from "next/navigation";

import { createDiagnosisSession } from "@/app/dashboard/actions";
import { DiagnosisFlow } from "@/components/dashboard/diagnosis-flow";
import { DiagnosisResult } from "@/components/dashboard/diagnosis-result";
import { Container } from "@/components/ui/container";
import { resolveBusinessTypeFromAnswers, resolveDiagnosisQuestions } from "@/lib/diagnosis/question-flow";
import { getDiagnosisResult } from "@/lib/diagnosis/results";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_ACTION_LIMIT, FREE_DIAGNOSIS_LIMIT } from "@/lib/usage-limits";

type SearchParams = Promise<{ session?: string }>;

export default async function DashboardPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
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

  const { session: sessionId } = await searchParams;
  const { count: diagnosisCount, error: diagnosisCountError } = await supabase
    .from("diagnosis_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (diagnosisCountError) {
    throw new Error("Diagnosis usage could not be loaded.");
  }

  const { count: activeActionCount, error: activeActionCountError } = await supabase
    .from("result_actions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "todo");

  if (activeActionCountError) {
    throw new Error("Action usage could not be loaded.");
  }

  const usageGate = {
    diagnosisCount: diagnosisCount ?? 0,
    diagnosisLimit: FREE_DIAGNOSIS_LIMIT,
    actionCount: activeActionCount ?? 0,
    actionLimit: FREE_ACTION_LIMIT,
    isDiagnosisLimitReached: (diagnosisCount ?? 0) >= FREE_DIAGNOSIS_LIMIT,
    isActionLimitReached: (activeActionCount ?? 0) >= FREE_ACTION_LIMIT
  };

  const { data: activeTemplate, error: templateError } = await supabase
    .from("diagnosis_templates")
    .select("id, name, version")
    .eq("code", "founder_diagnosis")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (templateError || !activeTemplate) {
    throw new Error("진단 템플릿을 불러오지 못했습니다.");
  }

  let diagnosisSession:
    | {
        id: string;
        status: "draft" | "in_progress" | "completed" | "archived";
        session_number: number;
      }
    | null = null;

  if (sessionId) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("diagnosis_sessions")
      .select("id, status, session_number")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError) {
      redirect("/dashboard");
    }

    diagnosisSession = sessionData;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("diagnosis_template_sections")
    .select("id, title, sort_order")
    .eq("template_id", activeTemplate.id)
    .order("sort_order", { ascending: true });

  if (sectionsError) {
    throw new Error("진단 섹션을 불러오지 못했습니다.");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("diagnosis_questions")
    .select("id, section_id, question_code, question_text, question_type, help_text, answer_schema, sort_order")
    .eq("template_id", activeTemplate.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (questionsError) {
    throw new Error("진단 질문을 불러오지 못했습니다.");
  }

  const sectionTitleById = new Map(sections.map((section) => [section.id, section.title]));

  const orderedQuestions = questions
    .slice()
    .sort((left, right) => {
      if (left.question_code === "business_type") {
        return -1;
      }

      if (right.question_code === "business_type") {
        return 1;
      }

      const leftSection = sections.find((section) => section.id === left.section_id)?.sort_order ?? 0;
      const rightSection = sections.find((section) => section.id === right.section_id)?.sort_order ?? 0;

      if (leftSection !== rightSection) {
        return leftSection - rightSection;
      }

      return left.sort_order - right.sort_order;
    })
    .map((question) => ({
      id: question.id,
      questionCode: question.question_code,
      questionText: question.question_text,
      questionType: question.question_type,
      helpText: question.help_text,
      answerSchema:
        question.answer_schema && typeof question.answer_schema === "object" ? question.answer_schema : null,
      sectionTitle: sectionTitleById.get(question.section_id ?? "") ?? "진단"
    }));

  const { data: answers, error: answersError } = diagnosisSession
    ? await supabase
        .from("diagnosis_answers")
        .select("question_id, answer_text, answer_number, answer_boolean")
        .eq("session_id", diagnosisSession.id)
        .eq("user_id", user.id)
    : { data: [], error: null };

  if (answersError) {
    throw new Error("기존 답변을 불러오지 못했습니다.");
  }

  const businessType = resolveBusinessTypeFromAnswers(
    questions.map((question) => ({
      id: question.id,
      questionCode: question.question_code,
      answerSchema:
        question.answer_schema && typeof question.answer_schema === "object" ? question.answer_schema : null
    })),
    new Map(
      (answers ?? []).map((answer) => [
        answer.question_id,
        {
          questionId: answer.question_id,
          answerText: answer.answer_text
        }
      ])
    )
  );
  const visibleQuestionIds = new Set(
    resolveDiagnosisQuestions(
      orderedQuestions.map((question) => ({
        id: question.id,
        questionCode: question.questionCode,
        answerSchema: question.answerSchema
      })),
      businessType
    ).map((question) => question.id)
  );
  const filteredOrderedQuestions = orderedQuestions.filter((question) => visibleQuestionIds.has(question.id));

  const diagnosisResult =
    diagnosisSession?.status === "completed" ? await getDiagnosisResult(diagnosisSession.id) : null;

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">대시보드</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">창업 진단을 시작할 준비가 되었습니다.</h1>
        <p className="mt-4 text-slate-300">
          현재 로그인한 이메일은 <span className="font-medium text-white">{user.email}</span>입니다.
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-7 text-slate-300">
          진단 템플릿 <span className="font-medium text-white">{activeTemplate.name}</span> v
          {activeTemplate.version}을 기준으로 질문을 순서대로 진행합니다.
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        {diagnosisSession ? (
          diagnosisSession.status === "completed" && diagnosisResult ? (
            <DiagnosisResult diagnosisResult={diagnosisResult} usageGate={usageGate} />
          ) : (
            <DiagnosisFlow
              answers={
                answers?.map((answer) => ({
                  questionId: answer.question_id,
                  answerText: answer.answer_text,
                  answerNumber: answer.answer_number,
                  answerBoolean: answer.answer_boolean
                })) ?? []
              }
              initialStatus={diagnosisSession.status}
              questions={filteredOrderedQuestions}
              sessionId={diagnosisSession.id}
            />
          )
        ) : (
          <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">진단 시작</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">새 진단 세션을 시작하세요.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              버튼을 누르면 새 진단 세션을 생성하고, 질문을 한 개씩 표시합니다.
            </p>
            {usageGate.isDiagnosisLimitReached ? (
              <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                <p className="text-sm font-semibold text-amber-100">Upgrade required</p>
                <p className="mt-2 text-sm leading-6 text-amber-50">
                  Free users can run {usageGate.diagnosisLimit} diagnosis. Upgrade to start another diagnosis.
                </p>
                <button
                  className="mt-4 rounded-full bg-amber-400 px-5 py-3 text-sm font-medium text-slate-950"
                  type="button"
                >
                  Upgrade
                </button>
              </div>
            ) : (
              <form action={createDiagnosisSession} className="mt-8">
                <button
                  className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400"
                  type="submit"
                >
                  진단 시작
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
