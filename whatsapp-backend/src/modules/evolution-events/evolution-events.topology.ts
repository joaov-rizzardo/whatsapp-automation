import { env } from "../../config/env.js";

/**
 * The AMQP topology the consumer declares (idempotently) at boot. Values marked
 * "captured" were confirmed against the live broker on 2026-07-17 (v2.3.7),
 * management UI at http://localhost:15672 — see docs/evolution/05-webhooks.md.
 */
export const topology = {
  /** Owned by Evolution; we declare it with the same params so assertExchange won't fail. */
  exchange: env.RABBITMQ_EVOLUTION_EXCHANGE,
  exchangeType: "topic" as const, // captured

  /** Our own durable queue — independent of Evolution's auto-created queues. */
  queue: "whatsapp-backend.evolution-events",

  /**
   * Evolution publishes with lowercase-dotted routing keys (`connection.update`,
   * `qrcode.updated` — captured). The uppercase-underscore variants are bound
   * too, defensively, because Evolution also creates those bindings on its own
   * queues and a future version might publish with them.
   */
  routingKeys: [
    "connection.update",
    "CONNECTION_UPDATE",
    "qrcode.updated",
    "QRCODE_UPDATED",
  ],

  /** Dead-letter target for permanently-rejected messages. */
  deadLetterExchange: "whatsapp-backend.dlx",
  deadLetterQueue: "whatsapp-backend.evolution-events.dead",

  /** Backpressure: at most this many unacked messages in flight. */
  prefetch: 10,
} as const;
