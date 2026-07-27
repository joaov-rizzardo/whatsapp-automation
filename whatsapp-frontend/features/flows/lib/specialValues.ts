import type { SpecialVariableType } from "@/features/flows/types/variable";

/**
 * How a special value is stored and how it reads on screen. Everything is a
 * string, which is what keeps a block's data in the shape it always had:
 *
 * - `time`  — `HH:MM`, 24h
 * - `date`  — `YYYY-MM-DD` (ISO, so it sorts as a string), shown as dd/mm/aaaa
 * - `month` — `"1".."12"`
 * - `weekday` — `"1".."7"`, ISO: 1 is segunda, 7 is domingo
 *
 * The labels live here, not in the pickers, because the node summary needs the
 * same words the picker shows — "seg, ter, qua" has to read the same in both.
 */

export const months = [
  { value: "1", label: "Janeiro", short: "jan" },
  { value: "2", label: "Fevereiro", short: "fev" },
  { value: "3", label: "Março", short: "mar" },
  { value: "4", label: "Abril", short: "abr" },
  { value: "5", label: "Maio", short: "mai" },
  { value: "6", label: "Junho", short: "jun" },
  { value: "7", label: "Julho", short: "jul" },
  { value: "8", label: "Agosto", short: "ago" },
  { value: "9", label: "Setembro", short: "set" },
  { value: "10", label: "Outubro", short: "out" },
  { value: "11", label: "Novembro", short: "nov" },
  { value: "12", label: "Dezembro", short: "dez" },
] as const;

/** Segunda first — a week that starts on Sunday reads wrong for atendimento. */
export const weekdays = [
  { value: "1", label: "Segunda", short: "seg", initial: "S" },
  { value: "2", label: "Terça", short: "ter", initial: "T" },
  { value: "3", label: "Quarta", short: "qua", initial: "Q" },
  { value: "4", label: "Quinta", short: "qui", initial: "Q" },
  { value: "5", label: "Sexta", short: "sex", initial: "S" },
  { value: "6", label: "Sábado", short: "sáb", initial: "S" },
  { value: "7", label: "Domingo", short: "dom", initial: "D" },
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a stored value is readable as its type. Mirrors the backend's check,
 * so the node's warning badge says what publishing would say — an empty date
 * input and a half-typed one both land here.
 */
export function isValidSpecialValue(
  type: SpecialVariableType,
  value: string,
): boolean {
  switch (type) {
    case "time":
      return TIME_PATTERN.test(value);
    case "date":
      return DATE_PATTERN.test(value);
    case "month":
      return months.some((item) => item.value === value);
    case "weekday":
      return weekdays.some((item) => item.value === value);
  }
}

/** One stored value, the way it reads to a person. */
export function formatSpecialValue(
  type: SpecialVariableType,
  value: string,
): string {
  if (value === "") return "?";

  switch (type) {
    case "time":
      return value;
    case "date": {
      const [year, month, day] = value.split("-");
      return day ? `${day}/${month}/${year}` : value;
    }
    case "month":
      return months.find((item) => item.value === value)?.short ?? value;
    case "weekday":
      return weekdays.find((item) => item.value === value)?.short ?? value;
  }
}

/** A set of values, in the canonical order rather than the click order. */
export function formatSpecialSet(
  type: SpecialVariableType,
  values: string[],
): string {
  if (values.length === 0) return "?";

  const order: readonly { value: string; short: string }[] =
    type === "month" ? months : type === "weekday" ? weekdays : [];

  if (order.length === 0) {
    return values.map((value) => formatSpecialValue(type, value)).join(", ");
  }

  return order
    .filter((item) => values.includes(item.value))
    .map((item) => item.short)
    .join(", ");
}
