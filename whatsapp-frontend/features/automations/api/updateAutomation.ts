import { apiJsonBody, apiRequest } from "@/lib/http";

import {
  automationSchema,
  type Automation,
} from "@/features/automations/schemas/automation";

/** Renomear e ativar/pausar são a mesma rota. Ativar exige publicação — o
 *  backend responde 409 NOT_PUBLISHED quando não há. */
export async function updateAutomation(
  id: string,
  input: { name?: string; isActive?: boolean },
): Promise<Automation> {
  return automationSchema.parse(
    await apiRequest(`/api/automations/${id}`, {
      method: "PATCH",
      body: apiJsonBody(input),
    }),
  );
}
