import { apiJsonBody, apiRequest } from "@/lib/http";

import {
  savedFlowSchema,
  type FlowDocument,
  type SavedFlow,
} from "@/features/flows/schemas/flowDocument";

/**
 * Salva o rascunho. `version` é a trava otimista: é a versão que este editor
 * carregou, e o servidor responde 409 FLOW_VERSION_CONFLICT se o rascunho já
 * avançou — nunca sobrescreve em silêncio.
 */
export async function saveFlowDraft(
  automationId: string,
  input: { version: number; document: FlowDocument },
): Promise<SavedFlow> {
  return savedFlowSchema.parse(
    await apiRequest(`/api/automations/${automationId}/flow`, {
      method: "PUT",
      body: apiJsonBody(input),
    }),
  );
}
