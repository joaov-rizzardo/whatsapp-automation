import type { FromSchema } from "json-schema-to-ts";

import type { AutomationRecord } from "./automations.repository.js";
import type { AutomationTrigger } from "./blocks/start/start.block.js";

/**
 * Schemas de rota da automação. `organizationId` NUNCA aparece em nenhum deles
 * — ele vem da sessão, via `request.organizationId`.
 */

export const automationParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 60 } },
} as const;

export type AutomationParams = FromSchema<typeof automationParamsSchema>;

export const createAutomationBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: { name: { type: "string", minLength: 1, maxLength: 80 } },
} as const;

export type CreateAutomationInput = FromSchema<typeof createAutomationBodySchema>;

/** Renomear e ativar/pausar pela mesma rota; ao menos um dos dois. */
export const updateAutomationBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 80 },
    isActive: { type: "boolean" },
  },
} as const;

export type UpdateAutomationInput = FromSchema<typeof updateAutomationBodySchema>;

/**
 * A resposta que a lista consome. `status` e `hasUnpublishedChanges` são
 * derivados na service (decisão 9: guardar o status permitiria o estado
 * impossível "ativa e nunca publicada").
 *
 * `trigger` é declarado permissivo de propósito: a forma estrita é validada na
 * escrita, pelo schema do bloco de início, e um `oneOf` no schema de RESPOSTA
 * faria o serializador do Fastify decidir entre variantes a cada resposta.
 */
export const automationResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "name",
    "status",
    "trigger",
    "blockCount",
    "hasUnpublishedChanges",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    status: { type: "string", enum: ["draft", "active", "paused"] },
    trigger: { type: "object", additionalProperties: true },
    blockCount: { type: "integer" },
    hasUnpublishedChanges: { type: "boolean" },
    updatedAt: { type: "string" },
  },
} as const;

export const automationListResponseSchema = {
  type: "array",
  items: automationResponseSchema,
} as const;

export type AutomationStatus = "draft" | "active" | "paused";

/** O que as rotas devolvem — o registro do banco já derivado. */
export type AutomationView = {
  id: string;
  name: string;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  blockCount: number;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
};

/**
 * A única tradução de registro para resposta, usada pelas duas services (o
 * fluxo devolve a automação junto para a tela não precisar de um segundo GET).
 *
 * `status` é derivado aqui e em nenhum outro lugar: nunca publicada é rascunho,
 * publicada segue o `isActive`. Guardar a string permitiria "ativa e nunca
 * publicada", que não existe.
 *
 * `hasUnpublishedChanges` exige uma publicação para significar alguma coisa —
 * sem versão no ar não há nada de que o rascunho possa estar à frente.
 */
export function toAutomationView(record: AutomationRecord): AutomationView {
  const status: AutomationStatus =
    record.publishedVersionNumber === null
      ? "draft"
      : record.isActive
        ? "active"
        : "paused";

  return {
    id: record.id,
    name: record.name,
    status,
    trigger: record.trigger,
    blockCount: record.blockCount,
    hasUnpublishedChanges:
      record.publishedVersionNumber !== null &&
      record.publishedDraftVersion !== record.draftVersion,
    updatedAt: record.updatedAt.toISOString(),
  };
}
