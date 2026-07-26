import type { Automation, AutomationStatus } from "../types/automation";

export type AutomationsSummaryData = {
  active: number;
  paused: number;
  draft: number;
  /** Soma das conversas iniciadas nos últimos 7 dias. */
  conversations: number;
};

export function summarizeAutomations(automations: Automation[]): AutomationsSummaryData {
  const byStatus = (status: AutomationStatus) =>
    automations.filter((automation) => automation.status === status).length;

  return {
    active: byStatus("active"),
    paused: byStatus("paused"),
    draft: byStatus("draft"),
    conversations: automations.reduce((total, item) => total + item.conversations, 0),
  };
}
