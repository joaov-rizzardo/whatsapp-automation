import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { comparisonValueSchema } from "../value-schemas.js";

const setVariableDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["variableId", "operation", "value"],
  properties: {
    variableId: { type: ["string", "null"], maxLength: 120 },
    operation: { type: "string", enum: ["set", "increment", "decrement"] },
    value: comparisonValueSchema,
  },
} as const;

export type SetVariableData = FromSchema<typeof setVariableDataSchema>;

export const setVariableBlock = defineBlock<SetVariableData>({
  type: "setVariable",
  dataSchema: setVariableDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["out"] }),
  validate: (data, { variables }) => {
    if (!data.variableId) return "Escolha uma variável";

    const target = variables.find((variable) => variable.id === data.variableId);
    if (!target) return "A variável foi removida";
    // A tela só oferece variáveis do fluxo; um documento adulterado poderia
    // tentar gravar numa do sistema, que é somente leitura.
    if (target.origin === "system") {
      return "Não é possível gravar numa variável do sistema";
    }

    if (data.value.kind === "variable") {
      return data.value.variableId ? null : "Escolha a variável de origem";
    }
    // Faixa e conjunto existem para os tipos especiais, que só as condições
    // usam — aqui só um valor ou outra variável fazem sentido.
    if (data.value.kind !== "literal" || data.value.value.trim() === "") {
      return "Informe o valor";
    }
    return null;
  },
});
