/**
 * Os `{{variavel}}` de um texto de mensagem — o único lugar em que um bloco
 * referencia uma variável por *nome* e não por id (quem digita numa textarea
 * não digita cuid). Espelha `lib/interpolation.ts` do frontend, inclusive o
 * padrão: nomes são slugs, então ele pode ser estreito assim.
 */
const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;

export function extractVariableNames(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    names.add(match[1]);
  }
  return [...names];
}
