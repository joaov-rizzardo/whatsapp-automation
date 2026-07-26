"use client";

import { Plus, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Primeira visita: nenhuma automação existe ainda. Substitui resumo, filtros e
 * lista — aqui a tela tem um objetivo só, e ele é o botão.
 */
export function AutomationsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="items-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-subtle text-primary">
        <Workflow className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold">Nenhuma automação ainda</h2>
        <p className="mx-auto max-w-md text-muted-foreground">
          Crie um fluxo para responder seus contatos automaticamente, mesmo
          quando você não estiver no celular.
        </p>
      </div>
      <Button type="button" onClick={onCreate}>
        <Plus />
        Criar primeira automação
      </Button>
    </Card>
  );
}
