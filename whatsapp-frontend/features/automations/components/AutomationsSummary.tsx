import { cn } from "@/lib/utils";

import { automationStatusMeta } from "../lib/automationStatus";
import { formatCount } from "../lib/formatNumber";
import type { AutomationsSummaryData } from "../lib/summarizeAutomations";

function SummaryTile({
  value,
  label,
  dotClass,
}: {
  value: string;
  label: string;
  dotClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
      <span className="font-heading text-2xl font-semibold tabular-nums">{value}</span>
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {dotClass && <span className={cn("size-1.5 shrink-0 rounded-full", dotClass)} />}
        {label}
      </span>
    </div>
  );
}

/**
 * A leitura de painel do topo: quantas automações estão de pé e quanta conversa
 * elas geraram. Tiles neutros de propósito — a ênfase da tela é o botão primário.
 */
export function AutomationsSummary({ summary }: { summary: AutomationsSummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryTile
        value={formatCount(summary.active)}
        label={summary.active === 1 ? "ativa" : "ativas"}
        dotClass={automationStatusMeta.active.dotClass}
      />
      <SummaryTile
        value={formatCount(summary.paused)}
        label={summary.paused === 1 ? "pausada" : "pausadas"}
        dotClass={automationStatusMeta.paused.dotClass}
      />
      <SummaryTile
        value={formatCount(summary.draft)}
        label={summary.draft === 1 ? "rascunho" : "rascunhos"}
        dotClass={automationStatusMeta.draft.dotClass}
      />
      <SummaryTile
        value={formatCount(summary.conversations)}
        label="conversas · últimos 7 dias"
      />
    </div>
  );
}
