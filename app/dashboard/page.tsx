import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login");
  }

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-300">Dashboard</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">로그인에 성공했습니다.</h1>
        <p className="mt-4 text-slate-300">
          현재 로그인한 이메일은 <span className="font-medium text-white">{user.email}</span> 입니다.
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-7 text-slate-300">
          이제 이 영역에 사용자별 진단 세션, 결과 리포트, 설정 화면을 이어서 붙일 수 있습니다.
        </div>
        <div className="mt-8">
          <Link
            className="rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-400"
            href="/"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </Container>
  );
}
