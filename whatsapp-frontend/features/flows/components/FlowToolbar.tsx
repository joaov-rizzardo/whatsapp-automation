"use client";

import Link from "next/link";
import { ArrowLeft, Save, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SaveStatus } from "@/features/flows/components/SaveStatus";
import type { FlowSaveState } from "@/features/flows/hooks/useFlowAutosave";

/**
 * A barra flutuante sobre o canvas: à esquerda o nome da automação (com a volta
 * para a lista) e o estado do salvamento; à direita salvar e publicar. O
 * wrapper é `pointer-events-none` para que arrastar o canvas continue
 * funcionando nos vãos entre as duas ilhas, que reativam os eventos.
 */
export function FlowToolbar({
  automationName,
  hasUnpublishedChanges,
  saveState,
  onSave,
  onPublish,
  isPublishing,
}: {
  automationName: string;
  hasUnpublishedChanges: boolean;
  saveState: FlowSaveState;
  onSave: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto flex max-w-[min(24rem,50vw)] items-center gap-2.5 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Voltar para automações"
            >
              <Link href="/automacoes">
                <ArrowLeft />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Voltar para automações</TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-heading text-sm font-semibold text-foreground">
            {automationName}
          </span>
          <SaveStatus state={saveState} onRetry={onSave} />
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={onSave} className="shadow-sm">
          <Save className="size-4" />
          Salvar
        </Button>

        <Button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="relative shadow-sm"
        >
          <Upload className="size-4" />
          Publicar
          {hasUnpublishedChanges && (
            // O ponto diz o que a lista também diz: o que está no ar não é o
            // que está na tela.
            <span
              aria-label="Há alterações não publicadas"
              className="absolute -top-1 -right-1 size-2.5 rounded-full bg-warning ring-2 ring-card"
            />
          )}
        </Button>
      </div>
    </div>
  );
}
