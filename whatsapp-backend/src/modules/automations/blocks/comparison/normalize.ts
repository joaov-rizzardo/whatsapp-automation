/**
 * As duas leituras "frouxas" de um valor: como texto e como sim/não.
 *
 * Moram aqui, e não em `flow-runtime/`, pela direção da dependência que o
 * `block-definition.ts` já defende — o motor conhece os blocos, os blocos não
 * conhecem o motor. O `keyword.ts` do motor importa daqui, nunca o contrário.
 */

/**
 * Os dois lados de uma comparação passam por aqui — e a mensagem e a
 * palavra-chave do gatilho também — porque só normalizando os dois é que
 * "ORÇAMENTO!!" casa com "orcamento".
 *
 * Ordem importa: o NFD separa a letra do diacrítico para que o diacrítico possa
 * ser removido sem levar a letra junto (`ç` -> `c` + cedilha -> `c`).
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    // Escapado de propósito: a faixa dos diacríticos combinantes é invisível
    // quando escrita literalmente, e uma linha que ninguém enxerga é uma linha
    // que alguém apaga sem querer.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * O que conta como verdadeiro numa variável booleana.
 *
 * O editor grava exatamente `"true"` / `"false"`, mas `definir variável` pode
 * copiar `{{ultima_resposta}}` para uma booleana — e aí o que chega é o que a
 * pessoa digitou. Daí a lista, que é curta e explícita de propósito: um
 * "qualquer coisa não vazia" faria `"não"` ser verdadeiro.
 */
const TRUTHY = new Set(["true", "1", "sim", "yes", "verdadeiro"]);

export function isTruthy(value: string): boolean {
  return TRUTHY.has(normalizeText(value));
}
