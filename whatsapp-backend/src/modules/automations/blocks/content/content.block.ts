import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { extractVariableNames } from "../interpolation.js";

const contentDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "typingSeconds"],
  properties: {
    text: { type: "string", maxLength: 4096 },
    /** Segundos de "digitando…" antes da mensagem sair. 0 desliga. */
    typingSeconds: { type: "number", minimum: 0, maximum: 60 },
  },
} as const;

export type ContentData = FromSchema<typeof contentDataSchema>;

export const contentBlock = defineBlock<ContentData>({
  type: "content",
  dataSchema: contentDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["out"] }),
  // O único bloco que referencia variáveis por nome, então o único cuja
  // validação precisa das variáveis do sistema tanto quanto das do documento.
  validate: (data, { variables }) => {
    if (!data.text.trim()) return "Sem mensagem";

    const unknownName = extractVariableNames(data.text).find(
      (name) => !variables.some((variable) => variable.name === name),
    );
    if (unknownName) return `A variável {{${unknownName}}} não existe`;

    return null;
  },
});
