import { apiJsonBody, apiRequest } from "@/lib/http";

import {
  automationSchema,
  type Automation,
} from "@/features/automations/schemas/automation";

/** Cria a automação **e** o rascunho com o bloco de início, do lado do servidor. */
export async function createAutomation(name: string): Promise<Automation> {
  return automationSchema.parse(
    await apiRequest("/api/automations", {
      method: "POST",
      body: apiJsonBody({ name }),
    }),
  );
}
