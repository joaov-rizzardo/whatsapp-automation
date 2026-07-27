import type { VariableType } from "@/features/flows/types/variable";

/**
 * The comparison operators the condition block offers, by variable type, as
 * data rather than a `switch` spread across the modal and the node. Which ones
 * show up depends on the type of the variable on the left, so picking a text
 * variable can never leave a `>` behind.
 *
 * `value` says what SHAPE the right-hand side has, and it replaced the old
 * arity: the special types compare against a range (`hora está entre 08:00 e
 * 18:00`) or a set (`dia_semana é um dos: seg, ter`), and neither fits in a
 * single value. `none` are the ones that take no right-hand side at all — the
 * modal hides that field entirely instead of showing an input that does
 * nothing.
 */

export type OperatorValueKind = "none" | "single" | "range" | "set";

export type OperatorDescriptor = {
  id: string;
  label: string;
  symbol: string; // compact form, used in the node summary
  value: OperatorValueKind;
};

const textOperators: OperatorDescriptor[] = [
  { id: "eq", label: "é", symbol: "é", value: "single" },
  { id: "neq", label: "não é", symbol: "não é", value: "single" },
  { id: "contains", label: "contém", symbol: "contém", value: "single" },
  { id: "not_contains", label: "não contém", symbol: "não contém", value: "single" },
  { id: "starts_with", label: "começa com", symbol: "começa com", value: "single" },
  { id: "ends_with", label: "termina com", symbol: "termina com", value: "single" },
  { id: "empty", label: "está vazio", symbol: "está vazio", value: "none" },
  { id: "not_empty", label: "não está vazio", symbol: "não está vazio", value: "none" },
];

const numberOperators: OperatorDescriptor[] = [
  { id: "eq", label: "é igual a", symbol: "=", value: "single" },
  { id: "neq", label: "é diferente de", symbol: "≠", value: "single" },
  { id: "gt", label: "é maior que", symbol: ">", value: "single" },
  { id: "gte", label: "é maior ou igual a", symbol: "≥", value: "single" },
  { id: "lt", label: "é menor que", symbol: "<", value: "single" },
  { id: "lte", label: "é menor ou igual a", symbol: "≤", value: "single" },
];

const booleanOperators: OperatorDescriptor[] = [
  { id: "is_true", label: "é verdadeiro", symbol: "é verdadeiro", value: "none" },
  { id: "is_false", label: "é falso", symbol: "é falso", value: "none" },
];

/**
 * Hora has no "é" / "não é": a message landing on exactly the chosen minute is
 * a 1-in-1440 shot — an operator that looks useful and never fires. The range
 * is first because business hours are the reason this type exists; it is
 * inclusive on both ends and **crosses midnight** when the start is greater
 * than the end (22:00–06:00).
 */
const timeOperators: OperatorDescriptor[] = [
  { id: "between", label: "está entre", symbol: "está entre", value: "range" },
  { id: "not_between", label: "não está entre", symbol: "não está entre", value: "range" },
  { id: "after", label: "é depois de", symbol: ">", value: "single" },
  { id: "on_or_after", label: "é depois ou igual a", symbol: "≥", value: "single" },
  { id: "before", label: "é antes de", symbol: "<", value: "single" },
  { id: "on_or_before", label: "é antes ou igual a", symbol: "≤", value: "single" },
];

/** The date is always today, so what matters is a window: campaign, holiday. */
const dateOperators: OperatorDescriptor[] = [
  { id: "between", label: "está entre", symbol: "está entre", value: "range" },
  { id: "not_between", label: "não está entre", symbol: "não está entre", value: "range" },
  { id: "after", label: "é depois de", symbol: ">", value: "single" },
  { id: "on_or_after", label: "é depois ou igual a", symbol: "≥", value: "single" },
  { id: "before", label: "é antes de", symbol: "<", value: "single" },
  { id: "on_or_before", label: "é antes ou igual a", symbol: "≤", value: "single" },
  { id: "eq", label: "é", symbol: "é", value: "single" },
  { id: "neq", label: "não é", symbol: "não é", value: "single" },
];

/** A set, not a range: "dezembro ou janeiro" is not an interval. */
const monthOperators: OperatorDescriptor[] = [
  { id: "in", label: "é um dos", symbol: "é um dos", value: "set" },
  { id: "not_in", label: "não é nenhum dos", symbol: "não é nenhum dos", value: "set" },
];

/**
 * "de segunda a sexta" rather than "é dia útil": we have no holiday calendar,
 * and the second label would promise one.
 */
const weekdayOperators: OperatorDescriptor[] = [
  { id: "in", label: "é um dos", symbol: "é", value: "set" },
  { id: "not_in", label: "não é nenhum dos", symbol: "não é", value: "set" },
  {
    id: "is_weekday",
    label: "é de segunda a sexta",
    symbol: "é de segunda a sexta",
    value: "none",
  },
  { id: "is_weekend", label: "é fim de semana", symbol: "é fim de semana", value: "none" },
];

const operatorsByType: Record<VariableType, OperatorDescriptor[]> = {
  text: textOperators,
  number: numberOperators,
  boolean: booleanOperators,
  time: timeOperators,
  date: dateOperators,
  month: monthOperators,
  weekday: weekdayOperators,
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
