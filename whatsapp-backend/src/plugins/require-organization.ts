import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import fp from "fastify-plugin";

import { OrganizationRequiredError } from "../shared/errors.js";

declare module "fastify" {
  interface FastifyInstance {
    requireOrganization: preHandlerAsyncHookHandler[];
  }

  interface FastifyRequest {
    /** Only meaningful behind requireOrganization, which is what fills it. */
    organizationId: string;
  }
}

async function requireOrganizationPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest("organizationId", "");

  // An array, so `preHandler: app.requireOrganization` authenticates *and*
  // checks the organization. A guard that only checked the id would depend on
  // every future route remembering to add requireAuth before it — and the day
  // someone forgets, the route is simply open.
  const requireOrganization: preHandlerAsyncHookHandler[] = [
    app.requireAuth,
    async (request) => {
      if (!request.activeOrganizationId) {
        throw new OrganizationRequiredError();
      }

      request.organizationId = request.activeOrganizationId;
    },
  ];

  app.decorate("requireOrganization", requireOrganization);
}

export default fp(requireOrganizationPlugin, {
  name: "require-organization",
  dependencies: ["require-auth"],
});
