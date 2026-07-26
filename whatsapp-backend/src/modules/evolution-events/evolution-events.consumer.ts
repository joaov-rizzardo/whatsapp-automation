import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { createWhatsappConnectionRepository } from "../whatsapp-connection/whatsapp-connection.repository.js";
import { WhatsappConnectionService } from "../whatsapp-connection/whatsapp-connection.service.js";
import { startQueueConsumer } from "./evolution-events.runner.js";
import { topology } from "./evolution-events.topology.js";

/**
 * The connection-events consumer — an input adapter, the queue-side counterpart
 * of routes.ts. It is thin on purpose: it builds the one service it drives and
 * hands the queue to the shared runner, which owns the ack/nack/DLQ policy. No
 * business logic lives here (it lives in the service, tested in isolation), so
 * this file is verified by running against the broker (spec 003 §5/§6), not by
 * a unit test.
 */
async function evolutionEventsConsumer(app: FastifyInstance): Promise<void> {
  const service = new WhatsappConnectionService(
    createWhatsappConnectionRepository(app.prisma),
    app.evolution,
    app.log.child({ module: "whatsapp-connection" }),
  );

  startQueueConsumer(app, {
    name: "evolution-events",
    queue: topology.connectionEvents.queue,
    routingKeys: topology.connectionEvents.routingKeys,
    prefetch: topology.connectionEvents.prefetch,
    log: app.log.child({ module: "evolution-events" }),
    handle: ({ instance, event, data }) =>
      service.handleEvolutionEvent(instance, event, data),
  });
}

export default fp(evolutionEventsConsumer, {
  name: "evolution-events",
  dependencies: ["prisma", "evolution", "rabbitmq"],
});
