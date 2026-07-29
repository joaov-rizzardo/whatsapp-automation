import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";

/**
 * A âncora do fluxo, e a dona do **gatilho** — o que faz a conversa começar.
 * É daqui que a service deriva `automation.trigger` a cada salvamento, que é o
 * que faz o gatilho definido no editor aparecer na lista.
 *
 * O schema do gatilho mora neste arquivo, e não junto da automação, porque a
 * fonte da verdade é o nó de início; a coluna é uma cópia derivada dele.
 */
export const triggerSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "keywords"],
      properties: {
        kind: { const: "keyword" },
        keywords: {
          type: "array",
          maxItems: 50,
          items: { type: "string", minLength: 1, maxLength: 100 },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "anyMessage" } },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "firstContact" } },
    },
    /** Ainda não definido — salva, mas não publica. */
    {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: { kind: { const: "none" } },
    },
  ],
} as const;

export type AutomationTrigger = FromSchema<typeof triggerSchema>;

export const NO_TRIGGER: AutomationTrigger = { kind: "none" };

const startDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["trigger"],
  properties: { trigger: triggerSchema },
} as const;

export type StartData = FromSchema<typeof startDataSchema>;

export const startBlock = defineBlock<StartData>({
  type: "start",
  dataSchema: startDataSchema,
  handles: () => ({ inputs: [], outputs: ["out"] }),
  // A automação nasce com este bloco, então é o único que precisa saber criar
  // os próprios dados deste lado.
  createData: () => ({ trigger: NO_TRIGGER }),
  // A âncora não faz nada: quando o motor chega aqui, o gatilho já casou. Ela
  // existe para que "tem execute" e "é executável" continuem sendo a mesma
  // frase — sem isto, o nó de início seria a exceção da regra da publicação.
  execute: async () => ({ kind: "next", handle: "out" }),
  validate: (data) => {
    if (data.trigger.kind === "none") return "Defina o gatilho do fluxo";
    if (data.trigger.kind === "keyword" && data.trigger.keywords.length === 0) {
      return "Adicione ao menos uma palavra-chave";
    }
    return null;
  },
});
