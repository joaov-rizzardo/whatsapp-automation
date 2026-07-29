import type { Duration } from "./value-schemas.js";

/**
 * O `Duration` do documento em milissegundos — a unidade em que o motor agenda.
 *
 * Mora aqui, junto do `durationSchema`, porque é a leitura do valor que aquele
 * schema define: `delay` e `waitReply` gravam a mesma forma e precisam do mesmo
 * cálculo, e um deles fazendo `* 1000` à mão é como as duas versões divergem.
 */
const MILLISECONDS_PER_UNIT: Record<Duration["unit"], number> = {
  seconds: 1_000,
  minutes: 60_000,
  hours: 3_600_000,
};

export function toMilliseconds(duration: Duration): number {
  // Arredonda porque o schema aceita decimal e um `delay` fracionário não
  // significa nada para o Redis — é a fila que recebe este número.
  return Math.round(duration.value * MILLISECONDS_PER_UNIT[duration.unit]);
}
