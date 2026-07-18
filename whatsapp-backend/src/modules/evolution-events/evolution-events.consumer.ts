import type { Channel } from "amqp-connection-manager";
import type { ConsumeMessage } from "amqplib";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { createWhatsappConnectionRepository } from "../whatsapp-connection/whatsapp-connection.repository.js";
import { WhatsappConnectionService } from "../whatsapp-connection/whatsapp-connection.service.js";
import { topology } from "./evolution-events.topology.js";

/** What to do with a message after handling it. */
type Decision = "ack" | "dead" | "requeue";

/** Config name -> received name: "connection.update" -> "CONNECTION_UPDATE". */
function normalizeEvent(event: string): string {
  return event.replace(/[.-]/g, "_").toUpperCase();
}

/**
 * The evolution-events consumer — an input adapter, the queue-side counterpart
 * of routes.ts. It is thin: parse the message, normalize the event, call the one
 * service, and decide ack/nack. No business logic lives here (it lives in the
 * service, tested in isolation), so this file is verified by running against the
 * broker (spec 003 §5/§6), not by a unit test.
 */
async function evolutionEventsConsumer(app: FastifyInstance): Promise<void> {
  const log = app.log.child({ module: "evolution-events" });

  const service = new WhatsappConnectionService(
    createWhatsappConnectionRepository(app.prisma),
    app.evolution,
    app.log.child({ module: "whatsapp-connection" }),
  );

  async function decide(msg: ConsumeMessage): Promise<Decision> {
    let envelope: unknown;
    try {
      envelope = JSON.parse(msg.content.toString());
    } catch {
      log.error({ routingKey: msg.fields.routingKey }, "unparseable message");
      return "dead"; // permanent — never parseable, don't requeue
    }

    if (typeof envelope !== "object" || envelope === null) return "dead";
    const record = envelope as Record<string, unknown>;

    const instance = record.instance;
    if (typeof instance !== "string") {
      log.error("message without a string instance");
      return "dead";
    }

    // The event name can come from the body or the routing key — both arrive
    // lowercase-dotted and go through the same normalization.
    const rawEvent =
      typeof record.event === "string" ? record.event : msg.fields.routingKey;
    const event = normalizeEvent(rawEvent);

    try {
      await service.handleEvolutionEvent(instance, event, record.data);
      return "ack";
    } catch (err) {
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        // Permanent: unknown instance / invalid payload. Dead-letter it.
        log.warn(
          { instance, event, err: (err as Error).message },
          "permanent handling error, dead-lettering",
        );
        return "dead";
      }
      // Transient (e.g. Postgres momentarily down): requeue once, then give up.
      log.error({ instance, event, err }, "transient handling error");
      return "requeue";
    }
  }

  // Declared idempotently on every (re)connect. `channel` is the raw amqplib
  // channel here — it has assertExchange/assertQueue/bindQueue/prefetch.
  const channel = app.amqp.createChannel({
    name: "evolution-events",
    confirm: false,
    setup: async (ch: Channel) => {
      await ch.assertExchange(topology.exchange, topology.exchangeType, {
        durable: true,
      });
      await ch.assertExchange(topology.deadLetterExchange, "topic", {
        durable: true,
      });
      await ch.assertQueue(topology.deadLetterQueue, { durable: true });
      await ch.bindQueue(
        topology.deadLetterQueue,
        topology.deadLetterExchange,
        "#",
      );
      await ch.assertQueue(topology.queue, {
        durable: true,
        deadLetterExchange: topology.deadLetterExchange,
      });
      for (const key of topology.routingKeys) {
        await ch.bindQueue(topology.queue, topology.exchange, key);
      }
      await ch.prefetch(topology.prefetch);
    },
  });

  // Start consuming once the app is ready, so prisma/evolution/service are set.
  app.addHook("onReady", async () => {
    await channel.waitForConnect();
    await channel.consume(
      topology.queue,
      async (msg: ConsumeMessage) => {
        const decision = await decide(msg);
        if (decision === "ack") {
          channel.ack(msg);
        } else if (decision === "dead") {
          channel.nack(msg, false, false); // -> dead-letter exchange
        } else if (msg.fields.redelivered) {
          // Already retried once and still failing — stop the loop, dead-letter.
          log.warn(
            { routingKey: msg.fields.routingKey },
            "redelivered message still failing, dead-lettering",
          );
          channel.nack(msg, false, false);
        } else {
          channel.nack(msg, false, true); // requeue once
        }
      },
      { noAck: false },
    );
    log.info({ queue: topology.queue }, "consuming evolution events");
  });

  app.addHook("onClose", async () => {
    await channel.close();
  });
}

export default fp(evolutionEventsConsumer, {
  name: "evolution-events",
  dependencies: ["prisma", "evolution", "rabbitmq"],
});
