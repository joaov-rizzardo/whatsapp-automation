/**
 * O casamento por palavra-chave — puro, e o pedaço do motor com maior chance de
 * ser sentido pelo usuário final: é ele que decide se um "oi" perdido dentro de
 * "coisa" acorda o chatbot.
 *
 * A regra (spec 008 §3): **contém, palavra inteira**, sobre texto normalizado.
 *
 * A normalização em si mora nos BLOCOS (`blocks/comparison/normalize.ts`),
 * porque o operador `contém` do bloco de comparação precisa enxergar o texto
 * exatamente como o gatilho enxerga (spec 009 §3). A direção do import é a de
 * sempre: o motor conhece os blocos, os blocos não conhecem o motor.
 */

import { normalizeText } from "../automations/blocks/comparison/normalize.js";

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
