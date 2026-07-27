import type { FlowVariableType } from "../flow.schema.js";

/**
 * Os tipos ESPECIAIS: hora, data, mês e dia da semana. Existem só em variáveis
 * de sistema — o documento continua aceitando `text | number | boolean` e nada
 * mais, e é por isso que acrescentá-los não custou migração nenhuma.
 *
 * Eles não são texto porque a comparação que interessa não é textual: "está
 * entre 08:00 e 18:00" e "é um dos: dez, jan" precisam de um lado direito com
 * outra forma, e de saber a ordem entre dois valores.
 *
 * Espelha `types/variable.ts` do frontend, do lado que valida.
 */
export const specialVariableTypes = ["time", "date", "month", "weekday"] as const;

export type SpecialVariableType = (typeof specialVariableTypes)[number];

/** Todo tipo que uma variável pode ter, do documento ou do sistema. */
export type VariableType = FlowVariableType | SpecialVariableType;

export function isSpecialType(type: VariableType): type is SpecialVariableType {
  return (specialVariableTypes as readonly string[]).includes(type);
}

/**
 * Os formatos em que cada tipo especial é gravado. Todos são string, o que é o
 * que mantém o `data` de um bloco na mesma forma de sempre.
 *
 * A hora é 24h; a data é ISO (`YYYY-MM-DD`) para ordenar como string; mês e dia
 * da semana são números, e o dia da semana segue a ISO — 1 é segunda, 7 é
 * domingo.
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  // `2026-02-31` casa com o padrão e não existe: o round-trip é o que pega.
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  );
}

function isIntegerInRange(value: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return parsed >= min && parsed <= max;
}

export function isValidSpecialValue(
  type: SpecialVariableType,
  value: string,
): boolean {
  switch (type) {
    case "time":
      return TIME_PATTERN.test(value);
    case "date":
      return isValidDate(value);
    case "month":
      return isIntegerInRange(value, 1, 12);
    case "weekday":
      return isIntegerInRange(value, 1, 7);
  }
}
