import type {
  Automation,
  AutomationSort,
  AutomationStatusFilter,
} from "../types/automation";

export type AutomationListFilters = {
  status: AutomationStatusFilter;
  search: string;
  sort: AutomationSort;
};

const comparators: Record<AutomationSort, (a: Automation, b: Automation) => number> = {
  recent: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
};

/** Busca sem acento e sem caixa — "satisfacao" acha "Pesquisa de satisfação". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filterAutomations(
  automations: Automation[],
  { status, search, sort }: AutomationListFilters,
): Automation[] {
  const term = normalize(search);

  return automations
    .filter((automation) => status === "all" || automation.status === status)
    .filter((automation) => term === "" || normalize(automation.name).includes(term))
    .sort(comparators[sort]);
}
