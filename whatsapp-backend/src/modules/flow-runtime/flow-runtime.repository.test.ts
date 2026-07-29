import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import {
  createFlowRuntimeRepository,
  type FlowRuntimeRepository,
} from "./flow-runtime.repository.js";

/**
 * Contra o PostgreSQL real, como manda o CLAUDE.md — e aqui não é só disciplina:
 * o que este arquivo prova (duas transações concorrentes disputando um contato,
 * e dois jobs disputando um passo) é **exatamente** o que um Prisma falso não
 * consegue provar. Um mapa em memória sempre deixa os dois passarem.
 */

let app: FastifyInstance;
let repository: FlowRuntimeRepository;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
  repository = createFlowRuntimeRepository(app.prisma);
});

afterAll(async () => {
  await app.close();
});

/** Uma organização por teste: sem truncate, sem ordem entre arquivos. */
function orgId(): string {
  return `org-${crypto.randomUUID()}`;
}

function jid(): string {
  return `5511${Math.floor(Math.random() * 1e9)}@s.whatsapp.net`;
}

async function seedContact(organizationId: string) {
  const contactJid = jid();
  const { contact } = await repository.touchContact({
    organizationId,
    jid: contactJid,
    number: contactJid.split("@")[0],
    pushName: "João",
  });
  return contact;
}

