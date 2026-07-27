import type { VariableType } from "./variable-types.js";

/**
 * Os operadores que o bloco `se` oferece, por tipo de variável. Espelham
 * `lib/operators.ts` do frontend — aqui sem rótulo nem símbolo, porque este
 * lado não desenha nada: o que interessa é "este operador vale para uma
 * variável deste tipo?" e, amanhã, como executá-lo.
 *
 * `value` diz que FORMA o lado direito tem, e é o que substituiu a aridade: os
 * tipos especiais compararam com uma faixa (`hora está entre 08:00 e 18:00`) ou
 * com um conjunto (`dia_semana é um dos: seg, ter`), e nenhuma das duas cabe num
 * valor só. `none` são os que dispensam lado direito (`está vazio`, `é fim de
 * semana`) — é o que impede a publicação de cobrar um valor que a tela nem
 * mostrou.
 */

export type OperatorValueKind = "none" | "single" | "range" | "set";

type OperatorDescriptor = { id: string; value: OperatorValueKind };

const textOperators: OperatorDescriptor[] = [
  { id: "eq", value: "single" },
  { id: "neq", value: "single" },
  { id: "contains", value: "single" },
  { id: "not_contains", value: "single" },
  { id: "starts_with", value: "single" },
  { id: "ends_with", value: "single" },
  { id: "empty", value: "none" },
  { id: "not_empty", value: "none" },
];

const numberOperators: OperatorDescriptor[] = [
  { id: "eq", value: "single" },
  { id: "neq", value: "single" },
  { id: "gt", value: "single" },
  { id: "gte", value: "single" },
  { id: "lt", value: "single" },
  { id: "lte", value: "single" },
];

const booleanOperators: OperatorDescriptor[] = [
  { id: "is_true", value: "none" },
  { id: "is_false", value: "none" },
];

/**
 * Hora não tem `é` / `não é`: a chance de uma mensagem cair exatamente no
 * minuto escolhido é 1/1440 — um operador que parece útil e nunca dispara.
 *
 * `between` é inclusivo nas duas pontas e ATRAVESSA A MEIA-NOITE quando o
 * início é maior que o fim (`22:00`–`06:00`); sem isso, plantão noturno exigiria
 * um OU de duas condições.
 */
const timeOperators: OperatorDescriptor[] = [
  { id: "between", value: "range" },
  { id: "not_between", value: "range" },
  { id: "after", value: "single" },
  { id: "on_or_after", value: "single" },
  { id: "before", value: "single" },
  { id: "on_or_before", value: "single" },
];

/** A data é sempre hoje, então o que interessa é janela: campanha, feriado. */
const dateOperators: OperatorDescriptor[] = [
  { id: "between", value: "range" },
  { id: "not_between", value: "range" },
  { id: "after", value: "single" },
  { id: "on_or_after", value: "single" },
  { id: "before", value: "single" },
  { id: "on_or_before", value: "single" },
  { id: "eq", value: "single" },
  { id: "neq", value: "single" },
];

/** Conjunto, não faixa: "dezembro ou janeiro" não é um intervalo. */
const monthOperators: OperatorDescriptor[] = [
  { id: "in", value: "set" },
  { id: "not_in", value: "set" },
];

/**
 * `is_weekday` é segunda a sexta e nada mais — não temos calendário de feriados,
 * e chamá-lo de "dia útil" prometeria o que não entregamos.
 */
const weekdayOperators: OperatorDescriptor[] = [
  { id: "in", value: "set" },
  { id: "not_in", value: "set" },
  { id: "is_weekday", value: "none" },
  { id: "is_weekend", value: "none" },
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

export function getOperator(
  type: VariableType,
  id: string,
): OperatorDescriptor | undefined {
  return operatorsByType[type].find((operator) => operator.id === id);
}

export function isOperatorValid(type: VariableType, id: string): boolean {
  return getOperator(type, id) !== undefined;
}
