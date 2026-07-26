import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { durationSchema } from "../value-schemas.js";

const waitReplyDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["variableId", "timeout"],
  properties: {
    /** null = a resposta é esperada, mas não é guardada em lugar nenhum. */
    variableId: { type: ["string", "null"], maxLength: 120 },
    timeout: durationSchema,
  },
} as const;

export type WaitReplyData = FromSchema<typeof waitReplyDataSchema>;

/**
 * As duas saídas são o bloco inteiro: são elas que deixam um fluxo reperguntar
 * ou desistir de um contato inativo.
 */
export const waitReplyBlock = defineBlock<WaitReplyData>({
  type: "waitReply",
  dataSchema: waitReplyDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["reply", "timeout"] }),
  validate: (data, { variables }) => {
    if (data.timeout.value <= 0) return "Defina o tempo máximo";
    if (
      data.variableId &&
      !variables.some((variable) => variable.id === data.variableId)
    ) {
      return "A variável de destino foi removida";
    }
    return null;
  },
});
