import type { FromSchema } from "json-schema-to-ts";

import { defineBlock, type FlowValidationVariable } from "../block-definition.js";
import { evaluateComparison } from "../comparison/evaluate.js";
import { getOperator, type OperatorValueKind } from "../operators.js";
import { comparisonValueSchema, type ComparisonValue } from "../value-schemas.js";
import {
  isSpecialType,
  isValidSpecialValue,
  type SpecialVariableType,
} from "../variable-types.js";

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

      const operator = getOperator(variable.type, comparison.operator);
      if (!operator) return `O operador não vale para ${variable.name}`;

      // Operador sem lado direito (`está vazio`, `é fim de semana`): a tela nem
      // mostra o campo, então cobrá-lo aqui travaria a publicação de um fluxo
      // correto.
      if (operator.value === "none") continue;

      const problem = checkValue(variable, operator.value, comparison.right);
      if (problem) return problem;
    }

    return null;
  },

  /**
   * Ramificar é escolher uma saída, e é só isso: nenhum efeito, nenhuma espera.
   *
   * `every`/`some` sobre uma função (e não sobre um array já materializado) é o
   * curto-circuito de verdade — num `E` que já falhou, a segunda variável nem
   * chega a ser lida.
   *
   * `false` sem aresta encerra a execução, e isso é o `walk` que resolve: um
   * fluxo que só continua quando a condição bate é o desenho mais comum de
   * todos, não um erro.
   */
  execute: async (data, ctx) => {
    const matches = (comparison: ConditionData["comparisons"][number]): boolean => {
      if (!comparison.variableId) return false;

      return evaluateComparison({
        // A esquerda é quem define a pergunta: `"9" < "10"` é falso como texto
        // e verdadeiro como número, e é o tipo dela que decide qual das duas é.
        type: ctx.variables.typeOf(comparison.variableId),
        operator: comparison.operator,
        left: ctx.variables.get(comparison.variableId),
        right: comparison.right,
        resolve: (variableId) => ctx.variables.get(variableId),
      });
    };

    const matched =
      data.logic === "and"
        ? data.comparisons.every(matches)
        : data.comparisons.some(matches);

    return { kind: "next", handle: matched ? "true" : "false" };
  },
});

/**
 * O lado direito precisa ter a FORMA que o operador pede — um `entre` sem faixa
 * e um `é um dos` sem conjunto são a mesma falta de valor, e a tela mostra os
 * dois do mesmo jeito.
 *
 * Tipo especial só compara com valor fixo: nenhuma variável do fluxo pode ser
 * de hora ou de data, então uma referência ali só poderia apontar para um tipo
 * diferente.
 */
function checkValue(
  variable: FlowValidationVariable,
  expected: OperatorValueKind,
  right: ComparisonValue,
): string | null {
  const special = isSpecialType(variable.type) ? variable.type : null;

  if (special && right.kind === "variable") {
    return `${variable.name} só pode ser comparada com um valor fixo`;
  }

  const missing = "Uma condição está sem valor de comparação";

  if (expected === "single") {
    if (right.kind === "variable") {
      return right.variableId ? null : missing;
    }
    if (right.kind !== "literal") return missing;
    if (!special) return null;
    if (right.value === "") return missing;
    return checkFormat(variable.name, special, [right.value]);
  }

  if (expected === "range") {
    if (right.kind !== "range") return missing;
    if (right.from === "" || right.to === "") return missing;
    if (!special) return null;
    return checkFormat(variable.name, special, [right.from, right.to]);
  }

  if (right.kind !== "set") return missing;
  if (right.values.length === 0) return missing;
  if (!special) return null;
  return checkFormat(variable.name, special, right.values);
}

function checkFormat(
  name: string,
  type: SpecialVariableType,
  values: string[],
): string | null {
  for (const value of values) {
    if (!isValidSpecialValue(type, value)) {
      return `Valor inválido para ${name}: ${value}`;
    }
  }
  return null;
}
