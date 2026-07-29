import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { toMilliseconds } from "../duration.js";
import { durationSchema } from "../value-schemas.js";

const delayDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["duration"],
  properties: { duration: durationSchema },
} as const;

export type DelayData = FromSchema<typeof delayDataSchema>;

export const delayBlock = defineBlock<DelayData>({
  type: "delay",
  dataSchema: delayDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["out"] }),
  // Duas horas de espera não seguram processo nenhum: o bloco devolve a
  // intenção, e quem dorme é a fila (spec 008 §4.6).
  execute: async (data) => ({
    kind: "sleep",
    delayMs: toMilliseconds(data.duration),
    handle: "out",
  }),
  validate: (data) =>
    data.duration.value <= 0 ? "Defina o tempo de espera" : null,
});
