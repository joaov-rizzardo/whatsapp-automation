import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { createQueue, createWorker } from "../../lib/queue/queue.js";
import { createFlowRepository } from "../automations/flow.repository.js";
import { createWhatsappConnectionRepository } from "../whatsapp-connection/whatsapp-connection.repository.js";
import { createFlowRuntimeRepository } from "./flow-runtime.repository.js";
import { FlowRuntimeService, type StepJob } from "./flow-runtime.service.js";
import type { JobName, JobPayload } from "./flow-runtime.types.js";
import {
  FLOW_RUNTIME_JOB_OPTIONS,
  FLOW_RUNTIME_QUEUE,
  createQueueScheduler,
} from "./scheduler.js";
import {
  createRedisDeduplicator,
  createWhatsappGateway,
} from "./whatsapp-gateway.js";

/**
 * O adapter de fila — a **terceira espécie de porta de entrada** do backend,
 * depois de `routes.ts` (HTTP) e dos consumers AMQP. Monta a service, roteia os
 * quatro nomes de job para ela, e nada mais.
 *
 * Sem teste de unidade, pelo mesmo critério dos consumers (spec 003 §5): casca
 * sobre infra externa, verificada rodando. Toda regra que valeria a pena testar
 * está na service, e está.
 */

/** Concorrência: quantas execuções o worker caminha ao mesmo tempo. */
const CONCURRENCY = 10;
/** O `expire` roda sozinho, de tempos em tempos: zumbi não segura contato. */
const EXPIRE_EVERY_MS = 5 * 60 * 1000;

async function flowRuntimeWorker(app: FastifyInstance): Promise<void> {
  const log = app.log.child({ module: "flow-runtime" });

  const queue = createQueue<JobPayload>(
    FLOW_RUNTIME_QUEUE,
    app.redis,
    FLOW_RUNTIME_JOB_OPTIONS,
  );

  const service = new FlowRuntimeService({
    repository: createFlowRuntimeRepository(app.prisma),
    // O repositório de fluxos satisfaz `PublishedFlowLookup` estruturalmente:
    // o motor só precisa de "quais versões podem responder" e "qual documento".
    flows: createFlowRepository(app.prisma),
    scheduler: createQueueScheduler(queue),
    gateway: createWhatsappGateway({
      evolution: app.evolution,
      connections: createWhatsappConnectionRepository(app.prisma),
    }),
    dedupe: createRedisDeduplicator(app.redis),
    logger: log,
  });

  // A service também é a ponta que o consumer da 007 chama. Decorar aqui é o
  // que deixa `worker.ts` ligar os dois sem que nenhum módulo conheça o outro.
  app.decorate("flowRuntime", service);

  const worker = createWorker<JobPayload>(
    FLOW_RUNTIME_QUEUE,
    async (job) => {
      const name = job.name as JobName;

      if (name === "expire") {
        await service.expireStale();
        return;
      }

      await service.runStep({
        name: name as StepJob["name"],
        executionId: job.data.executionId,
        token: job.data.token,
      });
    },
    { connection: app.redis, concurrency: CONCURRENCY, logger: log },
  );

  // A única regra que este arquivo carrega, e ela é curta de propósito: quando
  // as tentativas acabam, a execução precisa terminar e o contato precisa ser
  // liberado. Sem isto, ela fica `running` para sempre e a pessoa fica sem
  // chatbot até o `expire` varrer — 24h por uma queda de dez segundos.
  worker.on("failed", (job, error) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    const attempts = job?.opts.attempts ?? FLOW_RUNTIME_JOB_OPTIONS.attempts;
    log.warn(
      { jobId: job?.id, name: job?.name, attemptsMade, err: error.message },
      "flow runtime job failed",
    );

    if (!job || attemptsMade < attempts || job.name === "expire") return;

    // Uma exceção AQUI some sem deixar rastro: é o handler de falha, não há um
    // segundo para pegá-la.
    void service
      .abandon(job.data.executionId, "send-failed")
      .catch((abandonError: unknown) => {
        log.error(
          { jobId: job.id, err: String(abandonError) },
          "failed to abandon execution after exhausted attempts",
        );
      });
  });

  app.addHook("onReady", async () => {
    // O varredor de zumbis. `jobId` fixo por janela deixa o agendamento
    // idempotente mesmo com dois workers subindo ao mesmo tempo.
    await queue.upsertJobScheduler("flow-runtime-expire", { every: EXPIRE_EVERY_MS }, {
      name: "expire",
      data: { executionId: "", token: 0 },
    });

    // Só depois de tudo pronto: um job não pode ser pego enquanto os plugins
    // ainda carregam.
    //
    // Sem `await`: `run()` **é** o laço do worker e só resolve quando ele
    // fecha. Esperá-lo aqui trava o boot (o `onReady` estoura o timeout do
    // Fastify e o processo morre), que foi exatamente o que aconteceu na
    // primeira subida.
    void worker.run().catch((error: unknown) => {
      log.error({ err: String(error) }, "flow runtime worker stopped");
    });
    log.info(
      { queue: FLOW_RUNTIME_QUEUE, concurrency: CONCURRENCY },
      "flow runtime worker ready",
    );
  });

  app.addHook("onClose", async () => {
    // Fecha o worker antes da fila: primeiro para de pegar job, depois solta a
    // conexão que ele usa para escrever o resultado.
    await worker.close();
    await queue.close();
  });
}

declare module "fastify" {
  interface FastifyInstance {
    flowRuntime: FlowRuntimeService;
  }
}

export default fp(flowRuntimeWorker, {
  name: "flow-runtime-worker",
  dependencies: ["prisma", "evolution", "queue"],
});
