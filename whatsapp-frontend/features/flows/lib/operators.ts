import type { VariableType } from "@/features/flows/types/variable";

/**
 * The comparison operators the condition block offers, as data rather than a
 * `switch` spread across the modal and the node. Which ones show up depends on
 * the type of the variable on the left, so picking a text variable can never
 * leave a `>` behind.
 *
 * `arity: 1` means the operator needs no right-hand side — the modal hides that
 * field entirely instead of showing an input that does nothing.
 */

export type OperatorDescriptor = {
  id: string;
  label: string;
  symbol: string; // compact form, used in the node summary
  arity: 1 | 2;
};

const textOperators: OperatorDescriptor[] = [
  { id: "eq", label: "é", symbol: "é", arity: 2 },
  { id: "neq", label: "não é", symbol: "não é", arity: 2 },
  { id: "contains", label: "contém", symbol: "contém", arity: 2 },
  { id: "not_contains", label: "não contém", symbol: "não contém", arity: 2 },
  { id: "starts_with", label: "começa com", symbol: "começa com", arity: 2 },
  { id: "ends_with", label: "termina com", symbol: "termina com", arity: 2 },
  { id: "empty", label: "está vazio", symbol: "está vazio", arity: 1 },
  { id: "not_empty", label: "não está vazio", symbol: "não está vazio", arity: 1 },
];

const numberOperators: OperatorDescriptor[] = [
  { id: "eq", label: "é igual a", symbol: "=", arity: 2 },
  { id: "neq", label: "é diferente de", symbol: "≠", arity: 2 },
  { id: "gt", label: "é maior que", symbol: ">", arity: 2 },
  { id: "gte", label: "é maior ou igual a", symbol: "≥", arity: 2 },
  { id: "lt", label: "é menor que", symbol: "<", arity: 2 },
  { id: "lte", label: "é menor ou igual a", symbol: "≤", arity: 2 },
];

const booleanOperators: OperatorDescriptor[] = [
  { id: "is_true", label: "é verdadeiro", symbol: "é verdadeiro", arity: 1 },
  { id: "is_false", label: "é falso", symbol: "é falso", arity: 1 },
];

const operatorsByType: Record<VariableType, OperatorDescriptor[]> = {
  text: textOperators,
  number: numberOperators,
  boolean: booleanOperators,
};

export function getOperators(type: VariableType): OperatorDescriptor[] {
  return operatorsByType[type];
}

/** The operator a comparison falls back to when the left variable changes type. */
export function getDefaultOperator(type: VariableType): string {
  return operatorsByType[type][0].id;
}

export function getOperator(
  type: VariableType,
  id: string,
): OperatorDescriptor | undefined {
  return operatorsByType[type].find((operator) => operator.id === id);
}

/** Whether an operator still makes sense for a given variable type. */
export function isOperatorValid(type: VariableType, id: string): boolean {
  return getOperator(type, id) !== undefined;
}
