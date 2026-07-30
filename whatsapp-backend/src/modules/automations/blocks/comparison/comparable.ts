import { isTruthy, normalizeText } from "./normalize.js";
import { isValidSpecialValue, type VariableType } from "../variable-types.js";

/**
 * O valor canônico de um tipo — o que faz quase todo operador virar uma
 * **ordenação**.
 *
 * Toda variável é string (é assim que ela cabe no `data` de um bloco e no JSON
 * da execução), mas `"9" < "10"` é falso como texto e verdadeiro como número, e
 * `"08:30"` só se compara com `"18:00"` se as duas virarem minutos. Com um
 * comparável por tipo, `gt`, `lt`, `between`, `after` e `eq` são um código só,
 * e o que sobra de específico em `evaluate.ts` é curto.
 *
 * `null` quer dizer **não dá para ler isto como este tipo**, e é a informação
 * mais importante do arquivo: a comparação inteira vira falsa (spec 009 §3),
 * inclusive nos operadores negados.
 */
export type Comparable = number | string;

export function toComparable(
  type: VariableType,
  value: string,
): Comparable | null {
  switch (type) {
    case "number":
      return parseNumber(value);
    case "time":
      return toMinutes(value);
    case "date":
      // ISO já ordena como string — converter para Date custaria fuso.
      return isValidSpecialValue("date", value) ? value : null;
    case "month":
    case "weekday":
      return isValidSpecialValue(type, value) ? Number(value) : null;
    case "boolean":
      return isTruthy(value) ? 1 : 0;
    case "text":
      // Texto nunca é ilegível: vazio é um valor, e é o que `eq ""` compara.
      return normalizeText(value);
  }
}

/**
 * A vírgula decimal porque é como o usuário digita; nada além disso.
 *
 * Aceitar `"R$ 10"` ou `"10 reais"` seria adivinhar — e adivinhar errado numa
 * condição é pior do que ela não disparar. O casamento é da string INTEIRA, que
 * é o que separa isto de um `parseFloat` (que leria `"10 reais"` como 10).
 */
const NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/;

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!NUMBER_PATTERN.test(trimmed)) return null;

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** `HH:MM` vira minutos desde a meia-noite: a ordem passa a ser aritmética. */
function toMinutes(value: string): number | null {
  if (!isValidSpecialValue("time", value)) return null;

  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}
