import type { FlowVariableType } from "../flow.schema.js";

/**
 * Os operadores que o bloco `se` oferece, por tipo de variável. Espelham
 * `lib/operators.ts` do frontend — aqui sem rótulo nem símbolo, porque este
 * lado não desenha nada: o que interessa é "este operador vale para uma
 * variável deste tipo?" e, amanhã, como executá-lo.
 *
 * `unary` marca os que dispensam lado direito (`está vazio`, `é verdadeiro`) —
 * é o que impede a publicação de cobrar um valor de comparação que a tela nem
 * mostrou.
 */

type OperatorDescriptor = { id: string; unary: boolean };

const textOperators: OperatorDescriptor[] = [
  { id: "eq", unary: false },
  { id: "neq", unary: false },
  { id: "contains", unary: false },
  { id: "not_contains", unary: false },
  { id: "starts_with", unary: false },
  { id: "ends_with", unary: false },
  { id: "empty", unary: true },
  { id: "not_empty", unary: true },
];

const numberOperators: OperatorDescriptor[] = [
  { id: "eq", unary: false },
  { id: "neq", unary: false },
  { id: "gt", unary: false },
  { id: "gte", unary: false },
  { id: "lt", unary: false },
  { id: "lte", unary: false },
];

const booleanOperators: OperatorDescriptor[] = [
  { id: "is_true", unary: true },
  { id: "is_false", unary: true },
];

const operatorsByType: Record<FlowVariableType, OperatorDescriptor[]> = {
  text: textOperators,
  number: numberOperators,
  boolean: booleanOperators,
};

export function getOperator(
  type: FlowVariableType,
  id: string,
): OperatorDescriptor | undefined {
  return operatorsByType[type].find((operator) => operator.id === id);
}

export function isOperatorValid(type: FlowVariableType, id: string): boolean {
  return getOperator(type, id) !== undefined;
}
