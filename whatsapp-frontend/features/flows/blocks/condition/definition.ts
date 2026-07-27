import { Split } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { ConditionNode } from "@/features/flows/blocks/condition/ConditionNode";
import {
  ConditionModal,
  createComparison,
  type ConditionData,
} from "@/features/flows/blocks/condition/ConditionModal";
import { getOperator, type OperatorValueKind } from "@/features/flows/lib/operators";
import { isValidSpecialValue } from "@/features/flows/lib/specialValues";
import type { ComparisonValue } from "@/features/flows/types/comparisonValue";
import { isSpecialType, type FlowVariable } from "@/features/flows/types/variable";

export const conditionDefinition = defineBlock<ConditionData>({
  type: "condition",
  label: "Se",
  description: "Compara variáveis e ramifica",
  icon: Split,
  category: "logic",
  handles: {
    inputs: [{ id: "in" }],
    outputs: [
      { id: "true", label: "Verdadeiro" },
      { id: "false", label: "Falso" },
    ],
  },
  addable: true,
  singleton: false,
  createData: () => ({ logic: "and", comparisons: [createComparison()] }),
  node: ConditionNode,
  modal: ConditionModal,

  usedVariables: (data) =>
    data.comparisons
      .flatMap((comparison) => [
        comparison.variableId,
        comparison.right.kind === "variable" ? comparison.right.variableId : null,
      ])
      .filter((id): id is string => Boolean(id)),

  validate: (data, variables) => {
    if (data.comparisons.length === 0) return "Adicione ao menos uma condição";

    for (const comparison of data.comparisons) {
      const variable = variables.find(
        (item) => item.id === comparison.variableId,
      );
      if (!variable) return "Uma condição aponta para variável inexistente";

      const operator = getOperator(variable.type, comparison.operator);
      if (!operator) return `O operador não vale para ${variable.name}`;

      const problem = checkValue(variable, operator.value, comparison.right);
      if (problem) return problem;
    }

    return null;
  },
});

/**
 * The right-hand side has to have the SHAPE the operator asks for, and a
 * special value has to be readable as its type. Mirrors the backend's rule so
 * the badge on the node says exactly what Publicar would refuse.
 */
function checkValue(
  variable: FlowVariable,
  expected: OperatorValueKind,
  right: ComparisonValue,
): string | null {
  if (expected === "none") return null;

  const special = isSpecialType(variable.type) ? variable.type : null;
  const missing = "Uma condição está sem valor de comparação";
  const invalid = (value: string) => `Valor inválido para ${variable.name}: ${value}`;

  const checkAll = (values: string[]) => {
    if (!special) return null;
    const wrong = values.find((value) => !isValidSpecialValue(special, value));
    return wrong === undefined ? null : invalid(wrong);
  };

  if (expected === "single") {
    if (right.kind === "variable") {
      return right.variableId ? null : missing;
    }
    if (right.kind !== "literal") return missing;
    if (special && right.value === "") return missing;
    return checkAll([right.value]);
  }

  if (expected === "range") {
    if (right.kind !== "range") return missing;
    if (right.from === "" || right.to === "") return missing;
    return checkAll([right.from, right.to]);
  }

  if (right.kind !== "set" || right.values.length === 0) return missing;
  return checkAll(right.values);
}
