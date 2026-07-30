import { describe, expect, it } from "vitest";

import { silentLogger } from "../../../lib/logger/logger.js";
import type { RuntimeContext, SendTextOptions } from "./block-runtime.js";
import { conditionBlock } from "./condition/condition.block.js";
import { randomizerBlock } from "./randomizer/randomizer.block.js";
import { setVariableBlock } from "./set-variable/set-variable.block.js";
import type { VariableType } from "./variable-types.js";
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
function fakeContext(
  variables: Record<string, string> = {},
  options: { types?: Record<string, VariableType>; random?: number } = {},
) {
  const sent: Array<{ text: string; options: SendTextOptions }> = [];
  const store = new Map(Object.entries(variables));
  const reads: string[] = [];

  const ctx: RuntimeContext = {
    variables: {
      get: (id) => {
        reads.push(id);
        return store.get(id) ?? "";
      },
      set: (id, value) => store.set(id, value),
      // Um render burro de propósito: quem testa a interpolação de verdade é
      // variables.test.ts. Aqui só precisa provar que o bloco RENDERIZA.
      render: (text) => text.replace("{{nome}}", store.get("sys:nome") ?? ""),
      typeOf: (id) => options.types?.[id] ?? "text",
    },
    send: {
      text: async (text, options = {}) => {
        sent.push({ text, options });
      },
    },
    contact: { number: "5511999999999", name: "João" },
    logger: silentLogger,
    now: () => new Date("2026-07-29T12:00:00Z"),
    random: () => options.random ?? 0,
  };

  return { ctx, sent, store, reads };
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

// --- Os três blocos da spec 009 ----------------------------------------------

describe("condition.execute", () => {
  const comparison = (
    variableId: string,
    operator: string,
    right: unknown,
    id = "cmp-1",
  ) => ({ id, variableId, operator, right });

  it("sai por `true` quando a comparação bate", async () => {
    const { ctx } = fakeContext(
      { "var-1": "10" },
      { types: { "var-1": "number" } },
    );

    await expect(
      execute(
        conditionBlock,
        {
          logic: "and",
          comparisons: [
            comparison("var-1", "gt", { kind: "literal", value: "5" }),
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "true" });
  });

  it("`E` é falso quando uma das duas falha", async () => {
    const { ctx } = fakeContext(
      { "var-1": "10", "var-2": "nao" },
      { types: { "var-1": "number" } },
    );

    await expect(
      execute(
        conditionBlock,
        {
          logic: "and",
          comparisons: [
            comparison("var-1", "gt", { kind: "literal", value: "5" }),
            comparison("var-2", "eq", { kind: "literal", value: "sim" }, "cmp-2"),
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "false" });
  });

  it("`OU` é verdadeiro quando só a segunda passa", async () => {
    const { ctx } = fakeContext({ "var-1": "nao", "var-2": "sim" });

    await expect(
      execute(
        conditionBlock,
        {
          logic: "or",
          comparisons: [
            comparison("var-1", "eq", { kind: "literal", value: "sim" }),
            comparison("var-2", "eq", { kind: "literal", value: "sim" }, "cmp-2"),
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "true" });
  });

  it("faz curto-circuito: o `E` nem lê a segunda variável", async () => {
    const { ctx, reads } = fakeContext({ "var-1": "nao", "var-2": "sim" });

    await execute(
      conditionBlock,
      {
        logic: "and",
        comparisons: [
          comparison("var-1", "eq", { kind: "literal", value: "sim" }),
          comparison("var-2", "eq", { kind: "literal", value: "sim" }, "cmp-2"),
        ],
      },
      ctx,
    );

    expect(reads).toEqual(["var-1"]);
  });

  /**
   * O teste que pega o `get` que não resolvia variável de sistema por id: antes
   * da spec 009 ele devolvia string vazia, e esta condição respondia `false`
   * para qualquer hora do dia.
   */
  it("compara uma variável de sistema, lida por id e com o tipo dela", async () => {
    const { ctx } = fakeContext(
      { "sys:hora": "14:30" },
      { types: { "sys:hora": "time" } },
    );

    await expect(
      execute(
        conditionBlock,
        {
          logic: "and",
          comparisons: [
            comparison("sys:hora", "between", {
              kind: "range",
              from: "08:00",
              to: "18:00",
            }),
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "true" });
  });

  it("uma comparação sem variável é falsa, e não derruba a execução", async () => {
    const { ctx } = fakeContext();

    await expect(
      execute(
        conditionBlock,
        {
          logic: "and",
          comparisons: [
            { id: "cmp-1", variableId: null, operator: "eq", right: { kind: "literal", value: "x" } },
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "false" });
  });
});

describe("setVariable.execute", () => {
  it("grava o valor e continua", async () => {
    const { ctx, store } = fakeContext();

    const outcome = await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "set",
        value: { kind: "literal", value: "sim" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("sim");
    expect(outcome).toEqual({ kind: "next", handle: "out" });
  });

  it("interpola o literal, porque `{{}}` não pode funcionar só numa caixa", async () => {
    const { ctx, store } = fakeContext({ "sys:nome": "Maria" });

    await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "set",
        value: { kind: "literal", value: "Olá, {{nome}}" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("Olá, Maria");
  });

  it("copia de outra variável", async () => {
    const { ctx, store } = fakeContext({ "var-origem": "João" });

    await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "set",
        value: { kind: "variable", variableId: "var-origem" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("João");
  });

  it("incrementa a partir do zero quando a variável está vazia", async () => {
    const { ctx, store } = fakeContext();

    await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "increment",
        value: { kind: "literal", value: "1" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("1");
  });

  it("decrementa abaixo de zero", async () => {
    const { ctx, store } = fakeContext({ "var-1": "1" });

    await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "decrement",
        value: { kind: "literal", value: "3" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("-2");
  });

  it("não deixa o ponto flutuante vazar para a mensagem do cliente", async () => {
    const { ctx, store } = fakeContext({ "var-1": "0,1" });

    await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "increment",
        value: { kind: "literal", value: "0,2" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("0.3");
  });

  it("soma zero quando a parcela é ilegível, em vez de gravar NaN", async () => {
    const { ctx, store } = fakeContext({ "var-1": "5" });

    await execute(
      setVariableBlock,
      {
        variableId: "var-1",
        operation: "increment",
        value: { kind: "literal", value: "muito" },
      },
      ctx,
    );

    expect(store.get("var-1")).toBe("5");
  });

  it("sem variável escolhida, continua sem gravar nada", async () => {
    const { ctx, store } = fakeContext();

    const outcome = await execute(
      setVariableBlock,
      {
        variableId: null,
        operation: "set",
        value: { kind: "literal", value: "sim" },
      },
      ctx,
    );

    expect(store.size).toBe(0);
    expect(outcome).toEqual({ kind: "next", handle: "out" });
  });
});

describe("randomizer.execute", () => {
  const branches = [
    { id: "branch-a", label: "A", percentage: 30 },
    { id: "branch-b", label: "B", percentage: 70 },
  ];

  it("escolhe a primeira saída no começo da faixa", async () => {
    const { ctx } = fakeContext({}, { random: 0 });

    await expect(execute(randomizerBlock, { branches }, ctx)).resolves.toEqual({
      kind: "next",
      handle: "branch-a",
    });
  });

  it("escolhe a última saída no fim da faixa", async () => {
    const { ctx } = fakeContext({}, { random: 0.99 });

    await expect(execute(randomizerBlock, { branches }, ctx)).resolves.toEqual({
      kind: "next",
      handle: "branch-b",
    });
  });

  it("respeita a borda entre as duas faixas", async () => {
    // 29,9% ainda é da primeira; 30% já é da segunda.
    const antes = fakeContext({}, { random: 0.299 });
    const depois = fakeContext({}, { random: 0.3 });

    await expect(
      execute(randomizerBlock, { branches }, antes.ctx),
    ).resolves.toMatchObject({ handle: "branch-a" });
    await expect(
      execute(randomizerBlock, { branches }, depois.ctx),
    ).resolves.toMatchObject({ handle: "branch-b" });
  });

  it("uma saída de 0% nunca é escolhida, nem no sorteio zero", async () => {
    const { ctx } = fakeContext({}, { random: 0 });

    await expect(
      execute(
        randomizerBlock,
        {
          branches: [
            { id: "branch-zero", label: "Zero", percentage: 0 },
            { id: "branch-a", label: "A", percentage: 100 },
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "branch-a" });
  });

  it("a sobra de ponto flutuante cai na última saída com percentual", async () => {
    const { ctx } = fakeContext({}, { random: 0.9999999 });

    await expect(
      execute(
        randomizerBlock,
        {
          branches: [
            { id: "branch-a", label: "A", percentage: 33.3 },
            { id: "branch-b", label: "B", percentage: 33.3 },
            { id: "branch-c", label: "C", percentage: 33.3 },
          ],
        },
        ctx,
      ),
    ).resolves.toEqual({ kind: "next", handle: "branch-c" });
  });
});
