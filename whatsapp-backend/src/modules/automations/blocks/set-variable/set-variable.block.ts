import type { FromSchema } from "json-schema-to-ts";

import type { RuntimeContext } from "../block-runtime.js";
import { defineBlock } from "../block-definition.js";
import { toComparable } from "../comparison/comparable.js";
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
    // Somar num texto é um bug de desenho, e o meio de uma conversa é o pior
    // lugar possível para descobri-lo.
    if (data.operation !== "set" && target.type !== "number") {
      return "Só é possível somar ou subtrair de uma variável numérica";
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

  execute: async (data, ctx) => {
    // Sem variável escolhida o bloco é um nó de passagem. A publicação já barra
    // isso; aqui só não pode derrubar uma conversa.
    if (data.variableId) {
      const incoming = readValue(data.value, ctx);
      const current = ctx.variables.get(data.variableId);

      ctx.variables.set(data.variableId, apply(data.operation, current, incoming));
    }

    return { kind: "next", handle: "out" };
  },
});

/**
 * O valor que entra, como string. O literal passa pelo `render`: `{{nome}}` é o
 * mesmo `{{}}` que o bloco de texto entende, e uma sintaxe que funciona numa
 * caixa e não na outra seria uma pegadinha.
 *
 * Faixa e conjunto não têm sentido aqui (a publicação já os recusa) e viram
 * string vazia — nunca exceção.
 */
function readValue(value: SetVariableData["value"], ctx: RuntimeContext): string {
  if (value.kind === "literal") return ctx.variables.render(value.value);
  if (value.kind === "variable") {
    return value.variableId ? ctx.variables.get(value.variableId) : "";
  }
  return "";
}

function apply(
  operation: SetVariableData["operation"],
  current: string,
  incoming: string,
): string {
  if (operation === "set") return incoming;

  // Começar do zero é o que faz um contador funcionar sem `initialValue`, e o
  // que impede um `NaN` de virar o valor gravado.
  const base = toComparable("number", current);
  const delta = toComparable("number", incoming);
  const result =
    (typeof base === "number" ? base : 0) +
    (typeof delta === "number" ? delta : 0) * (operation === "decrement" ? -1 : 1);

  return formatNumber(result);
}

/**
 * `0.1 + 0.2` não pode virar `0.30000000000000004` numa mensagem para o
 * cliente. Dez casas cobrem qualquer aritmética de contador e placar sem
 * arredondar um valor que o usuário tenha digitado de propósito.
 */
function formatNumber(value: number): string {
  return String(Number(value.toFixed(10)));
}
