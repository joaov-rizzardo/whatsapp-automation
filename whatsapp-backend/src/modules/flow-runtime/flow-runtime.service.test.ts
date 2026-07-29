import { beforeEach, describe, expect, it } from "vitest";

import { silentLogger } from "../../lib/logger/logger.js";
import type { FlowDocument, FlowNodeDocument } from "../automations/flow.schema.js";
import {
  createFakeDeduplicator,
  createFakeFlowLookup,
  createFakeGateway,
  createFakeRepository,
  createFakeScheduler,
  inboundMessage,
  type FakeFlowLookup,
  type FakeGateway,
  type FakeRepository,
  type FakeScheduler,
} from "./flow-runtime.fakes.js";
import { FlowRuntimeService } from "./flow-runtime.service.js";
import type { TriggerCandidate } from "./trigger-matcher.js";

const ORG = "org-1";
const NOW = new Date("2026-07-29T12:00:00Z");

// --- Document builders --------------------------------------------------------

const at = { x: 0, y: 0 };

function node(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): FlowNodeDocument {
  return { id, type, position: at, data };
}

function edge(source: string, sourceHandle: string, target: string) {
  return {
    id: `${source}:${sourceHandle}->${target}`,
    source,
    sourceHandle,
    target,
    targetHandle: "in",
  };
}

function document(overrides: Partial<FlowDocument> = {}): FlowDocument {
  return {
    schemaVersion: 1,
    nodes: [],
    edges: [],
    variables: [],
    ...overrides,
  };
}

/** início(palavra-chave "oi") -> texto -> texto */
function twoMessagesFlow(): FlowDocument {
  return document({
    nodes: [
      node("start-1", "start", { trigger: { kind: "keyword", keywords: ["oi"] } }),
      node("text-1", "text", { text: "Olá {{nome}}!", typingSeconds: 0 }),
      node("text-2", "text", { text: "Tudo bem?", typingSeconds: 0 }),
    ],
    edges: [edge("start-1", "out", "text-1"), edge("text-1", "out", "text-2")],
  });
}

/** início -> aguardar resposta(var nome_cliente) -> texto | texto(timeout) */
function askNameFlow(options: { groupingSeconds?: number } = {}): FlowDocument {
  return document({
    variables: [
      { id: "var-nome", name: "nome_cliente", type: "text", initialValue: "" },
    ],
    nodes: [
      node("start-1", "start", { trigger: { kind: "anyMessage" } }),
      node("wait-1", "waitReply", {
        variableId: "var-nome",
        timeout: { value: 2, unit: "minutes" },
        ...(options.groupingSeconds === undefined
          ? {}
          : { groupingSeconds: options.groupingSeconds }),
      }),
      node("text-reply", "text", {
        text: "Prazer, {{nome_cliente}}! Você disse: {{ultima_resposta}}",
        typingSeconds: 0,
      }),
      node("text-timeout", "text", { text: "Ficou por isso mesmo.", typingSeconds: 0 }),
    ],
    edges: [
      edge("start-1", "out", "wait-1"),
      edge("wait-1", "reply", "text-reply"),
      edge("wait-1", "timeout", "text-timeout"),
    ],
  });
}

function candidate(overrides: Partial<TriggerCandidate> = {}): TriggerCandidate {
  return {
    id: "ver-1",
    automationId: "aut-1",
    trigger: { kind: "keyword", keywords: ["oi"] },
    publishedAt: new Date("2026-07-01T12:00:00Z"),
    ...overrides,
  };
}

// --- Harness ------------------------------------------------------------------

let repository: FakeRepository;
let scheduler: FakeScheduler;
let gateway: FakeGateway;
let flows: FakeFlowLookup;
let service: FlowRuntimeService;

beforeEach(() => {
  repository = createFakeRepository();
  scheduler = createFakeScheduler();
  gateway = createFakeGateway();
  flows = createFakeFlowLookup();
  service = new FlowRuntimeService({
    repository,
    flows,
    scheduler,
    gateway,
    dedupe: createFakeDeduplicator(),
    logger: silentLogger,
    now: () => NOW,
  });
});

/** Publica um fluxo e manda a primeira mensagem, devolvendo a execução criada. */
async function trigger(
  doc: FlowDocument,
  overrides: Parameters<typeof candidate>[0] = {},
) {
  flows.publish(candidate(overrides), doc);
  await service.onInboundMessage(inboundMessage());
  const [execution] = [...repository.executions.values()];
  return execution;
}

