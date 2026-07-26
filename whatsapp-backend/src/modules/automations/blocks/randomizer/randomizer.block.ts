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
});