async function seedExecution(organizationId: string, contactId: string) {
  const execution = await repository.startExecution({
    organizationId,
    contactId,
    automationId: "aut-1",
    flowVersionId: "ver-1",
    currentNodeId: "start-1",
    variables: {},
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  if (!execution) throw new Error("seed failed: contact already busy");
  return execution;
}

describe("touchContact", () => {
  it("reports the first message as a first contact, and the second as not", async () => {
    const organizationId = orgId();
    const contactJid = jid();
    const input = {
      organizationId,
      jid: contactJid,
      number: contactJid.split("@")[0],
      pushName: "João",
    };

    const first = await repository.touchContact(input);
    const second = await repository.touchContact(input);

    expect(first.isFirstContact).toBe(true);
    expect(second.isFirstContact).toBe(false);
    expect(second.contact.id).toBe(first.contact.id);
  });

  it("keeps contacts of different organizations apart", async () => {
    const contactJid = jid();
    const number = contactJid.split("@")[0];

    const a = await repository.touchContact({
      organizationId: orgId(),
      jid: contactJid,
      number,
      pushName: null,
    });
    const b = await repository.touchContact({
      organizationId: orgId(),
      jid: contactJid,
      number,
      pushName: null,
    });

    expect(b.isFirstContact).toBe(true);
    expect(b.contact.id).not.toBe(a.contact.id);
  });

  it("refreshes the pushName, which feeds {{nome}}", async () => {
    const organizationId = orgId();
    const contactJid = jid();
    const number = contactJid.split("@")[0];

    await repository.touchContact({
      organizationId,
      jid: contactJid,
      number,
      pushName: "João",
    });
    const renamed = await repository.touchContact({
      organizationId,
      jid: contactJid,
      number,
      pushName: "João Silva",
    });

    expect(renamed.contact.pushName).toBe("João Silva");
  });

  it("does not erase a known pushName when a message arrives without one", async () => {
    const organizationId = orgId();
    const contactJid = jid();
    const number = contactJid.split("@")[0];

    await repository.touchContact({
      organizationId,
      jid: contactJid,
      number,
      pushName: "João",
    });
    const anonymous = await repository.touchContact({
      organizationId,
      jid: contactJid,
      number,
      pushName: null,
    });

    expect(anonymous.contact.pushName).toBe("João");
  });

  // Two messages of the same person can be handled in parallel (prefetch: 20).
  // Without the unique index doing its job, this creates two contacts and the
  // one-bot-at-a-time lock stops meaning anything.
  it("creates one contact when two messages of the same person race", async () => {
    const organizationId = orgId();
    const contactJid = jid();
    const input = {
      organizationId,
      jid: contactJid,
      number: contactJid.split("@")[0],
      pushName: null,
    };

    const results = await Promise.all([
      repository.touchContact(input),
      repository.touchContact(input),
      repository.touchContact(input),
    ]);

    const ids = new Set(results.map((result) => result.contact.id));
    expect(ids.size).toBe(1);
    expect(results.filter((result) => result.isFirstContact)).toHaveLength(1);
  });
});

describe("startExecution", () => {
  it("creates the execution and claims the contact", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);

    const execution = await seedExecution(organizationId, contact.id);

    expect(execution.status).toBe("running");
    const reloaded = await repository.findContactById(contact.id);
    expect(reloaded?.activeExecutionId).toBe(execution.id);
  });

  it("refuses a second execution while one is active — one bot at a time", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    await seedExecution(organizationId, contact.id);

    const second = await repository.startExecution({
      organizationId,
      contactId: contact.id,
      automationId: "aut-2",
      flowVersionId: "ver-2",
      currentNodeId: "start-2",
      variables: {},
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    expect(second).toBeNull();
  });

  // THE test of this file: the compare-and-set under real concurrency.
  it("creates exactly one execution when two transactions race for the same contact", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);

    const attempt = () =>
      repository.startExecution({
        organizationId,
        contactId: contact.id,
        automationId: "aut-1",
        flowVersionId: "ver-1",
        currentNodeId: "start-1",
        variables: {},
        expiresAt: new Date(Date.now() + 86_400_000),
      });

    const results = await Promise.all([attempt(), attempt(), attempt()]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    const executions = await app.prisma.flowExecution.count({
      where: { contactId: contact.id },
    });
    expect(executions).toBe(1);
  });

  it("lets a new execution start once the previous one finished", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const first = await seedExecution(organizationId, contact.id);

    await repository.finish({ executionId: first.id, status: "completed" });
    const second = await repository.startExecution({
      organizationId,
      contactId: contact.id,
      automationId: "aut-1",
      flowVersionId: "ver-1",
      currentNodeId: "start-1",
      variables: {},
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    expect(second).not.toBeNull();
  });
});

describe("claimStep", () => {
  it("hands the execution over and burns the token", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    const claimed = await repository.claimStep(execution.id, execution.waitToken);

    expect(claimed).not.toBeNull();
    expect(claimed?.waitToken).toBe(execution.waitToken + 1);
    expect(claimed?.contact.number).toBe(contact.number);
  });

  // The at-least-once test: a timeout job that fires after the reply already
  // moved the flow carries a token that no longer exists.
  it("refuses a stale token", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.claimStep(execution.id, execution.waitToken);
    const stale = await repository.claimStep(execution.id, execution.waitToken);

    expect(stale).toBeNull();
  });

  it("refuses a job for an execution that already finished", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);
    await repository.finish({ executionId: execution.id, status: "completed" });

    expect(await repository.claimStep(execution.id, execution.waitToken)).toBeNull();
  });

  it("refuses a job for an execution that does not exist", async () => {
    expect(await repository.claimStep("exec-ghost", 0)).toBeNull();
  });

  it("gives the token back so a retried job can claim the same step again", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.claimStep(execution.id, execution.waitToken);
    await repository.releaseStep(execution.id, execution.waitToken);

    // BullMQ repete com o payload original: o mesmo token de antes.
    expect(await repository.claimStep(execution.id, execution.waitToken)).not.toBeNull();
  });

  it("does not give the token back once someone else has moved the execution on", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    const first = await repository.claimStep(execution.id, execution.waitToken);
    // Um segundo passo já aconteceu desde a falha.
    await repository.claimStep(execution.id, first?.waitToken ?? 0);
    await repository.releaseStep(execution.id, execution.waitToken);

    expect(await repository.claimStep(execution.id, execution.waitToken)).toBeNull();
  });

  it("leaves exactly one winner when two jobs claim the same step", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    const results = await Promise.all([
      repository.claimStep(execution.id, execution.waitToken),
      repository.claimStep(execution.id, execution.waitToken),
      repository.claimStep(execution.id, execution.waitToken),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
  });
});

describe("messages and the buffer", () => {
  it("returns unconsumed inbound messages in arrival order and marks them consumed", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    for (const text of ["meu", "nome", "é João"]) {
      await repository.recordInbound({
        executionId: execution.id,
        kind: "text",
        text,
        externalId: `ext-${text}`,
      });
    }

    const drained = await repository.drainInbox(execution.id);

    expect(drained.map((message) => message.text)).toEqual([
      "meu",
      "nome",
      "é João",
    ]);
    // Draining twice must not replay the conversation.
    expect(await repository.drainInbox(execution.id)).toEqual([]);
  });

  it("leaves non-text content in the history but out of the buffer", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.recordInbound({
      executionId: execution.id,
      kind: "unsupported",
      text: null,
      externalId: "ext-image",
    });

    expect(await repository.drainInbox(execution.id)).toEqual([]);
    const stored = await app.prisma.executionMessage.count({
      where: { executionId: execution.id },
    });
    expect(stored).toBe(1);
  });

  it("stores the same inbound message once, however many times it is delivered", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);
    const message = {
      executionId: execution.id,
      kind: "text" as const,
      text: "oi",
      externalId: "ext-dup",
    };

    const first = await repository.recordInbound(message);
    const second = await repository.recordInbound(message);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(await repository.drainInbox(execution.id)).toHaveLength(1);
  });

  it("records what the bot sent, with the block that produced it", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.recordOutbound({
      executionId: execution.id,
      text: "Oi João!",
      externalId: "ext-out",
      nodeId: "text-1",
    });

    const stored = await app.prisma.executionMessage.findFirstOrThrow({
      where: { executionId: execution.id, direction: "out" },
    });
    expect(stored).toMatchObject({
      text: "Oi João!",
      nodeId: "text-1",
      kind: "text",
    });
    // An outbound message is not something the flow can consume as a reply.
    expect(stored.consumedAt).not.toBeNull();
  });

  it("accepts an outbound message with no external id, since the API may not return one", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.recordOutbound({
      executionId: execution.id,
      text: "primeira",
      externalId: null,
      nodeId: "text-1",
    });
    await repository.recordOutbound({
      executionId: execution.id,
      text: "segunda",
      externalId: null,
      nodeId: "text-2",
    });

    const stored = await app.prisma.executionMessage.count({
      where: { executionId: execution.id, direction: "out" },
    });
    expect(stored).toBe(2);
  });
});

