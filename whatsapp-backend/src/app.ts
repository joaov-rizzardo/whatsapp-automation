import Fastify, { type FastifyInstance } from "fastify";

import { env } from "./config/env.js";
import authPlugin from "./plugins/auth.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import prismaPlugin from "./plugins/prisma.js";
import requireAuthPlugin from "./plugins/require-auth.js";
import { meRoutes } from "./modules/me/me.routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  // Dependency order: prisma -> auth -> require-auth -> error handler -> modules.
  app.register(prismaPlugin);
  app.register(authPlugin);
  app.register(requireAuthPlugin);
  app.register(errorHandlerPlugin);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(meRoutes);

  return app;
}
