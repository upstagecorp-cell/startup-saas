"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

const formCopy = {
  login: {
    title: "로그인",
    description: "이메일과 비밀번호로 로그인하고 대시보드로 이동합니다.",
    submitLabel: "로그인",
    alternateHref: "/signup" as Route,
    alternateLabel: "회원가입",
    alternateText: "아직 계정이 없나요?"
  },
  signup: {
    title: "회원가입",
    description: "간단한 계정을 만들고 바로 진단을 시작할 수 있습니다.",
    submitLabel: "회원가입",
    alternateHref: "/login" as Route,
    alternateLabel: "로그인",
    alternateText: "이미 계정이 있나요?"
  }
} satisfies Record<
  AuthMode,
  {
    title: string;
    description: string;
    submitLabel: string;
    alternateHref: Route;
    alternateLabel: string;
    alternateText: string;
  }
>;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const copy = formCopy[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    let redirectPath: Route | null = null;

    if (!supabase) {
      setError("Supabase 환경 변수를 확인해 주세요.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "login") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          console.error("Login failed:", signInError.message);
          setError(signInError.message);
          return;
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();

        console.log("Login successful:", {
          userId: data.user?.id ?? null,
          userEmail: data.user?.email ?? email,
          hasUser: Boolean(data.user),
          hasSession: Boolean(data.session),
          currentSession: Boolean(session)
        });

        if (!data.user || !data.session || !session) {
          console.error("Login completed but session was not persisted correctly.");
          setError("로그인은 성공했지만 세션 저장에 실패했습니다. 다시 시도해 주세요.");
          return;
        }

        redirectPath = "/dashboard";
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        console.error("Signup failed:", signUpError.message);
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        console.log("Signup successful:", data.user?.id ?? email);
        redirectPath = "/dashboard";
        return;
      }

      console.log("Signup completed. Email confirmation required:", data.user?.id ?? email);
      setMessage("회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "요청 중 네트워크 오류가 발생했습니다.";

      if (mode === "login") {
        console.error("Login request threw an error:", caughtError);
      } else {
        console.error("Signup request threw an error:", caughtError);
      }

      setError(message);
    } finally {
      setIsSubmitting(false);

      if (redirectPath) {
        router.push(redirectPath);
        router.refresh();
      }
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">{copy.title}</h1>
        <p className="text-sm leading-6 text-slate-300">{copy.description}</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-slate-200">이메일</span>
          <input
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-200">비밀번호</span>
          <input
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-400"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

        <button
          className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "처리 중..." : copy.submitLabel}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-300">
        {copy.alternateText}{" "}
        <Link className="font-medium text-white underline underline-offset-4" href={copy.alternateHref}>
          {copy.alternateLabel}
        </Link>
      </p>
    </div>
  );
}
