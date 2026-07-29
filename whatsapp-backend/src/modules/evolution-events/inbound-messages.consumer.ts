import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { InboundMessageService } from "../inbound-messages/inbound-messages.service.js";
import { createWhatsappConnectionRepository } from "../whatsapp-connection/whatsapp-connection.repository.js";
import { startQueueConsumer } from "./evolution-events.runner.js";
import { topology } from "./evolution-events.topology.js";

const MESSAGES_UPSERT = "MESSAGES_UPSERT";

/**
 * The inbound-messages consumer (spec 007) — the second queue adapter, on its
 * own queue so that a burst of messages never leaves a CONNECTION_UPDATE
 * waiting behind it.
 *
 * As thin as its sibling: it builds the one service it drives and hands the
 * queue to the shared runner, which owns the ack/nack/DLQ policy. No unit test,
 * by the same rule (spec 003 §5) — it is verified running against the broker.
 */
async function inboundMessagesConsumer(app: FastifyInstance): Promise<void> {
  const log = app.log.child({ module: "inbound-messages" });

  // The repository satisfies ConnectionLookup structurally: the service only
  // ever needs "which organization owns this instance".
  const service = new InboundMessageService(
    createWhatsappConnectionRepository(app.prisma),
    log,
    () => new Date(),
    // The engine, as a sink. The consumer still drives ONE service — this is
    // the composition root wiring 007 to 008, not the consumer knowing both.
    { handle: (message) => app.flowRuntime.onInboundMessage(message) },
  );

  startQueueConsumer(app, {
    name: "inbound-messages",
    queue: topology.inboundMessages.queue,
    routingKeys: topology.inboundMessages.routingKeys,
    prefetch: topology.inboundMessages.prefetch,
    log,
    handle: async ({ instance, event, data }) => {
      // The queue is bound to messages.upsert only; this guards against a
      // binding added by hand on the broker, and costs one comparison.
      if (event !== MESSAGES_UPSERT) {
        log.debug({ event }, "ignoring unsubscribed event");
        return;
      }
      await service.handleInboundMessage(instance, data);
    },
  });
}

export default fp(inboundMessagesConsumer, {
  name: "inbound-messages",
  // flow-runtime-worker decorates app.flowRuntime, the sink this consumer feeds.
  dependencies: ["prisma", "rabbitmq", "flow-runtime-worker"],
});
