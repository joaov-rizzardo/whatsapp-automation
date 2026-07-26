import type { FastifyInstance } from "fastify";

import { createAutomationsRepository } from "./automations.repository.js";
import {
  automationParamsSchema,
  type AutomationParams,
} from "./automations.schema.js";
import { createFlowRepository } from "./flow.repository.js";
import {
  flowResponseSchema,
  publishResponseSchema,
  saveDraftBodySchema,
  saveDraftResponseSchema,
  type SaveDraftInput,
} from "./flow.schema.js";
import { FlowService } from "./flow.service.js";

/**
 * O rascunho e a publicação. Dois arquivos de rota no mesmo módulo é uma
 * extensão consciente da convenção `<feature>.<layer>.ts`: automação e fluxo
 * são um agregado só, e publicar escreve nos dois na mesma transação.
 */
export async function flowRoutes(app: FastifyInstance): Promise<void> {
  const service = new FlowService(
    createAutomationsRepository(app.prisma),
    createFlowRepository(app.prisma),
  );

  app.get(
    "/api/automations/:id/flow",
    {
      preHandler: app.requireOrganization,
      schema: {
        params: automationParamsSchema,
        response: { 200: flowResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params as AutomationParams;
      return service.getFlow(id, request.organizationId);
    },
  );

  app.put(
    "/api/automations/:id/flow",
    {
      preHandler: app.requireOrganization,
      schema: {
        params: automationParamsSchema,
        body: saveDraftBodySchema,
        response: { 200: saveDraftResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params as AutomationParams;
      const body = request.body as SaveDraftInput;
      return service.saveDraft(id, request.organizationId, body);
    },
  );

  app.post(
    "/api/automations/:id/flow/publish",
    {
      preHandler: app.requireOrganization,
      schema: {
        params: automationParamsSchema,
        response: { 200: publishResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params as AutomationParams;
      return service.publish(id, request.organizationId);
    },
  );
}
