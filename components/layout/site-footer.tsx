import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8">
      <Container className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>예비 창업자와 초기 창업자를 위한 AI 기반 실행 진단 플랫폼입니다.</p>
        <p>Next.js, TypeScript, Tailwind CSS, Supabase 기반으로 운영됩니다.</p>
      </Container>
    </footer>
  );
}
