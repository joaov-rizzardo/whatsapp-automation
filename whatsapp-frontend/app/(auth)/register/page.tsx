import Link from "next/link";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { AuthDivider } from "@/features/auth/components/AuthDivider";
import { GoogleAuthAction } from "@/features/auth/components/GoogleAuthAction";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Criar conta"
      description="Comece a automatizar o WhatsApp da sua empresa em minutos."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium">
            Entrar
          </Link>
        </p>
      }
    >
      <RegisterForm />
      <AuthDivider />
      <GoogleAuthAction label="Criar conta com Google" />
    </AuthCard>
  );
}
