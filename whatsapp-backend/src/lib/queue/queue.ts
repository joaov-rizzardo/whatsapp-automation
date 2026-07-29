import {
  Queue,
  Worker,
  type ConnectionOptions,
  type DefaultJobOptions,
  type Processor,
} from "bullmq";
// Named import, not default: under `moduleResolution: NodeNext` ioredis's
// `export { default }` re-export resolves to a namespace, which TypeScript
// refuses as both a type and a constructor.
import { Redis } from "ioredis";

import type { Logger } from "../logger/logger.js";

/**
 * The queue infrastructure, in the same spirit as `lib/evolution/`: framework
 * agnostic (never imports fastify) and knowing nothing about what is queued.
 * Queue names, job names and retry policy belong to the module that owns them,
 * the same way `evolution-events.topology.ts` owns the AMQP topology.
 *
 * Two things live here because getting either wrong is a runtime surprise
 * rather than a compile error: the connection options BullMQ requires, and the
 * fact that a Worker duplicates the connection it is given.
 */

/**
 * BullMQ's Worker blocks on Redis (`BZPOPMIN`) with no timeout, and ioredis
 * would abort those commands after `maxRetriesPerRequest` (20 by default) —
 * which is why BullMQ refuses anything but `null` here. The Worker duplicates
 * this client for its blocking connection (`worker.js`: `.duplicate(...)`), and
 * `duplicate()` copies the options, so setting it once on the shared client is
 * what makes every derived connection correct.
 */
export function createQueueConnection(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    // The default (true) makes the client queue commands offline and resolve
    // them on reconnect. For a job producer that turns a Redis outage into
    // silently pending writes instead of an error the caller can retry.
    enableOfflineQueue: false,
  });
}

/**
 * A queue (the producer side). `defaultJobOptions` is where a module puts its
 * retry policy, so every `add` inherits it and no call site has to remember.
 */
export function createQueue<Payload>(
  name: string,
  connection: ConnectionOptions,
  defaultJobOptions?: DefaultJobOptions,
): Queue<Payload> {
  return new Queue<Payload>(name, { connection, defaultJobOptions });
}

/**
 * A worker (the consumer side). The queue's third kind of input adapter, after
 * `routes.ts` and the AMQP consumers.
 *
 * `autorun: false` is deliberate: the caller starts it in an `onReady` hook, so
 * a job can never be picked up while the plugins it needs are still loading.
 */
export function createWorker<Payload>(
  name: string,
  processor: Processor<Payload, void>,
  options: {
    connection: ConnectionOptions;
    concurrency: number;
    logger: Logger;
  },
): Worker<Payload, void> {
  const worker = new Worker<Payload, void>(name, processor, {
    connection: options.connection,
    concurrency: options.concurrency,
    autorun: false,
  });

  // Without a listener, an `error` on a BullMQ worker is an unhandled emitter
  // error — which takes the process down. These are connection-level problems
  // (a dropped Redis), not job failures: those go to the `failed` listener.
  worker.on("error", (error) => {
    options.logger.error({ queue: name, err: error.message }, "queue worker error");
  });

  return worker;
}
