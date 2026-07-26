/**
 * O gatilho de uma automação: o que faz o fluxo começar.
 *
 * Mora aqui, e não dentro de uma feature, porque duas o usam — a lista de
 * automações, que o exibe, e o bloco de início do editor, que o define. É uma
 * união discriminada porque cada tipo carrega dados diferentes: palavra-chave
 * tem lista, os outros não.
 */
export type AutomationTrigger =
  | { kind: "keyword"; keywords: string[] }
  | { kind: "anyMessage" }
  | { kind: "firstContact" }
  /** Ainda não definido — a automação não pode ser ativada assim. */
  | { kind: "none" };

export type TriggerKind = AutomationTrigger["kind"];
