import { apiRequest } from "@/lib/http";

import {
  automationListSchema,
  type Automation,
} from "@/features/automations/schemas/automation";

/**
 * As automações da organização ativa. Sem paginação nem filtro no servidor
 * (decisão 11 da spec): a lista já sabe filtrar, buscar e ordenar no cliente.
 */
export async function listAutomations(): Promise<Automation[]> {
  return automationListSchema.parse(await apiRequest("/api/automations"));
}