function outboundTexts(executionId: string): string[] {
  return repository.messages
    .filter((m) => m.executionId === executionId && m.direction === "out")
    .map((m) => m.text ?? "");
}

// --- onInboundMessage ---------------------------------------------------------

describe("onInboundMessage", () => {
  it("creates the contact, the execution and one advance job when a keyword matches", async () => {
    const execution = await trigger(twoMessagesFlow());

    expect(execution).toMatchObject({
      organizationId: ORG,
      automationId: "aut-1",
      flowVersionId: "ver-1",
      status: "running",
      currentNodeId: "start-1",
    });
    expect(scheduler.byName("advance")).toHaveLength(1);
    expect(scheduler.byName("advance")[0].payload).toEqual({
      executionId: execution.id,
      token: 0,
    });
  });

  it("records the triggering message as already consumed", async () => {
    const execution = await trigger(askNameFlow());

    const inbound = repository.messages.filter((m) => m.direction === "in");
    expect(inbound).toHaveLength(1);
    // If it stayed in the buffer, the first waitReply would answer a question
    // that had not been asked yet.
    expect(inbound[0].consumedAt).not.toBeNull();
  });

  it("seeds ultima_resposta with the message that started the flow", async () => {
    flows.publish(candidate({ trigger: { kind: "anyMessage" } }), askNameFlow());
    await service.onInboundMessage(
      inboundMessage({ content: { kind: "text", text: "quero um orçamento" } }),
    );

    const [execution] = [...repository.executions.values()];
    expect(execution.variables["sys:ultima_resposta"]).toBe("quero um orçamento");
  });

  it("does nothing when no trigger matches", async () => {
    flows.publish(
      candidate({ trigger: { kind: "keyword", keywords: ["orcamento"] } }),
      twoMessagesFlow(),
    );

    await service.onInboundMessage(
      inboundMessage({ content: { kind: "text", text: "que coisa" } }),
    );

    expect(repository.executions.size).toBe(0);
    expect(scheduler.jobs).toEqual([]);
    // It still records who wrote — that is what makes firstContact honest.
    expect(repository.contacts.size).toBe(1);
  });

  it("ignores a message it has already seen", async () => {
    flows.publish(candidate({ trigger: { kind: "anyMessage" } }), twoMessagesFlow());
    const message = inboundMessage();

    await service.onInboundMessage(message);
    await service.onInboundMessage(message);

    expect(repository.executions.size).toBe(1);
  });

  it("fires a firstContact flow only for someone who never wrote before", async () => {
    flows.publish(candidate({ trigger: { kind: "firstContact" } }), twoMessagesFlow());

    await service.onInboundMessage(inboundMessage({ externalId: "ext-1" }));
    const created = repository.executions.size;
    // End the first conversation so the contact is free again.
    const [execution] = [...repository.executions.values()];
    await repository.finish({ executionId: execution.id, status: "completed" });
    await service.onInboundMessage(inboundMessage({ externalId: "ext-2" }));

    expect(created).toBe(1);
    expect(repository.executions.size).toBe(1);
  });

  describe("with an execution already running", () => {
    it("evaluates no trigger at all — the running conversation owns the message", async () => {
      const execution = await trigger(askNameFlow());
      flows.publish(
        candidate({ id: "ver-2", trigger: { kind: "anyMessage" } }),
        twoMessagesFlow(),
      );

      await service.onInboundMessage(
        inboundMessage({ externalId: "ext-2", content: { kind: "text", text: "oi" } }),
      );

      expect(repository.executions.size).toBe(1);
      const buffered = repository.messages.filter(
        (m) => m.executionId === execution.id && m.direction === "in",
      );
      expect(buffered).toHaveLength(2);
    });

    it("buffers a message that arrives outside a wait, and schedules nothing", async () => {
      const execution = await trigger(askNameFlow());
      scheduler.clear();

      await service.onInboundMessage(inboundMessage({ externalId: "ext-2" }));

      expect(scheduler.jobs).toEqual([]);
      const pending = repository.messages.filter(
        (m) => m.executionId === execution.id && m.consumedAt === null,
      );
      expect(pending).toHaveLength(1);
    });

    it("schedules a debounced delivery when the flow is waiting for a reply", async () => {
      const execution = await trigger(askNameFlow({ groupingSeconds: 8 }));
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
      scheduler.clear();

      await service.onInboundMessage(inboundMessage({ externalId: "ext-2" }));

      const [job] = scheduler.byName("deliver");
      expect(job).toMatchObject({
        delayMs: 8_000,
        debounce: { key: `deliver:${execution.id}`, ttlMs: 8_000 },
      });
    });

    it("records non-text content without disturbing the wait", async () => {
      const execution = await trigger(askNameFlow());
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
      scheduler.clear();

      await service.onInboundMessage(
        inboundMessage({
          externalId: "ext-img",
          content: { kind: "unsupported", rawType: "imageMessage" },
        }),
      );

      expect(scheduler.jobs).toEqual([]);
      expect(
        repository.messages.some((m) => m.kind === "unsupported"),
      ).toBe(true);
      expect(repository.executions.get(execution.id)?.status).toBe("waiting");
    });
  });
});

