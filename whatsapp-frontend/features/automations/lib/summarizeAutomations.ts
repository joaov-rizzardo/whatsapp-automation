import type { Automation, AutomationStatus } from "../types/automation";

export type AutomationsSummaryData = {
  active: number;
  paused: number;
  draft: number;
  /** O total, que substituiu as conversas: métrica de verdade depende do motor. */
  total: number;
};

export function summarizeAutomations(automations: Automation[]): AutomationsSummaryData {
  const byStatus = (status: AutomationStatus) =>
    automations.filter((automation) => automation.status === status).length;

  return {
    active: byStatus("active"),
    paused: byStatus("paused"),
    draft: byStatus("draft"),
    total: automations.length,
  };
}
