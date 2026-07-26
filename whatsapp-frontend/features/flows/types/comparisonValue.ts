/**
 * The right-hand side of an assignment or a comparison: either a value the user
 * typed, or another variable. Shared by the condition and set-variable blocks
 * so "comparar com outra variável" and "copiar de outra variável" are the same
 * shape and the same UI.
 */
export type ComparisonValue =
  | { kind: "literal"; value: string }
  | { kind: "variable"; variableId: string };

export const emptyLiteral: ComparisonValue = { kind: "literal", value: "" };
