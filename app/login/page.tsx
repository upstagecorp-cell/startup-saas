import { Container } from "@/components/ui/container";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <Container className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-16">
      <AuthForm mode="login" />
    </Container>
  );
}
