import type { FromSchema } from "json-schema-to-ts";

import { automationResponseSchema } from "./automations.schema.js";

/**
 * O documento do fluxo — o contrato entre o editor e o banco (spec 006, §4.1).
 * Uma forma só: é o que o rascunho guarda e o que cada versão publicada congela.
 *
 * O `data` de cada nó é OPACO aqui de propósito. Quem o tipa é o registry de
 * blocos (`blocks/`), um schema por tipo — é isso que faz um bloco novo custar
 * um arquivo e nenhuma migração.
 */

/** A maior versão de formato que este backend sabe ler. */
export const SUPPORTED_SCHEMA_VERSION = 1;

const positionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y"],
  properties: {
    x: { type: "number" },
    y: { type: "number" },
  },
} as const;

const flowNodeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "position", "data"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    type: { type: "string", minLength: 1, maxLength: 60 },
    position: positionSchema,
    // Opaco para o envelope, validado pelo `dataSchema` do tipo.
    data: { type: "object", additionalProperties: true },
  },
} as const;

/**
 * A aresta NÃO guarda `type`: ele é da apresentação (`FlowEdge`) e é reaplicado
 * no carregamento. Os dois handles são obrigatórios porque são eles que o motor
 * vai usar para escolher a saída — "dado o nó atual e a saída escolhida, qual é
 * o alvo" é uma busca por `(source, sourceHandle)`.
 */
const flowEdgeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "source", "sourceHandle", "target", "targetHandle"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 200 },
    source: { type: "string", minLength: 1, maxLength: 120 },
    sourceHandle: { type: "string", minLength: 1, maxLength: 120 },
    target: { type: "string", minLength: 1, maxLength: 120 },
    targetHandle: { type: "string", minLength: 1, maxLength: 120 },
  },
} as const;

/**
 * Só variáveis personalizadas entram no documento. As de sistema (`hora`,
 * `nome`…) são constantes do runtime, de que o backend é dono
 * (`blocks/system-variables.ts`) — gravá-las seria congelar uma lista nossa
 * dentro do fluxo do usuário.
 */
const flowVariableSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "type", "initialValue"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 120 },
    name: { type: "string", minLength: 1, maxLength: 40, pattern: "^[a-z][a-z0-9_]*$" },
    type: { type: "string", enum: ["text", "number", "boolean"] },
    initialValue: { type: "string", maxLength: 500 },
  },
} as const;

const viewportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y", "zoom"],
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    zoom: { type: "number" },
  },
} as const;

/**
 * `schemaVersion` é o que permite mudar este formato sem quebrar o que já está
 * gravado: o backend recusa versão maior do que conhece, e o dia em que houver
 * um salto ganha uma função de migração por salto.
 *
 * `position` e `viewport` viajam junto, inclusive no publicado — são ignorados
 * pelo motor, e compram abrir uma versão publicada exatamente como foi
 * desenhada.
 */
export const flowDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "nodes", "edges", "variables"],
  properties: {
    schemaVersion: { type: "integer", minimum: 1 },
    nodes: { type: "array", items: flowNodeSchema, minItems: 1, maxItems: 500 },
    edges: { type: "array", items: flowEdgeSchema, maxItems: 2000 },
    variables: { type: "array", items: flowVariableSchema, maxItems: 200 },
    viewport: viewportSchema,
  },
} as const;

export type FlowDocument = FromSchema<typeof flowDocumentSchema>;
export type FlowNodeDocument = FromSchema<typeof flowNodeSchema>;
export type FlowEdgeDocument = FromSchema<typeof flowEdgeSchema>;
export type FlowVariableDocument = FromSchema<typeof flowVariableSchema>;
export type FlowVariableType = FlowVariableDocument["type"];

// --- Corpos e respostas das rotas -------------------------------------------

/**
 * O `version` do corpo é a trava otimista: é a versão do rascunho que o cliente
 * carregou. Não bater é 409, nunca sobrescrita silenciosa.
 */
export const saveDraftBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "document"],
  properties: {
    version: { type: "integer", minimum: 1 },
    document: flowDocumentSchema,
  },
} as const;

export type SaveDraftInput = FromSchema<typeof saveDraftBodySchema>;

/**
 * O documento sai como objeto livre nas RESPOSTAS. Declarar o envelope inteiro
 * aqui faria o serializador do Fastify podar o `data` de cada bloco — que é
 * justamente a parte que ele não conhece — e a perda seria silenciosa.
 */
const documentResponseSchema = {
  type: "object",
  additionalProperties: true,
} as const;

export const flowResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "updatedAt", "document", "automation"],
  properties: {
    version: { type: "integer" },
    updatedAt: { type: "string" },
    document: documentResponseSchema,
    automation: automationResponseSchema,
  },
} as const;

export const saveDraftResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "updatedAt", "automation"],
  properties: {
    version: { type: "integer" },
    updatedAt: { type: "string" },
    automation: automationResponseSchema,
  },
} as const;

export const publishResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["versionNumber", "publishedAt", "automation"],
  properties: {
    versionNumber: { type: "integer" },
    publishedAt: { type: "string" },
    automation: automationResponseSchema,
  },
} as const;