// --- runStep ------------------------------------------------------------------

describe("runStep", () => {
  it("does nothing at all when the token is stale", async () => {
    const execution = await trigger(twoMessagesFlow());
    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
    const sentSoFar = gateway.sent.length;

    // The same job, delivered twice by BullMQ.
    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    expect(gateway.sent).toHaveLength(sentSoFar);
  });

  it("walks start -> texto -> texto -> fim, then frees the contact", async () => {
    const execution = await trigger(twoMessagesFlow());

    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    expect(gateway.sent.map((s) => s.text)).toEqual(["Olá João!", "Tudo bem?"]);
    expect(outboundTexts(execution.id)).toEqual(["Olá João!", "Tudo bem?"]);
    expect(repository.executions.get(execution.id)?.status).toBe("completed");
    expect(repository.contacts.get(execution.contactId)?.activeExecutionId).toBeNull();
  });

  it("records the block that produced each outbound message", async () => {
    const execution = await trigger(twoMessagesFlow());

    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    const nodes = repository.messages
      .filter((m) => m.direction === "out")
      .map((m) => m.nodeId);
    expect(nodes).toEqual(["text-1", "text-2"]);
  });

  it("suspends on a delay without sending anything, and schedules the wake-up", async () => {
    const execution = await trigger(
      document({
        nodes: [
          node("start-1", "start", { trigger: { kind: "anyMessage" } }),
          node("delay-1", "delay", { duration: { value: 10, unit: "seconds" } }),
          node("text-1", "text", { text: "Até logo!", typingSeconds: 0 }),
        ],
        edges: [edge("start-1", "out", "delay-1"), edge("delay-1", "out", "text-1")],
      }),
      { trigger: { kind: "anyMessage" } },
    );
    scheduler.clear();

    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    expect(gateway.sent).toEqual([]);
    const stored = repository.executions.get(execution.id);
    expect(stored).toMatchObject({ status: "sleeping", currentNodeId: "text-1" });
    expect(scheduler.byName("advance")[0]).toMatchObject({
      delayMs: 10_000,
      payload: { executionId: execution.id, token: stored?.waitToken },
    });
  });

  it("suspends on a waitReply and schedules the timeout", async () => {
    const execution = await trigger(askNameFlow(), { trigger: { kind: "anyMessage" } });
    scheduler.clear();

    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    const stored = repository.executions.get(execution.id);
    expect(stored).toMatchObject({ status: "waiting", currentNodeId: "wait-1" });
    expect(scheduler.byName("timeout")[0]).toMatchObject({ delayMs: 120_000 });
  });

  it("resumes immediately when the buffer is already full, with no deliver job", async () => {
    const execution = await trigger(askNameFlow(), { trigger: { kind: "anyMessage" } });
    // The person wrote again while the bot was still sending.
    await repository.recordInbound({
      executionId: execution.id,
      kind: "text",
      text: "João",
      externalId: "ext-early",
    });
    scheduler.clear();

    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    expect(scheduler.byName("deliver")).toHaveLength(0);
    expect(gateway.sent.map((s) => s.text)).toEqual([
      "Prazer, João! Você disse: João",
    ]);
  });

  describe("grouping", () => {
    it("joins the pieces with a newline and updates ultima_resposta with the whole text", async () => {
      const execution = await trigger(askNameFlow(), {
        trigger: { kind: "anyMessage" },
      });
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

      for (const [index, text] of ["meu", "nome", "é João"].entries()) {
        await service.onInboundMessage(
          inboundMessage({
            externalId: `ext-piece-${index}`,
            content: { kind: "text", text },
          }),
        );
      }
      const token = repository.executions.get(execution.id)?.waitToken ?? 0;
      await service.runStep({ name: "deliver", executionId: execution.id, token });

      expect(gateway.sent.map((s) => s.text)).toEqual([
        "Prazer, meu\nnome\né João! Você disse: meu\nnome\né João",
      ]);
    });

    it("delivers once for three pieces", async () => {
      const execution = await trigger(askNameFlow(), {
        trigger: { kind: "anyMessage" },
      });
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
      scheduler.clear();

      for (const [index, text] of ["a", "b", "c"].entries()) {
        await service.onInboundMessage(
          inboundMessage({
            externalId: `ext-piece-${index}`,
            content: { kind: "text", text },
          }),
        );
      }

      // Three jobs are scheduled, but they share one debounce key — BullMQ keeps
      // the last. The engine's own guarantee is that the second one to actually
      // run finds an empty buffer and does not answer twice.
      const token = repository.executions.get(execution.id)?.waitToken ?? 0;
      await service.runStep({ name: "deliver", executionId: execution.id, token });
      const after = repository.executions.get(execution.id)?.waitToken ?? 0;
      await service.runStep({ name: "deliver", executionId: execution.id, token: after });

      expect(gateway.sent).toHaveLength(1);
    });
  });

  describe("timeout", () => {
    it("leaves by the timeout output", async () => {
      const execution = await trigger(askNameFlow(), {
        trigger: { kind: "anyMessage" },
      });
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
      const token = repository.executions.get(execution.id)?.waitToken ?? 0;

      await service.runStep({ name: "timeout", executionId: execution.id, token });

      expect(gateway.sent.map((s) => s.text)).toEqual(["Ficou por isso mesmo."]);
    });

    it("completes the execution when nothing is wired to the timeout output", async () => {
      const doc = askNameFlow();
      doc.edges = doc.edges.filter((e) => e.sourceHandle !== "timeout");
      const execution = await trigger(doc, { trigger: { kind: "anyMessage" } });
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
      const token = repository.executions.get(execution.id)?.waitToken ?? 0;

      await service.runStep({ name: "timeout", executionId: execution.id, token });

      expect(repository.executions.get(execution.id)?.status).toBe("completed");
    });

    it("does not clear ultima_resposta", async () => {
      const execution = await trigger(askNameFlow(), {
        trigger: { kind: "anyMessage" },
      });
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });
      const token = repository.executions.get(execution.id)?.waitToken ?? 0;

      await service.runStep({ name: "timeout", executionId: execution.id, token });

      expect(
        repository.executions.get(execution.id)?.variables["sys:ultima_resposta"],
      ).toBe("oi");
    });
  });

  describe("guards", () => {
    /** Um ciclo: texto -> texto, ligado de volta em si mesmo. */
    function loopFlow(): FlowDocument {
      return document({
        nodes: [
          node("start-1", "start", { trigger: { kind: "anyMessage" } }),
          node("text-1", "text", { text: "de novo", typingSeconds: 0 }),
        ],
        edges: [edge("start-1", "out", "text-1"), edge("text-1", "out", "text-1")],
      });
    }

    it("reschedules instead of failing when a tick hits its ceiling", async () => {
      const execution = await trigger(loopFlow(), { trigger: { kind: "anyMessage" } });
      scheduler.clear();

      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

      const stored = repository.executions.get(execution.id);
      expect(stored?.status).toBe("running");
      expect(scheduler.byName("advance")).toHaveLength(1);
      // The budget survives the reschedule — otherwise a cycle would run forever.
      expect(stored?.stepCount).toBeGreaterThan(0);
    });

    it("fails with step-limit once the whole execution budget is gone", async () => {
      const execution = await trigger(loopFlow(), { trigger: { kind: "anyMessage" } });

      // Keep feeding it the job it reschedules for itself.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const stored = repository.executions.get(execution.id);
        if (!stored || stored.status !== "running") break;
        await service.runStep({
          name: "advance",
          executionId: execution.id,
          token: stored.waitToken,
        });
      }

      const stored = repository.executions.get(execution.id);
      expect(stored?.status).toBe("failed");
      expect(repository.finished.at(-1)?.error).toBe("step-limit");
      expect(repository.contacts.get(execution.contactId)?.activeExecutionId).toBeNull();
    });

    it("fails with the block type when a node cannot be executed yet", async () => {
      const execution = await trigger(
        document({
          nodes: [
            node("start-1", "start", { trigger: { kind: "anyMessage" } }),
            node("cond-1", "condition", { conditions: [] }),
          ],
          edges: [edge("start-1", "out", "cond-1")],
        }),
        { trigger: { kind: "anyMessage" } },
      );

      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

      expect(repository.finished.at(-1)).toMatchObject({
        status: "failed",
        error: "unimplemented-block:condition",
      });
      expect(repository.contacts.get(execution.contactId)?.activeExecutionId).toBeNull();
    });
  });

  describe("send failures", () => {
    it("lets the error out so BullMQ retries, without advancing the node", async () => {
      const execution = await trigger(twoMessagesFlow());
      gateway.failNext(new Error("evolution is down"));

      await expect(
        service.runStep({ name: "advance", executionId: execution.id, token: 0 }),
      ).rejects.toThrow("evolution is down");

      expect(repository.executions.get(execution.id)?.currentNodeId).toBe("text-1");
      expect(outboundTexts(execution.id)).toEqual([]);
    });

    // BullMQ repete o job com o payload ORIGINAL. Sem devolver o token, essa
    // repetição morreria no CAS em silêncio e a conversa pararia para sempre —
    // que é o modo de falha mais caro possível: nenhum erro, nenhuma resposta.
    it("retries with the original token and resumes from the failed block", async () => {
      const execution = await trigger(twoMessagesFlow());
      gateway.failNext(new Error("evolution is down"));
      await expect(
        service.runStep({ name: "advance", executionId: execution.id, token: 0 }),
      ).rejects.toThrow();

      expect(repository.executions.get(execution.id)?.waitToken).toBe(0);
      await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

      expect(gateway.sent.map((s) => s.text)).toEqual(["Olá João!", "Tudo bem?"]);
      expect(repository.executions.get(execution.id)?.status).toBe("completed");
    });
  });

  it("skips a published version whose document it cannot read, and tries the next", async () => {
    flows.publish(
      candidate({ id: "ver-future", trigger: { kind: "anyMessage" } }),
      document({ schemaVersion: 99, nodes: [node("start-1", "start", {})] }),
    );
    flows.publish(
      candidate({
        id: "ver-ok",
        automationId: "aut-2",
        trigger: { kind: "anyMessage" },
        publishedAt: new Date("2026-06-01T12:00:00Z"),
      }),
      twoMessagesFlow(),
    );

    await service.onInboundMessage(inboundMessage());

    const [execution] = [...repository.executions.values()];
    expect(execution.flowVersionId).toBe("ver-ok");
  });
});

