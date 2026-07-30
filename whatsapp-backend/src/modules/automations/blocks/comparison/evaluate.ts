import { toComparable, type Comparable } from "./comparable.js";
import { getOperator } from "../operators.js";
import type { ComparisonValue } from "../value-schemas.js";
import type { VariableType } from "../variable-types.js";

/**
 * A avaliação de UMA comparação — puro, sem nenhum import de infra e sem
 * conhecer a `VariableStore`: o lado direito chega resolvido por `resolve`.
 *
 * A estrutura do arquivo é a do `OperatorValueKind` que `operators.ts` já
 * declara (`none | single | range | set`), e isso não é organização: é o que
 * garante que a tela e a execução ofereçam exatamente o mesmo conjunto. Um
 * operador que a tela mostra e este arquivo não sabe avaliar seria um ramo que
 * nunca dispara.
 *
 * **Qualquer valor ilegível — na esquerda, na direita ou num item do conjunto —
 * encerra a comparação em falso** (spec 009 §3), inclusive nos operadores
 * negados. É a regra mais importante daqui, e a que mais surpreende.
 */

export type ComparisonInput = {
  /** O tipo da variável da ESQUERDA. É ela que define a pergunta. */
  type: VariableType;
  operator: string;
  left: string;
  right: ComparisonValue;
  /** Como um `kind: "variable"` do lado direito vira string. */
  resolve: (variableId: string) => string;
};

export function evaluateComparison(input: ComparisonInput): boolean {
  const descriptor = getOperator(input.type, input.operator);
  // Operador que não vale para este tipo: documento adulterado, ou uma versão
  // publicada por um editor mais novo. Falso, como todo o resto.
  if (!descriptor) return false;

  if (descriptor.value === "none") {
    return evaluateWithoutValue(input.type, input.operator, input.left);
  }

  const left = toComparable(input.type, input.left);
  if (left === null) return false;

  if (descriptor.value === "single") {
    const right = resolveSingle(input);
    return right === null ? false : compareOrdered(input.operator, left, right);
  }

  if (descriptor.value === "range") {
    if (input.right.kind !== "range") return false;
    const from = toComparable(input.type, input.right.from);
    const to = toComparable(input.type, input.right.to);
    if (from === null || to === null) return false;

    const inside = isInsideRange(input.type, left, from, to);
    return input.operator === "not_between" ? !inside : inside;
  }

  if (input.right.kind !== "set") return false;
  const values = input.right.values.map((value) => toComparable(input.type, value));
  // Um item ilegível derruba a comparação inteira: metade de um conjunto é uma
  // pergunta diferente da que o usuário escreveu.
  if (values.some((value) => value === null)) return false;

  const belongs = values.some((value) => value === left);
  return input.operator === "not_in" ? !belongs : belongs;
}

/**
 * Os que dispensam lado direito. `empty` é o único que olha o valor **cru**:
 * uma mensagem só de emoji normaliza para vazio e não está vazia.
 */
function evaluateWithoutValue(
  type: VariableType,
  operator: string,
  left: string,
): boolean {
  switch (operator) {
    case "empty":
      return left.trim() === "";
    case "not_empty":
      return left.trim() !== "";
    case "is_true":
      return toComparable(type, left) === 1;
    case "is_false":
      return toComparable(type, left) === 0;
    case "is_weekday":
    case "is_weekend": {
      const day = toComparable(type, left);
      // `typeof` porque `operators.ts` só oferece estes dois para `weekday`,
      // cujo comparável é número — ler outra coisa aqui seria um bug silencioso.
      if (typeof day !== "number") return false;
      // Segunda a sexta, e nada além disso: sem calendário de feriados,
      // chamar isto de "dia útil" prometeria o que não entregamos.
      const weekday = day >= 1 && day <= 5;
      return operator === "is_weekday" ? weekday : !weekday;
    }
    default:
      return false;
  }
}

/** O lado direito de um operador de valor único, já comparável. */
function resolveSingle(input: ComparisonInput): Comparable | null {
  if (input.right.kind === "variable") {
    // Coagido pelo tipo da ESQUERDA — ela é quem define a pergunta.
    return input.right.variableId
      ? toComparable(input.type, input.resolve(input.right.variableId))
      : null;
  }
  if (input.right.kind !== "literal") return null;
  return toComparable(input.type, input.right.value);
}

/**
 * Onde os operadores de ordem viram um código só. Os de texto (`contains` e
 * companhia) entram aqui porque o comparável de texto já é a string
 * normalizada — e é o que faz "contém" enxergar o mesmo que o gatilho.
 */
function compareOrdered(
  operator: string,
  left: Comparable,
  right: Comparable,
): boolean {
  switch (operator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
    case "after":
      return left > right;
    case "gte":
    case "on_or_after":
      return left >= right;
    case "lt":
    case "before":
      return left < right;
    case "lte":
    case "on_or_before":
      return left <= right;
    default:
      break;
  }

  // Os de texto. O `typeof` é a guarda: `operators.ts` já garante que eles só
  // são oferecidos para variáveis de texto, mas ler um número aqui seria um bug
  // silencioso.
  if (typeof left !== "string" || typeof right !== "string") return false;

  switch (operator) {
    case "contains":
      return left.includes(right);
    case "not_contains":
      return !left.includes(right);
    case "starts_with":
      return left.startsWith(right);
    case "ends_with":
      return left.endsWith(right);
    default:
      return false;
  }
}

/**
 * A faixa é inclusiva nas duas pontas. **Hora é o caso especial**: quando o
 * início é maior que o fim, a faixa atravessa a meia-noite (`22:00`–`06:00`) —
 * sem isso, plantão noturno exigiria um OU de duas condições.
 */
function isInsideRange(
  type: VariableType,
  value: Comparable,
  from: Comparable,
  to: Comparable,
): boolean {
  if (type === "time" && from > to) {
    return value >= from || value <= to;
  }
  return value >= from && value <= to;
}
