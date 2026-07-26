"use client";

import Link from "next/link";
import {
  ChartColumn,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { canActivate } from "@/lib/describeTrigger";

import type { Automation } from "../types/automation";

/**
 * As ações da linha: ligar/desligar direto no switch (é o que mais se faz) e o
 * resto no menu. Fica acima do link que cobre a linha inteira — daí o `relative`
 * no contêiner.
 */
export function AutomationRowActions({
  automation,
  onToggleActive,
  onRename,
  onDuplicate,
  onDelete,
}: {
  automation: Automation;
  onToggleActive: (active: boolean) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isActive = automation.status === "active";
  const activatable = canActivate(automation.trigger);

  const switchHint = !activatable
    ? "Defina um gatilho para ativar"
    : isActive
      ? "Pausar automação"
      : "Ativar automação";

  return (
    <div className="relative z-10 flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          {/* O span mantém o alvo do tooltip quando o switch está desabilitado. */}
          <span className="flex items-center px-1">
            <Switch
              checked={isActive}
              disabled={!activatable}
              onCheckedChange={onToggleActive}
              aria-label={switchHint}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>{switchHint}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações de ${automation.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!activatable && (
            <DropdownMenuItem asChild>
              <Link href={`/automacoes/${automation.id}/editor`}>
                <Zap />
                Definir gatilho
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/automacoes/${automation.id}/editor`}>
              <Workflow />
              Editar fluxo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRename}>
            <Pencil />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <ChartColumn />
            Ver relatório
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
