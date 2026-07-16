import type { FastifyInstance } from "fastify";

import { UnauthorizedError } from "../../shared/errors.js";

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/me",
    {
      preHandler: app.requireAuth,
      schema: {
        // The response schema is what stops unintended fields (a password hash,
        // a token) from ever reaching the client, whatever the session carries.
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              emailVerified: { type: "boolean" },
              image: { type: ["string", "null"] },
            },
            required: ["id", "name", "email", "emailVerified"],
            additionalProperties: false,
          },
        },
      },
    },
    async (request) => {
      if (!request.user) {
        throw new UnauthorizedError();
      }

      return request.user;
    },
  );
}