// --- abandon and expire -------------------------------------------------------

describe("abandon", () => {
  it("fails the execution and frees the contact", async () => {
    const execution = await trigger(twoMessagesFlow());

    await service.abandon(execution.id, "send-failed");

    expect(repository.executions.get(execution.id)?.status).toBe("failed");
    expect(repository.finished.at(-1)?.error).toBe("send-failed");
    expect(repository.contacts.get(execution.contactId)?.activeExecutionId).toBeNull();
  });

  it("leaves an execution that already finished alone", async () => {
    const execution = await trigger(twoMessagesFlow());
    await service.runStep({ name: "advance", executionId: execution.id, token: 0 });

    await service.abandon(execution.id, "send-failed");

    expect(repository.executions.get(execution.id)?.status).toBe("completed");
  });
});

describe("expireStale", () => {
  it("expires an execution past its deadline and frees the contact", async () => {
    const execution = await trigger(askNameFlow(), { trigger: { kind: "anyMessage" } });
    const stored = repository.executions.get(execution.id);
    if (stored) stored.expiresAt = new Date(NOW.getTime() - 1000);

    const count = await service.expireStale();

    expect(count).toBe(1);
    expect(repository.executions.get(execution.id)?.status).toBe("expired");
    expect(repository.contacts.get(execution.contactId)?.activeExecutionId).toBeNull();
  });

  it("leaves a healthy execution alone", async () => {
    const execution = await trigger(askNameFlow(), { trigger: { kind: "anyMessage" } });

    expect(await service.expireStale()).toBe(0);
    expect(repository.executions.get(execution.id)?.status).not.toBe("expired");
  });
});
