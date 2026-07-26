import type { AutomationTrigger } from "@/types/automationTrigger";

/**
 * Uma automação é a entidade de produto; o editor de fluxos edita o miolo dela.
 * Enquanto não existe API, este tipo é a fonte da verdade do formato — quando a
 * persistência chegar, ele passa a sair de um schema Zod da resposta.
 */

export type AutomationStatus = "active" | "paused" | "draft";

export type Automation = {
  id: string;
  name: string;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  blockCount: number;
  /** Conversas iniciadas pela automação nos últimos 7 dias. */
  conversations: number;
  /** Fração de 0 a 1, ou null quando a automação nunca rodou. */
  completionRate: number | null;
  updatedAt: string;
};

export type AutomationStatusFilter = AutomationStatus | "all";

export type AutomationSort = "recent" | "name" | "conversations";
