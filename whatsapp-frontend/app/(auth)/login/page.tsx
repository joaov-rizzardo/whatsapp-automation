import Link from "next/link";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthDivider } from "@/features/auth/components/AuthDivider";
import { GoogleAuthButton } from "@/features/auth/components/GoogleAuthButton";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta para gerenciar suas automações."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link href="/register" className="font-medium">
            Criar conta
          </Link>
        </p>
      }
    >
      <LoginForm />
      <AuthDivider />
      <GoogleAuthButton label="Entrar com Google" />
    </AuthCard>
  );
}
