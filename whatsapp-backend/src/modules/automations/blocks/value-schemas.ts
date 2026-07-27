import type { FromSchema } from "json-schema-to-ts";

/**
 * As formas de valor que mais de um bloco usa. Ficam juntas aqui pelo mesmo
 * motivo que no frontend: "comparar com outra variável" e "copiar de outra
 * variável" são a mesma coisa, e o delay e o timeout do aguardar-resposta são o
 * mesmo tempo.
 *
 * Aceitam o que o editor grava enquanto o usuário ainda está escolhendo (um
 * `variableId` vazio, um tempo zerado): a forma passa, o sentido é cobrado na
 * publicação pelo `validate` de cada bloco.
 */

export const durationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["value", "unit"],
  properties: {
    value: { type: "number", minimum: 0, maximum: 100000 },
    unit: { type: "string", enum: ["seconds", "minutes", "hours"] },
  },
} as const;

export type Duration = FromSchema<typeof durationSchema>;

export const comparisonValueSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "value"],
      properties: {
        kind: { const: "literal" },
        value: { type: "string", maxLength: 1000 },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "variableId"],
      properties: {
        kind: { const: "variable" },
        // Vazio enquanto o usuário não escolheu — o validate é que recusa.
        variableId: { type: ["string", "null"], maxLength: 120 },
      },
    },
    // As duas formas que os tipos especiais trouxeram. Vêm vazias enquanto o
    // usuário escolhe, e o formato de cada valor é cobrado na publicação.
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "from", "to"],
      properties: {
        kind: { const: "range" },
        from: { type: "string", maxLength: 40 },
        to: { type: "string", maxLength: 40 },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "values"],
      properties: {
        kind: { const: "set" },
        values: { type: "array", maxItems: 60, items: { type: "string", maxLength: 40 } },
      },
    },
  ],
} as const;

export type ComparisonValue = FromSchema<typeof comparisonValueSchema>;

/** A referência a uma variável que um valor carrega, ou null. */
export function referencedVariableId(value: ComparisonValue): string | null {
  return value.kind === "variable" ? (value.variableId ?? null) : null;
}