describe("progress and finishing", () => {
  it("checkpoints the current node, the variables and the step count", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.saveProgress({
      executionId: execution.id,
      currentNodeId: "text-2",
      variables: { "var-1": "Maria" },
      stepCount: 4,
    });

    const reloaded = await app.prisma.flowExecution.findUniqueOrThrow({
      where: { id: execution.id },
    });
    expect(reloaded).toMatchObject({
      currentNodeId: "text-2",
      stepCount: 4,
      variables: { "var-1": "Maria" },
    });
  });

  it("suspends with a status, a node and a renewed deadline", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);
    const expiresAt = new Date(Date.now() + 3_600_000);

    await repository.suspend({
      executionId: execution.id,
      status: "waiting",
      currentNodeId: "wait-1",
      variables: {},
      stepCount: 2,
      expiresAt,
    });

    const reloaded = await app.prisma.flowExecution.findUniqueOrThrow({
      where: { id: execution.id },
    });
    expect(reloaded.status).toBe("waiting");
    expect(reloaded.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it("releases the contact whatever the ending", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.finish({
      executionId: execution.id,
      status: "failed",
      error: "send-failed",
    });

    const reloaded = await app.prisma.flowExecution.findUniqueOrThrow({
      where: { id: execution.id },
    });
    expect(reloaded).toMatchObject({ status: "failed", error: "send-failed" });
    expect(reloaded.finishedAt).not.toBeNull();
    expect((await repository.findContactById(contact.id))?.activeExecutionId).toBeNull();
  });

  // The `failed` listener can arrive after the flow already ended on its own.
  it("is harmless when the execution already finished", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const execution = await seedExecution(organizationId, contact.id);

    await repository.finish({ executionId: execution.id, status: "completed" });
    await repository.finish({
      executionId: execution.id,
      status: "failed",
      error: "send-failed",
    });

    const reloaded = await app.prisma.flowExecution.findUniqueOrThrow({
      where: { id: execution.id },
    });
    expect(reloaded.status).toBe("completed");
  });

  it("does not release a contact already claimed by a newer execution", async () => {
    const organizationId = orgId();
    const contact = await seedContact(organizationId);
    const first = await seedExecution(organizationId, contact.id);
    await repository.finish({ executionId: first.id, status: "completed" });
    const second = await seedExecution(organizationId, contact.id);

    // A late `failed` listener for the OLD execution must not free a contact
    // that a new conversation already owns.
    await repository.finish({
      executionId: first.id,
      status: "failed",
      error: "send-failed",
    });

    expect((await repository.findContactById(contact.id))?.activeExecutionId).toBe(
      second.id,
    );
  });
});

describe("findExpired", () => {
  it("finds only unfinished executions past their deadline", async () => {
    const organizationId = orgId();
    const past = new Date(Date.now() - 60_000);

    const expiredContact = await seedContact(organizationId);
    const expired = await repository.startExecution({
      organizationId,
      contactId: expiredContact.id,
      automationId: "aut-1",
      flowVersionId: "ver-1",
      currentNodeId: "start-1",
      variables: {},
      expiresAt: past,
    });
    const freshContact = await seedContact(organizationId);
    await seedExecution(organizationId, freshContact.id);

    const found = await repository.findExpired(new Date(), 50);
    const ids = found.map((execution) => execution.id);

    expect(ids).toContain(expired?.id);
    expect(
      found.every((execution) => execution.expiresAt.getTime() <= Date.now()),
    ).toBe(true);
  });
});
