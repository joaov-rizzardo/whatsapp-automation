"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Busca ou filtro sem resultado — nunca uma área em branco: o caminho de volta
 * fica junto da mensagem.
 */
export function AutomationsNoResults({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Search className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-heading text-base font-semibold">
          Nenhuma automação encontrada
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tente outro nome ou volte para todas as automações.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onClearFilters}>
        Limpar filtros
      </Button>
    </div>
  );
}
