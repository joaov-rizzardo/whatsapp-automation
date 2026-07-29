import type { FromSchema } from "json-schema-to-ts";

import { defineBlock } from "../block-definition.js";
import { toMilliseconds } from "../duration.js";
import { durationSchema } from "../value-schemas.js";

/**
 * Segundos de silêncio antes de dar a resposta por terminada. No WhatsApp,
 * quem responde "oi", "quero saber", "o preço" mandou uma resposta só — o
 * motor espera este tempo depois da última mensagem e junta tudo.
 */
export const DEFAULT_REPLY_GROUPING_SECONDS = 5;

const waitReplyDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["variableId", "timeout"],
  properties: {
    /** null = a resposta é esperada, mas não é guardada em lugar nenhum. */
    variableId: { type: ["string", "null"], maxLength: 120 },
    timeout: durationSchema,
    /**
     * Opcional de propósito: o campo nasceu depois dos primeiros fluxos, e um
     * rascunho gravado sem ele precisa continuar salvando. Ausente vale
     * `DEFAULT_REPLY_GROUPING_SECONDS`; 0 desliga o agrupamento.
     */
    groupingSeconds: { type: "number", minimum: 0, maximum: 60 },
  },
} as const;

export type WaitReplyData = FromSchema<typeof waitReplyDataSchema>;

/**
 * As duas saídas são o bloco inteiro: são elas que deixam um fluxo reperguntar
 * ou desistir de um contato inativo.
 */
export const waitReplyBlock = defineBlock<WaitReplyData>({
  type: "waitReply",
  dataSchema: waitReplyDataSchema,
  handles: () => ({ inputs: ["in"], outputs: ["reply", "timeout"] }),
  execute: async (data) => ({
    kind: "awaitReply",
    timeoutMs: toMilliseconds(data.timeout),
    // `?? default` e não `|| default`: um agrupamento de 0 é uma escolha (não
    // agrupar), e `||` o trocaria pelos 5 segundos silenciosamente.
    groupingMs:
      (data.groupingSeconds ?? DEFAULT_REPLY_GROUPING_SECONDS) * 1000,
  }),
  resume: async (data, ctx, input) => {
    if (input.kind === "timeout") return { kind: "next", handle: "timeout" };
    // O texto já chega juntado pelo motor; `sys:ultima_resposta` é gravada lá,
    // porque vale para toda mensagem consumida e não só para este bloco.
    if (data.variableId) ctx.variables.set(data.variableId, input.text);
    return { kind: "next", handle: "reply" };
  },
  validate: (data, { variables }) => {
    if (data.timeout.value <= 0) return "Defina o tempo máximo";
    if (
      data.variableId &&
      !variables.some((variable) => variable.id === data.variableId)
    ) {
      return "A variável de destino foi removida";
    }
    return null;
  },
});
