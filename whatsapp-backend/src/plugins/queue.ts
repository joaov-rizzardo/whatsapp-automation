import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { Redis } from "ioredis";

import { env } from "../config/env.js";
import { createQueueConnection } from "../lib/queue/queue.js";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * The shared Redis connection. Decorated instead of a Queue because Redis
     * is used for two things here: BullMQ (which builds its own Queue/Worker on
     * top of this client) and the inbound-message dedupe key, which is a plain
     * `SET NX EX` and has no business going through a queue.
     */
    redis: Redis;
  }
}

/**
 * The Redis connection, managed the way plugins/rabbitmq.ts manages AMQP: one
 * client per process, closed on shutdown.
 *
 * Registered ONLY in the worker (worker.ts): nothing in the HTTP process
 * enqueues or dedupes, and the same criterion kept `rabbitmq.ts` off the server.
 * The decorator already supports both, so the day a route needs to enqueue,
 * that is one `register` line and no change here.
 */
async function queuePlugin(app: FastifyInstance): Promise<void> {
  const log = app.log.child({ plugin: "queue" });

  const connection = createQueueConnection(env.REDIS_URL);

  connection.on("connect", () => {
    log.info("redis connection established");
  });
  connection.on("error", (err: Error) => {
    // ioredis reconnects on its own; log so a flapping Redis is visible. Without
    // a listener this event is an unhandled emitter error and kills the process.
    log.error({ err: err.message }, "redis connection error");
  });

  app.decorate("redis", connection);

  app.addHook("onClose", async (instance) => {
    // quit() waits for pending commands; disconnect() would drop a job mid-add.
    await instance.redis.quit();
  });
}

export default fp(queuePlugin, { name: "queue" });
