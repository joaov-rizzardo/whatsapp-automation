import { apiRequest } from "@/lib/http";

import {
  flowResponseSchema,
  type FlowResponse,
} from "@/features/flows/schemas/flowDocument";

/** O que o editor carrega: documento, versão do rascunho e a automação. */
export async function getFlow(automationId: string): Promise<FlowResponse> {
  return flowResponseSchema.parse(
    await apiRequest(`/api/automations/${automationId}/flow`),
  );
}
