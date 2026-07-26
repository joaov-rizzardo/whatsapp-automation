/**
 * Separador de milhar brasileiro (1.284, nunca 1,284), conforme os fundamentos
 * de conteúdo do design system.
 *
 * O formatador de percentual saiu com as métricas (spec 006): ele só servia
 * `completionRate`, que depende do motor de execução para existir.
 */
const countFormatter = new Intl.NumberFormat("pt-BR");

export function formatCount(value: number): string {
  return countFormatter.format(value);
}
