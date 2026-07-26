import type { FastifyInstance } from "fastify";

import { createAutomationsRepository } from "./automations.repository.js";
import { AutomationsService } from "./automations.service.js";
import {
  automationListResponseSchema,
  automationParamsSchema,
  automationResponseSchema,
  createAutomationBodySchema,
  updateAutomationBodySchema,
  type AutomationParams,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "./automations.schema.js";
import { createFlowRepository } from "./flow.repository.js";

/**
 * CRUD da automação. Toda rota está atrás de `requireOrganization`, então
 * `request.organizationId` vem da sessão e é a ÚNICA fonte da organização —
 * nunca o corpo, nunca a URL. Automação de outra organização responde 404.
 */
export async function automationsRoutes(app: FastifyInstance): Promise<void> {
  const service = new AutomationsService(
    createAutomationsRepository(app.prisma),
    createFlowRepository(app.prisma),
  );

  app.get(
    "/api/automations",
    {
      preHandler: app.requireOrganization,
      schema: { response: { 200: automationListResponseSchema } },
    },
    async (request) => service.list(request.organizationId),
  );

  app.post(
    "/api/automations",
    {
      preHandler: app.requireOrganization,
      schema: {
        body: createAutomationBodySchema,
        response: { 201: automationResponseSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as CreateAutomationInput;
      const created = await service.create(request.organizationId, body);
      return reply.status(201).send(created);
    },
  );

  app.get(
    "/api/automations/:id",
    {
      preHandler: app.requireOrganization,
      schema: {
        params: automationParamsSchema,
        response: { 200: automationResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params as AutomationParams;
      return service.get(id, request.organizationId);
    },
  );

  app.patch(
    "/api/automations/:id",
    {
      preHandler: app.requireOrganization,
      schema: {
        params: automationParamsSchema,
        body: updateAutomationBodySchema,
        response: { 200: automationResponseSchema },
      },
    },
    async (request) => {
      const { id } = request.params as AutomationParams;
      const body = request.body as UpdateAutomationInput;
      return service.update(id, request.organizationId, body);
    },
  );

  app.delete(
    "/api/automations/:id",
    {
      preHandler: app.requireOrganization,
      schema: { params: automationParamsSchema },
    },
    async (request, reply) => {
      const { id } = request.params as AutomationParams;
      await service.remove(id, request.organizationId);
      return reply.status(204).send();
    },
  );

  app.post(
    "/api/automations/:id/duplicate",
    {
      preHandler: app.requireOrganization,
      schema: {
        params: automationParamsSchema,
        response: { 201: automationResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as AutomationParams;
      const copy = await service.duplicate(id, request.organizationId);
      return reply.status(201).send(copy);
    },
  );
}
