import { z } from "zod";

import { automationSchema } from "@/features/automations/schemas/automation";
import { customVariableTypes } from "@/features/flows/types/variable";

/**
 * O documento do fluxo — o mesmo formato dos dois lados (spec 006, §4.1). O que
 * o editor carrega e o que ele salva; o backend congela uma cópia disto a cada
 * publicação.
 *
 * O `data` de cada nó é opaco aqui de propósito: quem o tipa é a definição do
 * bloco no registry, e é isso que faz um bloco novo não mexer neste arquivo.
 */

/** A versão de formato que este cliente escreve. */
export const FLOW_SCHEMA_VERSION = 1;

export const flowNodeDocumentSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

/** A aresta não guarda `type`: ele é da apresentação, reaplicado no carregamento. */
export const flowEdgeDocumentSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string(),
  target: z.string(),
  targetHandle: z.string(),
});

/** Só as personalizadas — as de sistema são constantes do runtime. */
export const flowVariableDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(customVariableTypes),
  initialValue: z.string(),
});

export const flowViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export const flowDocumentSchema = z.object({
  schemaVersion: z.number(),
  nodes: z.array(flowNodeDocumentSchema),
  edges: z.array(flowEdgeDocumentSchema),
  variables: z.array(flowVariableDocumentSchema),
  viewport: flowViewportSchema.optional(),
});

/** O que `GET /api/automations/:id/flow` devolve. */
export const flowResponseSchema = z.object({
  version: z.number(),
  updatedAt: z.string(),
  document: flowDocumentSchema,
  automation: automationSchema,
});

/** O que o PUT devolve — sem o documento, que quem salvou já tem. */
export const savedFlowSchema = z.object({
  version: z.number(),
  updatedAt: z.string(),
  automation: automationSchema,
});

export const publishedFlowSchema = z.object({
  versionNumber: z.number(),
  publishedAt: z.string(),
  automation: automationSchema,
});

export type FlowDocument = z.infer<typeof flowDocumentSchema>;
export type FlowNodeDocument = z.infer<typeof flowNodeDocumentSchema>;
export type FlowEdgeDocument = z.infer<typeof flowEdgeDocumentSchema>;
export type FlowVariableDocument = z.infer<typeof flowVariableDocumentSchema>;
export type FlowViewport = z.infer<typeof flowViewportSchema>;
export type FlowResponse = z.infer<typeof flowResponseSchema>;
export type SavedFlow = z.infer<typeof savedFlowSchema>;
export type PublishedFlow = z.infer<typeof publishedFlowSchema>;
