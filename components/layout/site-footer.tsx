import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8">
      <Container className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>Startup SaaS starter structure for a launch-ready AI product.</p>
        <p>Prepared for App Router, TypeScript, Tailwind CSS, and future Supabase auth.</p>
      </Container>
    </footer>
  );
}
