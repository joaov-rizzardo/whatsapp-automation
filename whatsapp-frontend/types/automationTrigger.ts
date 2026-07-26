import { z } from "zod";

/**
 * O gatilho de uma automação: o que faz o fluxo começar.
 *
 * Mora aqui, e não dentro de uma feature, porque duas o usam — a lista de
 * automações, que o exibe, e o bloco de início do editor, que o define. É uma
 * união discriminada porque cada tipo carrega dados diferentes: palavra-chave
 * tem lista, os outros não.
 *
 * Virou schema Zod com a persistência (spec 006): o mesmo gatilho chega pela
 * rede em dois lugares — na linha da lista, derivado pelo backend, e dentro do
 * documento do fluxo — e uma união só de tipos não validaria nenhum dos dois.
 * O tipo continua sendo um só, agora inferido daqui.
 */
export const automationTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("keyword"), keywords: z.array(z.string()) }),
  z.object({ kind: z.literal("anyMessage") }),
  z.object({ kind: z.literal("firstContact") }),
  /** Ainda não definido — a automação não pode ser ativada assim. */
  z.object({ kind: z.literal("none") }),
]);

export type AutomationTrigger = z.infer<typeof automationTriggerSchema>;

export type TriggerKind = AutomationTrigger["kind"];
