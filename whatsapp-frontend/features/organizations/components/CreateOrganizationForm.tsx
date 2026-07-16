"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateOrganization } from "@/features/organizations/hooks/useCreateOrganization";

export function CreateOrganizationForm() {
  const { register, onSubmit, errors, isSubmitting } = useCreateOrganization();

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome da organização</Label>
        <Input
          id="name"
          autoComplete="organization"
          placeholder="Minha Empresa"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <span className="text-sm text-destructive">{errors.name.message}</span>
        )}
      </div>

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Criando organização..." : "Criar organização"}
      </Button>
    </form>
  );
}
