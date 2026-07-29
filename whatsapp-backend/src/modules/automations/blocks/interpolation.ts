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

/**
 * A outra metade: trocar cada `{{nome}}` pelo valor. Mora no mesmo arquivo que
 * o `extract` para que as duas usem a **mesma** regex — se a publicação aceita
 * um nome que o envio não substitui (ou o contrário), o cliente final recebe um
 * `{{fantasma}}` cru, e a divergência só aparece em produção.
 *
 * Quem resolve o nome é o chamador: aqui não existe variável, só sintaxe.
 */
export function renderPlaceholders(
  text: string,
  resolve: (name: string) => string,
): string {
  return text.replace(PLACEHOLDER, (_match, name: string) => resolve(name));
}
