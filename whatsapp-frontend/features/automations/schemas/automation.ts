import { z } from "zod";

import { automationTriggerSchema } from "@/types/automationTrigger";

/**
 * A resposta da API — e, a partir daqui, a fonte da verdade do tipo
 * `Automation`. `status` e `hasUnpublishedChanges` chegam prontos: são
 * derivados no backend, o único lugar que sabe se existe versão publicada.
 */
export const automationSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["active", "paused", "draft"]),
  trigger: automationTriggerSchema,
  blockCount: z.number(),
  /** O rascunho está à frente do que está no ar. */
  hasUnpublishedChanges: z.boolean(),
  updatedAt: z.string(),
});

export const automationListSchema = z.array(automationSchema);

export type Automation = z.infer<typeof automationSchema>;
export type AutomationStatus = Automation["status"];
