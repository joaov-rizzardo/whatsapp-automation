import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { extractVariableNames } from "../interpolation.js";

const textDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "typingSeconds"],
  properties: {
    text: { type: "string", maxLength: 4096 },
    /** Segundos de "digitando…" antes da mensagem sair. 0 desliga. */
    typingSeconds: { type: "number", minimum: 0, maximum: 60 },
  },
} as const;

export type TextData = FromSchema<typeof textDataSchema>;

export const textBlock = defineBlock<TextData>({
  type: "text",
  dataSchema: textDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["out"] }),
  execute: async (data, ctx) => {
    await ctx.send.text(ctx.variables.render(data.text), {
      typingSeconds: data.typingSeconds,
    });
    return { kind: "next", handle: "out" };
  },
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
