"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";

export function RegisterForm() {
  const { register, onSubmit, errors, isSubmitting, acceptTerms } =
    useRegisterForm();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Seu nome"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <span className="text-sm text-destructive">{errors.name.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <span className="text-sm text-destructive">{errors.email.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <span className="text-sm text-destructive">
            {errors.password.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <span className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms.checked}
            onCheckedChange={acceptTerms.onCheckedChange}
            aria-invalid={!!errors.acceptTerms}
            className="mt-0.5"
          />
          <Label htmlFor="acceptTerms" className="font-normal text-muted-foreground">
            Aceito os termos de uso e a política de privacidade.
          </Label>
        </div>
        {errors.acceptTerms && (
          <span className="text-sm text-destructive">
            {errors.acceptTerms.message}
          </span>
        )}
      </div>

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
