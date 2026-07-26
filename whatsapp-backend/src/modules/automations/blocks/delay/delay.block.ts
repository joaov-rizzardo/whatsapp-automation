import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
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
  validate: (data) =>
    data.duration.value <= 0 ? "Defina o tempo de espera" : null,
});
