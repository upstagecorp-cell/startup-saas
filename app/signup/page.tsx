import { AuthForm } from "@/components/auth/auth-form";
import { Container } from "@/components/ui/container";

export default function SignupPage() {
  return (
    <Container className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-16">
      <AuthForm mode="signup" />
    </Container>
  );
}
