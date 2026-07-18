import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env.js";
import {
  createEvolutionClient,
  type EvolutionClient,
} from "../lib/evolution/evolution-client.js";

declare module "fastify" {
  interface FastifyInstance {
    evolution: EvolutionClient;
  }
}

/**
 * Decorates `app.evolution` with the HTTP client, mirroring `plugins/prisma.ts`.
 * The client is stateless HTTP, so there is no `onClose`. Registered in both
 * entrypoints: `server.ts` (connect/disconnect routes) and `worker.ts` (the
 * service is built with the client, even though `handleEvolutionEvent` only
 * touches our own database).
 */
async function evolutionPlugin(app: FastifyInstance): Promise<void> {
  const client = createEvolutionClient({
    baseUrl: env.EVOLUTION_API_URL,
    apiKey: env.EVOLUTION_API_KEY,
    logger: app.log.child({ plugin: "evolution" }),
  });

  app.decorate("evolution", client);
}

export default fp(evolutionPlugin, { name: "evolution" });
