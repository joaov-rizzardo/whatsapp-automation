import type { Queue } from "bullmq";

import type { JobPayload, Scheduler } from "./flow-runtime.types.js";

/**
 * A implementação BullMQ da porta `Scheduler`. É o único arquivo do módulo que
 * sabe que existe uma fila — o serviço fala em "agende isto", e aqui vira job.
 */

/** Uma fila só: os quatro jobs disputam o mesmo recurso, a execução. */
export const FLOW_RUNTIME_QUEUE = "flow-runtime";

/**
 * Três tentativas com backoff exponencial a partir de 5s (≈35s de janela): uma
 * instabilidade curta da Evolution não pode custar a conversa. Esgotadas, o
 * listener `failed` do worker encerra a execução e libera o contato.
 */
export const FLOW_RUNTIME_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 3_600 },
  removeOnFail: { age: 24 * 3_600 },
};

export function createQueueScheduler(queue: Queue<JobPayload>): Scheduler {
  return {
    async schedule(job) {
      await queue.add(job.name, job.payload, {
        ...(job.delayMs === undefined ? {} : { delay: job.delayMs }),
        ...(job.jobId === undefined ? {} : { jobId: job.jobId }),
        ...(job.debounce === undefined
          ? {}
          : {
              // O modo debounce da deduplicação (verificado no BullMQ 5.81.2):
              // `replace` tira o job anterior de `delayed` e põe este no lugar,
              // `extend` empurra o TTL para a frente. Três mensagens picadas
              // viram uma retomada, `groupingSeconds` depois da última.
              deduplication: {
                id: job.debounce.key,
                ttl: job.debounce.ttlMs,
                extend: true,
                replace: true,
              },
            }),
      });
    },
  };
}
