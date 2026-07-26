import type { AutomationTrigger, TriggerKind } from "@/types/automationTrigger";

/**
 * O gatilho em uma linha, do jeito que o dono do negócio lê. Palavras-chave vêm
 * entre aspas porque é assim que ele as digita no WhatsApp.
 */
export function describeTrigger(trigger: AutomationTrigger): string {
  switch (trigger.kind) {
    case "keyword":
      return `Palavra-chave ${trigger.keywords.map((word) => `"${word}"`).join(", ")}`;
    case "anyMessage":
      return "Qualquer mensagem";
    case "firstContact":
      return "Primeiro contato";
    case "none":
      return "Sem gatilho definido";
  }
}

/** Sem gatilho, a automação não tem como disparar — então não pode ser ativada. */
export function canActivate(trigger: AutomationTrigger): boolean {
  return trigger.kind !== "none";
}

/**
 * As opções que o usuário escolhe. `none` não está aqui de propósito: é a
 * ausência de gatilho, não uma escolha.
 */
export const triggerOptions: {
  kind: Exclude<TriggerKind, "none">;
  label: string;
  hint: string;
}[] = [
  {
    kind: "keyword",
    label: "Palavra-chave",
    hint: "Quando a mensagem contém uma das palavras",
  },
  {
    kind: "anyMessage",
    label: "Qualquer mensagem",
    hint: "Qualquer mensagem recebida começa o fluxo",
  },
  {
    kind: "firstContact",
    label: "Primeiro contato",
    hint: "Só na primeira vez que a pessoa escreve",
  },
];
