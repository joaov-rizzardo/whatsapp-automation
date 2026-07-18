import type { FastifyInstance } from "fastify";

import { NotFoundError } from "../../shared/errors.js";
import { createWhatsappConnectionRepository } from "./whatsapp-connection.repository.js";
import { WhatsappConnectionService } from "./whatsapp-connection.service.js";
import {
  connectBodySchema,
  connectionResponseSchema,
  type ConnectInput,
} from "./whatsapp-connection.schema.js";

/**
 * HTTP surface for the WhatsApp connection. Every route is behind
 * requireOrganization, so `request.organizationId` is set and is the ONLY source
 * of the organization — never the body. The instance slug is read from our own
 * database (Better Auth's organization table) via organizationId, never sent by
 * the client.
 */
export async function whatsappConnectionRoutes(
  app: FastifyInstance,
): Promise<void> {
  const repository = createWhatsappConnectionRepository(app.prisma);
  const service = new WhatsappConnectionService(
    repository,
    app.evolution,
    app.log.child({ module: "whatsapp-connection" }),
  );

  async function resolveSlug(organizationId: string): Promise<string> {
    const organization = await app.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    if (!organization) {
      // The session pointed at an organization that no longer exists.
      throw new NotFoundError("Organização não encontrada.");
    }
    return organization.slug;
  }

  app.get(
    "/api/whatsapp/connection",
    {
      preHandler: app.requireOrganization,
      schema: { response: { 200: connectionResponseSchema } },
    },
    async (request) => {
      return service.getConnection(request.organizationId);
    },
  );

  app.post(
    "/api/whatsapp/connection",
    {
      preHandler: app.requireOrganization,
      schema: {
        body: connectBodySchema,
        response: { 200: connectionResponseSchema },
      },
    },
    async (request) => {
      const body = request.body as ConnectInput;
      const slug = await resolveSlug(request.organizationId);
      return service.connect(request.organizationId, slug, body);
    },
  );

  app.delete(
    "/api/whatsapp/connection",
    { preHandler: app.requireOrganization },
    async (request, reply) => {
      await service.disconnect(request.organizationId);
      return reply.status(204).send();
    },
  );
}
