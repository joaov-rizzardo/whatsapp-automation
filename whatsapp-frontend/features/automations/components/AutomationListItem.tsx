"use client";

import Link from "next/link";
import { TriangleAlert, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { canActivate, describeTrigger } from "@/lib/describeTrigger";

import { automationStatusMeta } from "../lib/automationStatus";
import { formatCount, formatPercent } from "../lib/formatNumber";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import type { Automation } from "../types/automation";
import { AutomationRowActions } from "./AutomationRowActions";

/**
 * A linha da lista. O nome é o link e ele cobre a linha inteira via `after`, de
 * forma que clicar em qualquer lugar abre o editor — menos no switch e no menu,
 * que ficam acima do overlay.
 *
 * As datas relativas trazem `suppressHydrationWarning` porque os dados mockados
 * nascem de `Date.now()` no servidor e de novo no cliente; sai junto com o mock.
 */
export function AutomationListItem({
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
  const status = automationStatusMeta[automation.status];
  const missingTrigger = !canActivate(automation.trigger);
  const updatedAt = formatRelativeTime(automation.updatedAt);
  const hasMetrics = automation.completionRate !== null;

  return (
    <li className="relative flex flex-col gap-3 px-4 py-4 transition-colors duration-fast ease-standard hover:bg-muted/40 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-primary">
          <Workflow className="size-4" />
        </span>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/automacoes/${automation.id}/editor`}
              className="rounded-sm font-heading text-base font-semibold transition-colors duration-fast ease-standard after:absolute after:inset-0 hover:text-primary focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none"
            >
              {automation.name}
            </Link>
            <Badge variant={status.badge} dot>
              {status.label}
            </Badge>
          </div>

          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            {missingTrigger && (
              <TriangleAlert className="size-3.5 shrink-0 text-warning" aria-hidden />
            )}
            {missingTrigger ? (
              // O gatilho é definido no bloco de início: o aviso leva até lá.
              <Link
                href={`/automacoes/${automation.id}/editor`}
                aria-label={`Definir gatilho de ${automation.name}`}
                className="relative z-10 truncate rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none"
              >
                Definir gatilho
              </Link>
            ) : (
              <span className="truncate">{describeTrigger(automation.trigger)}</span>
            )}
            <span aria-hidden>·</span>
            <span className="shrink-0">
              {automation.blockCount} {automation.blockCount === 1 ? "bloco" : "blocos"}
            </span>
          </p>

          {/* No mobile as métricas viram uma linha só, no rodapé do cartão. */}
          <p className="text-xs text-muted-foreground md:hidden" suppressHydrationWarning>
            {hasMetrics && `${formatCount(automation.conversations)} conversas · `}
            editada {updatedAt}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 pl-12 lg:gap-6 lg:pl-0">
        <div className="hidden w-40 shrink-0 flex-col items-end lg:flex">
          {hasMetrics ? (
            <>
              <span className="text-sm font-semibold tabular-nums">
                {formatCount(automation.conversations)} conversas
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatPercent(automation.completionRate ?? 0)} concluíram
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Ainda sem execuções</span>
          )}
        </div>

        <span
          className="hidden shrink-0 text-sm text-muted-foreground md:inline lg:w-28 lg:text-right"
          suppressHydrationWarning
        >
          {updatedAt}
        </span>

        <AutomationRowActions
          automation={automation}
          onToggleActive={onToggleActive}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}
