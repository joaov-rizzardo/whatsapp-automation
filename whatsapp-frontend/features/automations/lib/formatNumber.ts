/**
 * Separador de milhar brasileiro (1.284, nunca 1,284) e percentual inteiro,
 * conforme os fundamentos de conteúdo do design system.
 */

const countFormatter = new Intl.NumberFormat("pt-BR");

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

export function formatPercent(rate: number): string {
  return percentFormatter.format(rate);
}
