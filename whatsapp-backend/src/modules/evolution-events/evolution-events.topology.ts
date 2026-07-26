import { env } from "../../config/env.js";

/**
 * The AMQP topology the consumers declare (idempotently) at boot. Values marked
 * "captured" were confirmed against the live broker on 2026-07-17 (v2.3.7),
 * management UI at http://localhost:15672 — see docs/evolution/05-webhooks.md.
 *
 * Two queues on the one exchange Evolution owns, one per consumer (spec 007):
 * messages are by far the highest-volume event, and sharing a queue with the
 * connection events would leave a CONNECTION_UPDATE waiting behind a burst of
 * them (head-of-line blocking). Separate queues also mean separate prefetch,
 * and either consumer can be paused or scaled on its own.
 */
export const topology = {
  /** Owned by Evolution; we declare it with the same params so assertExchange won't fail. */
  exchange: env.RABBITMQ_EVOLUTION_EXCHANGE,
  exchangeType: "topic" as const, // captured

  /**
   * Connection lifecycle — drives WhatsappConnectionService (spec 003).
   *
   * Evolution publishes with lowercase-dotted routing keys (`connection.update`,
   * `qrcode.updated` — captured). The uppercase-underscore variants are bound
   * too, defensively, because Evolution also creates those bindings on its own
   * queues and a future version might publish with them.
   */
  connectionEvents: {
    queue: "whatsapp-backend.evolution-events",
    routingKeys: [
      "connection.update",
      "CONNECTION_UPDATE",
      "qrcode.updated",
      "QRCODE_UPDATED",
    ],
    /** Backpressure: at most this many unacked messages in flight. */
    prefetch: 10,
  },

  /**
   * Inbound messages — drives InboundMessageService (spec 007). The prefetch is
   * a starting point, not a truth: the handler is a log today, and the number
   * goes back on the table the day it becomes "run a flow".
   */
  inboundMessages: {
    queue: "whatsapp-backend.inbound-messages",
    routingKeys: ["messages.upsert", "MESSAGES_UPSERT"],
    prefetch: 20,
  },

  /**
   * One dead-letter target for both queues. The dead queue is bound with `#`, so
   * it already catches whatever either queue rejects, and dead-lettering keeps
   * the original routing key — enough to tell a message from a connection event
   * apart while inspecting. A second `#`-bound queue would store every dead
   * message twice; the slightly-off name is the cheaper trade (renaming means
   * deleting the queue on the broker by hand).
   */
  deadLetterExchange: "whatsapp-backend.dlx",
  deadLetterQueue: "whatsapp-backend.evolution-events.dead",
} as const;
