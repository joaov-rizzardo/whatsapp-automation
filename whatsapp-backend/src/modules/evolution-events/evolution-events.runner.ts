import type { Channel } from "amqp-connection-manager";
import type { ConsumeMessage } from "amqplib";
import type { FastifyInstance } from "fastify";

import type { Logger } from "../../lib/logger/logger.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { topology } from "./evolution-events.topology.js";

/** What to do with a message after handling it. */
type Decision = "ack" | "dead" | "requeue";

/** Config name -> received name: "connection.update" -> "CONNECTION_UPDATE". */
function normalizeEvent(event: string): string {
  return event.replace(/[.-]/g, "_").toUpperCase();
}

/** The envelope every Evolution event shares, once parsed. */
export interface EvolutionEnvelope {
  instance: string;
  /** Already normalized to CONNECTION_UPDATE / MESSAGES_UPSERT / … */
  event: string;
  data: unknown;
}

export interface QueueConsumerOptions {
  /** Channel name in the broker's connection list — one per consumer. */
  name: string;
  queue: string;
  routingKeys: readonly string[];
  prefetch: number;
  log: Logger;
  handle: (envelope: EvolutionEnvelope) => Promise<void>;
}

/**
 * Runs one queue consumer: declares its topology, consumes, and decides
 * ack/nack. It exists because there are two consumers now (connection events
 * and inbound messages) and the ack/nack/dead-letter policy is the easy thing
 * to let drift between two copied files.
 *
 * What stays out of here on purpose: parsing the event's `data` and any business
 * rule. A consumer is an input adapter, the queue-side counterpart of routes.ts
 * — it parses the envelope, calls one service, and reports back. That is why
 * neither consumer gets a unit test (spec 003 §5): they are verified running
 * against the real broker.
 */
export function startQueueConsumer(
  app: FastifyInstance,
  options: QueueConsumerOptions,
): void {
  const { log, handle } = options;

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
      await handle({ instance, event, data: record.data });
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

  // Declared idempotently on every (re)connect. `ch` is the raw amqplib channel
  // here — it has assertExchange/assertQueue/bindQueue/prefetch.
  const channel = app.amqp.createChannel({
    name: options.name,
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
      await ch.assertQueue(options.queue, {
        durable: true,
        deadLetterExchange: topology.deadLetterExchange,
      });
      for (const key of options.routingKeys) {
        await ch.bindQueue(options.queue, topology.exchange, key);
      }
      await ch.prefetch(options.prefetch);
    },
  });

  // Start consuming once the app is ready, so prisma/evolution/service are set.
  app.addHook("onReady", async () => {
    await channel.waitForConnect();
    await channel.consume(
      options.queue,
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
    log.info({ queue: options.queue }, "consuming");
  });

  app.addHook("onClose", async () => {
    await channel.close();
  });
}
