import type { AutomationStatus, AutomationStatusFilter } from "../types/automation";

/**
 * Status vira rótulo e tom semântico num lugar só — a linha da lista, a faixa de
 * resumo e as abas leem daqui, então nenhuma tela inventa o próprio "Ativa".
 */
export type AutomationStatusMeta = {
  label: string;
  /** Variante do Badge — sempre um tom semântico, nunca uma cor solta. */
  badge: "success" | "warning" | "secondary";
  /** Cor do ponto na faixa de resumo. */
  dotClass: string;
};

export const automationStatusMeta: Record<AutomationStatus, AutomationStatusMeta> = {
  active: { label: "Ativa", badge: "success", dotClass: "bg-success" },
  paused: { label: "Pausada", badge: "warning", dotClass: "bg-warning" },
  draft: { label: "Rascunho", badge: "secondary", dotClass: "bg-muted-foreground" },
};

export const automationStatusFilters: { value: AutomationStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "paused", label: "Pausadas" },
  { value: "draft", label: "Rascunhos" },
];
