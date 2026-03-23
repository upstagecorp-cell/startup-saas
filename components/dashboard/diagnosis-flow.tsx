"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitDiagnosisAnswer } from "@/app/dashboard/actions";

type SupportedQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "short_text"
  | "long_text"
  | "number"
  | "boolean"
  | "scale";

interface DiagnosisQuestion {
  id: string;
  questionCode: string;
  questionText: string;
  questionType: SupportedQuestionType;
  helpText: string | null;
  answerSchema: {
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ value: string; label: string }>;
  } | null;
  sectionTitle: string;
}

interface DiagnosisAnswer {
  questionId: string;
  answerText: string | null;
  answerNumber: number | null;
  answerBoolean: boolean | null;
}

interface DiagnosisFlowProps {
  sessionId: string;
  initialStatus: "draft" | "in_progress" | "completed" | "archived";
  questions: DiagnosisQuestion[];
  answers: DiagnosisAnswer[];
}

function getInitialValue(question: DiagnosisQuestion, answer?: DiagnosisAnswer) {
  if (!answer) {
    return "";
  }

  if (question.questionType === "boolean") {
    return answer.answerBoolean === null ? "" : String(answer.answerBoolean);
  }

  if (question.questionType === "number" || question.questionType === "scale") {
    return answer.answerNumber === null ? "" : String(answer.answerNumber);
  }

  return answer.answerText ?? "";
}

function getInitialIndex(questions: DiagnosisQuestion[], answersByQuestionId: Map<string, DiagnosisAnswer>) {
  const firstUnansweredIndex = questions.findIndex((question) => {
    const answer = answersByQuestionId.get(question.id);

    if (!answer) {
      return true;
    }

    if (question.questionType === "boolean") {
      return answer.answerBoolean === null;
    }

    if (question.questionType === "number" || question.questionType === "scale") {
      return answer.answerNumber === null;
    }

    return !answer.answerText;
  });

  return firstUnansweredIndex === -1 ? questions.length - 1 : firstUnansweredIndex;
}

export function DiagnosisFlow({
  sessionId,
  initialStatus,
  questions,
  answers
}: DiagnosisFlowProps) {
  const router = useRouter();
  const [savedAnswers, setSavedAnswers] = useState(() => new Map(answers.map((answer) => [answer.questionId, answer])));
  const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(questions, savedAnswers));
  const [value, setValue] = useState(() => {
    const currentQuestion = questions[getInitialIndex(questions, savedAnswers)];
    return currentQuestion ? getInitialValue(currentQuestion, savedAnswers.get(currentQuestion.id)) : "";
  });
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = questions[currentIndex];
  const progress = questions.length === 0 ? 0 : Math.round(((currentIndex + 1) / questions.length) * 100);

  function moveToQuestion(nextIndex: number) {
    setCurrentIndex(nextIndex);
    setValue(getInitialValue(questions[nextIndex], savedAnswers.get(questions[nextIndex].id)));
    setError(null);
  }

  function handleSubmit() {
    if (!currentQuestion) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitDiagnosisAnswer({
          sessionId,
          questionId: currentQuestion.id,
          questionType: currentQuestion.questionType,
          value
        });

        const nextAnswers = new Map(savedAnswers);
        nextAnswers.set(currentQuestion.id, {
          questionId: currentQuestion.id,
          answerText:
            currentQuestion.questionType === "boolean" ||
            currentQuestion.questionType === "number" ||
            currentQuestion.questionType === "scale"
              ? null
              : value,
          answerNumber:
            currentQuestion.questionType === "number" || currentQuestion.questionType === "scale"
              ? Number(value)
              : null,
          answerBoolean: currentQuestion.questionType === "boolean" ? value === "true" : null
        });
        setSavedAnswers(nextAnswers);

        if (result.completed) {
          setStatus("completed");
          router.refresh();
          return;
        }

        const nextIndex = Math.min(currentIndex + 1, questions.length - 1);
        moveToQuestion(nextIndex);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "답변 저장 중 오류가 발생했습니다.");
      }
    });
  }

  if (!currentQuestion || status === "completed") {
    return (
      <div className="rounded-[32px] border border-emerald-400/20 bg-emerald-500/10 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Diagnosis Complete</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">진단이 완료되었습니다.</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          모든 질문에 답변이 저장되었습니다. 이제 결과 분석과 액션 추천 단계를 연결할 수 있습니다.
        </p>
        <button
          className="mt-8 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          onClick={() => router.push("/dashboard")}
          type="button"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">
            {currentQuestion.sectionTitle}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            질문 {currentIndex + 1} / {questions.length}
          </h2>
        </div>
        <div className="w-full max-w-xs">
          <div className="h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-brand-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-right text-xs text-slate-400">{progress}% 진행</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
        <p className="text-lg font-medium leading-8 text-white">{currentQuestion.questionText}</p>
        {currentQuestion.helpText ? (
          <p className="mt-3 text-sm leading-7 text-slate-400">{currentQuestion.helpText}</p>
        ) : null}

        <div className="mt-6">
          {currentQuestion.questionType === "boolean" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "예", value: "true" },
                { label: "아니오", value: "false" }
              ].map((option) => (
                <button
                  key={option.value}
                  className={`rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                    value === option.value
                      ? "border-brand-400 bg-brand-500/20 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                  }`}
                  onClick={() => setValue(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : currentQuestion.answerSchema?.options?.length ? (
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              onChange={(event) => setValue(event.target.value)}
              value={value}
            >
              <option value="">선택해 주세요</option>
              {currentQuestion.answerSchema.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : currentQuestion.questionType === "number" || currentQuestion.questionType === "scale" ? (
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              max={currentQuestion.answerSchema?.max}
              min={currentQuestion.answerSchema?.min}
              onChange={(event) => setValue(event.target.value)}
              step={currentQuestion.answerSchema?.step ?? 1}
              type="number"
              value={value}
            />
          ) : currentQuestion.questionType === "long_text" ? (
            <textarea
              className="min-h-36 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          ) : (
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
              onChange={(event) => setValue(event.target.value)}
              type="text"
              value={value}
            />
          )}
        </div>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentIndex === 0 || isPending}
          onClick={() => moveToQuestion(currentIndex - 1)}
          type="button"
        >
          이전 질문
        </button>

        <button
          className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending || value.trim().length === 0}
          onClick={handleSubmit}
          type="button"
        >
          {isPending ? "저장 중..." : currentIndex === questions.length - 1 ? "진단 완료" : "다음 질문"}
        </button>
      </div>
    </div>
  );
}
