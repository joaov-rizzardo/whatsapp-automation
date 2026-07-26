"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Título da seção e a única ação primária da tela. O botão some quando não há
 * nenhuma automação — ali quem convida a criar é o estado vazio, e dois botões
 * primários na mesma tela quebram a regra de um acento só.
 */
export function AutomationsHeader({
  showCreateButton,
  onCreate,
}: {
  showCreateButton: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">Automações</h1>
        <p className="text-muted-foreground">
          Fluxos que respondem seus contatos automaticamente, 24 horas por dia.
        </p>
      </div>

      {showCreateButton && (
        <Button type="button" onClick={onCreate} fullWidth className="sm:w-auto">
          <Plus />
          Criar automação
        </Button>
      )}
    </div>
  );
}
