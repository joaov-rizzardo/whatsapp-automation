import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { isOperatorValid, getOperator } from "../operators.js";
import { comparisonValueSchema } from "../value-schemas.js";

const conditionDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["logic", "comparisons"],
  properties: {
    logic: { type: "string", enum: ["and", "or"] },
    comparisons: {
      type: "array",
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "variableId", "operator", "right"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 120 },
          variableId: { type: ["string", "null"], maxLength: 120 },
          operator: { type: "string", minLength: 1, maxLength: 40 },
          right: comparisonValueSchema,
        },
      },
    },
  },
} as const;

export type ConditionData = FromSchema<typeof conditionDataSchema>;

export const conditionBlock = defineBlock<ConditionData>({
  type: "condition",
  dataSchema: conditionDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["true", "false"] }),
  validate: (data, { variables }) => {
    if (data.comparisons.length === 0) return "Adicione ao menos uma condição";

    for (const comparison of data.comparisons) {
      const variable = variables.find(
        (item) => item.id === comparison.variableId,
      );
      if (!variable) return "Uma condição aponta para variável inexistente";

      if (!isOperatorValid(variable.type, comparison.operator)) {
        return `O operador não vale para ${variable.name}`;
      }

      // Operador unário (`está vazio`, `é verdadeiro`) não tem lado direito —
      // a tela nem mostra o campo, então cobrá-lo aqui travaria a publicação
      // de um fluxo correto.
      if (getOperator(variable.type, comparison.operator)?.unary) continue;

      if (comparison.right.kind === "variable" && !comparison.right.variableId) {
        return "Uma condição está sem valor de comparação";
      }
    }

    return null;
  },
});
