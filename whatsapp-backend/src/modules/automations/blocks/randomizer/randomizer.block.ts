import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";

const randomizerDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["branches"],
  properties: {
    branches: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "percentage"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 120 },
          label: { type: "string", maxLength: 60 },
          percentage: { type: "number", minimum: 0, maximum: 100 },
        },
      },
    },
  },
} as const;

export type RandomizerData = FromSchema<typeof randomizerDataSchema>;

/**
 * O bloco que prova o registry dos dois lados: as saídas vêm do *data*, não
 * deste arquivo. É por isso que `handles` é uma função — e é ela que valida o
 * `sourceHandle` das arestas de um randomizador de N saídas.
 */
export const randomizerBlock = defineBlock<RandomizerData>({
  type: "randomizer",
  dataSchema: randomizerDataSchema,
  handles: (data) => ({
    inputs: ["in"],
    outputs: data.branches.map((branch) => branch.id),
  }),
  validate: (data) => {
    const total = data.branches.reduce(
      (sum, branch) => sum + branch.percentage,
      0,
    );
    return total === 100 ? null : `As saídas somam ${total}%`;
  },

  /**
   * O sorteio acumulado, na ordem em que as saídas estão no `data` — que é a
   * ordem que o usuário vê na tela.
   *
   * `ctx.random()` e não `Math.random()` pelo mesmo motivo de `now()`: sem a
   * porta, o teste deste bloco vira estatística.
   */
  execute: async (data, ctx) => {
    const draw = ctx.random() * 100;
    let cumulative = 0;

    for (const branch of data.branches) {
      cumulative += branch.percentage;
      // `percentage > 0` na guarda: sem ele, uma saída de 0% ganharia o sorteio
      // de `draw === 0` — e 0% tem que significar 0%, ou o campo mente.
      if (branch.percentage > 0 && draw < cumulative) {
        return { kind: "next", handle: branch.id };
      }
    }

    // Só a sobra de ponto flutuante chega aqui: a publicação já exigiu soma 100,
    // mas três saídas de 33,3% somam 99,9 e deixam uma fresta no fim da faixa.
    const fallback = [...data.branches]
      .reverse()
      .find((branch) => branch.percentage > 0);

    return fallback ? { kind: "next", handle: fallback.id } : { kind: "end" };
  },
});
