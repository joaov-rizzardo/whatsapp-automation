/**
 * O casamento por palavra-chave — puro, e o pedaço do motor com maior chance de
 * ser sentido pelo usuário final: é ele que decide se um "oi" perdido dentro de
 * "coisa" acorda o chatbot.
 *
 * A regra (spec 008 §3): **contém, palavra inteira**, sobre texto normalizado.
 */

/**
 * Os dois lados passam por aqui — a mensagem e a palavra-chave — porque só
 * normalizando os dois é que "ORÇAMENTO!!" casa com "orcamento".
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

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized === "" ? [] : normalized.split(" ");
}

/**
 * A sequência `needle` aparece inteira dentro de `haystack`, alinhada a limites
 * de palavra? Com tokens, "limite de palavra" é de graça: são elementos do
 * array, e "oi" nunca é um pedaço de "coisa".
 *
 * Deliberadamente não é regex. Montar uma regex a partir de texto que o usuário
 * digitou é como se escreve um ReDoS sem querer — e ainda exigiria escapar cada
 * metacaractere para que um `*` numa palavra-chave não virasse quantificador.
 */
function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;

  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

/**
 * Alguma das palavras-chave aparece na mensagem, como palavra inteira?
 *
 * Uma palavra-chave que normaliza para vazio (só pontuação, ou só espaço) é
 * **ignorada**, não casa com tudo: uma linha em branco deixada no editor
 * transformaria a automação num gatilho de qualquer mensagem, que é justamente
 * o gatilho que o usuário teria escolhido se quisesse.
 */
export function matchesKeyword(text: string, keywords: string[]): boolean {
  const messageTokens = tokenize(text);
  if (messageTokens.length === 0) return false;

  return keywords.some((keyword) =>
    containsSequence(messageTokens, tokenize(keyword)),
  );
}
