"use client";

import { Check, CircleAlert, Loader2, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/features/automations/lib/formatRelativeTime";
import type { FlowSaveState } from "@/features/flows/hooks/useFlowAutosave";

/**
 * O indicador de salvamento, na barra do editor. Existe pela mesma razão que o
 * botão Salvar: autosave sem retorno visível deixa o usuário sem saber se pode
 * fechar a aba.
 */
export function SaveStatus({
  state,
  onRetry,
}: {
  state: FlowSaveState;
  onRetry: () => void;
}) {
  if (state.status === "saving") {
    return (
      <Indicator>
        <Loader2 className="size-3.5 animate-spin" />
        Salvando…
      </Indicator>
    );
  }

  if (state.status === "error") {
    return (
      <Indicator className="text-danger">
        <CircleAlert className="size-3.5" />
        Erro ao salvar
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-auto px-1.5 py-0.5 text-xs"
        >
          Tentar novamente
        </Button>
      </Indicator>
    );
  }

  if (state.status === "dirty") {
    return (
      <Indicator>
        <PencilLine className="size-3.5" />
        Alterações não salvas
      </Indicator>
    );
  }

  return (
    <Indicator>
      <Check className="size-3.5 text-success" />
      {state.savedAt ? `Salvo ${formatRelativeTime(state.savedAt.toISOString())}` : "Salvo"}
    </Indicator>
  );
}

function Indicator({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
      aria-live="polite"
    >
      {children}
    </span>
  );
}
