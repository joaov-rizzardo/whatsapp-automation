import type { OperatorValueKind } from "@/features/flows/lib/operators";

/**
 * The right-hand side of an assignment or a comparison: a value the user typed,
 * another variable, a range, or a set. The first two are shared by the
 * condition and set-variable blocks so "comparar com outra variável" and
 * "copiar de outra variável" are the same shape and the same UI.
 *
 * `range` and `set` came with the special types (hora, data, mês, dia da
 * semana) and belong to conditions only: "está entre 08:00 e 18:00" and "é um
 * dos: dez, jan" don't fit in one value. Every field is still a string, so the
 * document's shape didn't change.
 */
export type ComparisonValue =
  | { kind: "literal"; value: string }
  | { kind: "variable"; variableId: string }
  | { kind: "range"; from: string; to: string }
  | { kind: "set"; values: string[] };

export const emptyLiteral: ComparisonValue = { kind: "literal", value: "" };

/**
 * The value a comparison falls back to when the operator changes: the old one
 * can't survive a change of shape, and a leftover range under a `é depois de`
 * would be invisible on screen and refused on publish.
 *
 * Always empty, never pre-filled. A time field that arrives showing 08:00
 * because we picked it is a condition the user never chose, and it would
 * publish silently.
 */
export function emptyValueFor(kind: OperatorValueKind): ComparisonValue {
  switch (kind) {
    case "range":
      return { kind: "range", from: "", to: "" };
    case "set":
      return { kind: "set", values: [] };
    case "single":
    case "none":
      return emptyLiteral;
  }
}
