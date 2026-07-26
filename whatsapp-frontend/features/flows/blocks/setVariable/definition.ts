import { PenLine } from "lucide-react";

import { defineBlock } from "@/features/flows/blocks/types";
import { SetVariableNode } from "@/features/flows/blocks/setVariable/SetVariableNode";
import {
  SetVariableModal,
  type SetVariableData,
} from "@/features/flows/blocks/setVariable/SetVariableModal";
import { emptyLiteral } from "@/features/flows/types/comparisonValue";

export const setVariableDefinition = defineBlock<SetVariableData>({
  type: "setVariable",
  label: "Definir variável",
  description: "Grava um valor numa variável",
  icon: PenLine,
  category: "data",
  handles: {
    inputs: [{ id: "in" }],
    outputs: [{ id: "out" }],
  },
  addable: true,
  singleton: false,
  createData: () => ({
    variableId: null,
    operation: "set",
    value: emptyLiteral,
  }),
  node: SetVariableNode,
  modal: SetVariableModal,

  usedVariables: (data) =>
    [
      data.variableId,
      data.value.kind === "variable" ? data.value.variableId : null,
    ].filter((id): id is string => Boolean(id)),

  validate: (data, variables) => {
    if (!data.variableId) return "Escolha uma variável";
    if (!variables.some((variable) => variable.id === data.variableId)) {
      return "A variável foi removida";
    }
    if (data.value.kind === "variable" && !data.value.variableId) {
      return "Escolha a variável de origem";
    }
    if (data.value.kind === "literal" && data.value.value.trim() === "") {
      return "Informe o valor";
    }
    return null;
  },
});
