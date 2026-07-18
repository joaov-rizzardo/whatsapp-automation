import amqp, { type AmqpConnectionManager } from "amqp-connection-manager";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    amqp: AmqpConnectionManager; // managed connection; the channel is created by the consumer
  }
}

/**
 * The AMQP connection, managed the way plugins/prisma.ts manages Postgres —
 * except an AMQP connection can drop and reconnect, so this uses
 * amqp-connection-manager (a wrapper over amqplib with automatic reconnection
 * and topology re-declaration) instead of raw amqplib.
 *
 * Registered ONLY in the worker (worker.ts) this spec: the HTTP process does not
 * publish anything. The decorator already supports both processes, so the
 * messages spec can register it on the server side too with no change here.
 */
async function rabbitmqPlugin(app: FastifyInstance): Promise<void> {
  const log = app.log.child({ plugin: "rabbitmq" });

  const connection = amqp.connect([env.RABBITMQ_URL]);

  connection.on("connect", () => {
    log.info("amqp connection established");
  });
  connection.on("disconnect", ({ err }) => {
    // Reconnection is automatic; log so a flapping broker is visible.
    log.warn({ err: err?.message }, "amqp disconnected, will retry");
  });
  connection.on("connectFailed", ({ err }) => {
    log.error({ err: err?.message }, "amqp connection attempt failed");
  });

  app.decorate("amqp", connection);

  app.addHook("onClose", async (instance) => {
    await instance.amqp.close();
  });
}

export default fp(rabbitmqPlugin, { name: "rabbitmq" });
