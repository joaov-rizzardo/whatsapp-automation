"use client";

import { Card } from "@/components/ui/card";

import type { Automation } from "../types/automation";
import { AutomationListItem } from "./AutomationListItem";
import { AutomationsNoResults } from "./AutomationsNoResults";

/**
 * A lista em si: linhas divididas dentro de um card único. O card perde o
 * padding vertical para as linhas encostarem nas bordas — é o que dá o
 * alinhamento de tabela sem virar uma planilha.
 */
export function AutomationList({
  automations,
  onToggleActive,
  onRename,
  onDuplicate,
  onDelete,
  onClearFilters,
}: {
  automations: Automation[];
  onToggleActive: (id: string, active: boolean) => void;
  onRename: (automation: Automation) => void;
  onDuplicate: (id: string) => void;
  onDelete: (automation: Automation) => void;
  onClearFilters: () => void;
}) {
  return (
    <Card className="gap-0 py-0">
      {automations.length === 0 ? (
        <AutomationsNoResults onClearFilters={onClearFilters} />
      ) : (
        <ul className="divide-y divide-border">
          {automations.map((automation) => (
            <AutomationListItem
              key={automation.id}
              automation={automation}
              onToggleActive={(active) => onToggleActive(automation.id, active)}
              onRename={() => onRename(automation)}
              onDuplicate={() => onDuplicate(automation.id)}
              onDelete={() => onDelete(automation)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
