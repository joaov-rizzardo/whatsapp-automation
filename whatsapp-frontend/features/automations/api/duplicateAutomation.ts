import { apiRequest } from "@/lib/http";

import {
  automationSchema,
  type Automation,
} from "@/features/automations/schemas/automation";

/** A cópia leva o desenho do fluxo e nasce rascunho, inativa. */
export async function duplicateAutomation(id: string): Promise<Automation> {
  return automationSchema.parse(
    await apiRequest(`/api/automations/${id}/duplicate`, { method: "POST" }),
  );
}
