import Fastify from "fastify";

import { env } from "./config/env.js";
import evolutionPlugin from "./plugins/evolution.js";
import prismaPlugin from "./plugins/prisma.js";
import rabbitmqPlugin from "./plugins/rabbitmq.js";
import evolutionEventsConsumer from "./modules/evolution-events/evolution-events.consumer.js";

/**
 * The backend's second process. It mirrors server.ts in shape but never opens a
 * socket: a Fastify instance is used only to reuse the plugin system, the logger
 * and the graceful shutdown. It registers just the infra the consumer needs
 * (prisma, evolution, rabbitmq) plus the consumer, and calls app.ready() — not
 * app.listen(). listen() stays exclusive to server.ts (the "app factory" rule).
 */
const app = Fastify({
  logger: env.NODE_ENV !== "test",
});

async function start(): Promise<void> {
  try {
    await app.register(prismaPlugin);
    await app.register(evolutionPlugin);
    await app.register(rabbitmqPlugin);
    await app.register(evolutionEventsConsumer);
    await app.ready(); // the consumer's onReady starts consuming here
    app.log.info("worker ready, consuming evolution events");
  } catch (err) {
    app.log.error(err, "worker failed to start");
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    // onClose closes the channel, the AMQP connection and Prisma.
    await app.close();
    process.exit(0);
  });
}

start();
