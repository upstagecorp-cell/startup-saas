import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { Container } from "@/components/ui/container";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navItems = [{ href: "#workflow", label: "작동 방식" }];

export async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-white">
          Startup SaaS
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                href="/dashboard"
              >
                대시보드
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                href="/login"
              >
                로그인
              </Link>
              <Link
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400"
                href="/signup"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
