import { Split } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { ConditionNode } from "@/features/flows/blocks/condition/ConditionNode";
import {
  ConditionModal,
  createComparison,
  type ConditionData,
} from "@/features/flows/blocks/condition/ConditionModal";
import { isOperatorValid } from "@/features/flows/lib/operators";

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
      if (!isOperatorValid(variable.type, comparison.operator)) {
        return `O operador não vale para ${variable.name}`;
      }
      if (comparison.right.kind === "variable" && !comparison.right.variableId) {
        return "Uma condição está sem valor de comparação";
      }
    }

    return null;
  },
});
