import { apiRequest } from "@/lib/http";

import {
  publishedFlowSchema,
  type PublishedFlow,
} from "@/features/flows/schemas/flowDocument";

/**
 * Congela o rascunho numa versão imutável — a única que o motor vai ler.
 * Fluxo inválido volta 422 FLOW_INVALID com um problema por bloco; publicar
 * não ativa a automação.
 */
export async function publishFlow(automationId: string): Promise<PublishedFlow> {
  return publishedFlowSchema.parse(
    await apiRequest(`/api/automations/${automationId}/flow/publish`, {
      method: "POST",
    }),
  );
}
