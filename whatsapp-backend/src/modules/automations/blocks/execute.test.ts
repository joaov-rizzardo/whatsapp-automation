import { describe, expect, it } from "vitest";

import { silentLogger } from "../../../lib/logger/logger.js";
import type { RuntimeContext, SendTextOptions } from "./block-runtime.js";
import { DEFAULT_REPLY_GROUPING_SECONDS } from "./wait-reply/wait-reply.block.js";
import { delayBlock } from "./delay/delay.block.js";
import { startBlock } from "./start/start.block.js";
import { textBlock } from "./text/text.block.js";
import { waitReplyBlock } from "./wait-reply/wait-reply.block.js";

/**
 * O `ctx` falso que a spec prometeu: dez linhas, nenhum mock de framework e
 * nenhuma infra. É esta a prova de que o bloco não conhece fila, Prisma nem
 * Evolution — se conhecesse, este arquivo precisaria de um contêiner.
 */
function fakeContext(variables: Record<string, string> = {}) {
  const sent: Array<{ text: string; options: SendTextOptions }> = [];
  const store = new Map(Object.entries(variables));

  const ctx: RuntimeContext = {
    variables: {
      get: (id) => store.get(id) ?? "",
      set: (id, value) => store.set(id, value),
      // Um render burro de propósito: quem testa a interpolação de verdade é
      // variables.test.ts. Aqui só precisa provar que o bloco RENDERIZA.
      render: (text) => text.replace("{{nome}}", store.get("sys:nome") ?? ""),
    },
    send: {
      text: async (text, options = {}) => {
        sent.push({ text, options });
      },
    },
    contact: { number: "5511999999999", name: "João" },
    logger: silentLogger,
    now: () => new Date("2026-07-29T12:00:00Z"),
  };

  return { ctx, sent, store };
}

function execute(
  block: { execute?: (data: never, ctx: RuntimeContext) => unknown },
  data: unknown,
  ctx: RuntimeContext,
) {
  if (!block.execute) throw new Error("block has no execute");
  return block.execute(data as never, ctx);
}

describe("start.execute", () => {
  it("continues through its only output", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(startBlock, { trigger: { kind: "anyMessage" } }, ctx),
    ).resolves.toEqual({ kind: "next", handle: "out" });
  });
});

describe("text.execute", () => {
  it("sends the interpolated text and continues", async () => {
    const { ctx, sent } = fakeContext({ "sys:nome": "Maria" });

    const outcome = await execute(
      textBlock,
      { text: "Oi {{nome}}!", typingSeconds: 3 },
      ctx,
    );

    expect(sent).toEqual([
      { text: "Oi Maria!", options: { typingSeconds: 3 } },
    ]);
    expect(outcome).toEqual({ kind: "next", handle: "out" });
  });

  it("sends with no typing time when it is zero", async () => {
    const { ctx, sent } = fakeContext();

    await execute(textBlock, { text: "Até logo!", typingSeconds: 0 }, ctx);

    expect(sent).toEqual([{ text: "Até logo!", options: { typingSeconds: 0 } }]);
  });
});

describe("delay.execute", () => {
  it("suspends for the configured time and continues through its output", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(delayBlock, { duration: { value: 10, unit: "seconds" } }, ctx),
    ).resolves.toEqual({ kind: "sleep", delayMs: 10_000, handle: "out" });
  });

  it("converts minutes and hours", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(delayBlock, { duration: { value: 5, unit: "minutes" } }, ctx),
    ).resolves.toMatchObject({ delayMs: 300_000 });
    await expect(
      execute(delayBlock, { duration: { value: 2, unit: "hours" } }, ctx),
    ).resolves.toMatchObject({ delayMs: 7_200_000 });
  });

  it("sends nothing — a delay is silence, not a message", async () => {
    const { ctx, sent } = fakeContext();

    await execute(delayBlock, { duration: { value: 1, unit: "seconds" } }, ctx);

    expect(sent).toEqual([]);
  });
});

describe("waitReply.execute", () => {
  it("suspends until a reply, with the timeout in milliseconds", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(
        waitReplyBlock,
        {
          variableId: null,
          timeout: { value: 2, unit: "minutes" },
          groupingSeconds: 8,
        },
        ctx,
      ),
    ).resolves.toEqual({
      kind: "awaitReply",
      timeoutMs: 120_000,
      groupingMs: 8_000,
    });
  });

  // The field was added after the first flows existed, so a draft saved without
  // it must still behave like every other flow.
  it("falls back to the default grouping when the field is absent", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(
        waitReplyBlock,
        { variableId: null, timeout: { value: 30, unit: "seconds" } },
        ctx,
      ),
    ).resolves.toMatchObject({
      groupingMs: DEFAULT_REPLY_GROUPING_SECONDS * 1000,
    });
  });

  it("keeps a grouping of zero as zero, instead of falling back", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(
        waitReplyBlock,
        {
          variableId: null,
          timeout: { value: 30, unit: "seconds" },
          groupingSeconds: 0,
        },
        ctx,
      ),
    ).resolves.toMatchObject({ groupingMs: 0 });
  });
});

describe("waitReply.resume", () => {
  function resume(data: unknown, ctx: RuntimeContext, input: unknown) {
    if (!waitReplyBlock.resume) throw new Error("block has no resume");
    return waitReplyBlock.resume(data as never, ctx, input as never);
  }

  it("stores the reply in the configured variable and leaves by `reply`", async () => {
    const { ctx, store } = fakeContext();

    const outcome = await resume(
      { variableId: "var-nome", timeout: { value: 2, unit: "minutes" } },
      ctx,
      { kind: "reply", text: "meu nome é João", messageIds: ["m1"] },
    );

    expect(store.get("var-nome")).toBe("meu nome é João");
    expect(outcome).toEqual({ kind: "next", handle: "reply" });
  });

  it("leaves by `reply` without storing when no variable was chosen", async () => {
    const { ctx, store } = fakeContext();

    const outcome = await resume(
      { variableId: null, timeout: { value: 2, unit: "minutes" } },
      ctx,
      { kind: "reply", text: "oi", messageIds: ["m1"] },
    );

    expect(store.size).toBe(0);
    expect(outcome).toEqual({ kind: "next", handle: "reply" });
  });

  it("leaves by `timeout` and writes nothing", async () => {
    const { ctx, store } = fakeContext({ "var-nome": "valor anterior" });

    const outcome = await resume(
      { variableId: "var-nome", timeout: { value: 2, unit: "minutes" } },
      ctx,
      { kind: "timeout" },
    );

    expect(store.get("var-nome")).toBe("valor anterior");
    expect(outcome).toEqual({ kind: "next", handle: "timeout" });
  });
});
