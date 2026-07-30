import { describe, expect, it } from "vitest";

import { getExecutable, isExecutable } from "./registry.js";

/**
 * O que estes testes protegem não é o mapa — é a promessa da spec 008 §4.10:
 * "tem `execute`" e "é publicável" são a mesma frase, perguntada ao mesmo
 * registry que o motor consulta.
 *
 * A spec 009 é onde a promessa se pagou: os três blocos que faltavam ganharam o
 * seu `execute` e passaram a publicar **sem uma linha de código de publicação
 * mudar** — só este arquivo mudou de lado. A regra continua de pé para o
 * próximo bloco que nascer sem `execute` (mídia, botões).
 */
describe("isExecutable", () => {
  it("says yes for every block the editor offers today", () => {
    expect(isExecutable("start")).toBe(true);
    expect(isExecutable("text")).toBe(true);
    expect(isExecutable("delay")).toBe(true);
    expect(isExecutable("waitReply")).toBe(true);
    expect(isExecutable("condition")).toBe(true);
    expect(isExecutable("setVariable")).toBe(true);
    expect(isExecutable("randomizer")).toBe(true);
  });

  it("says no for a type that does not exist at all", () => {
    expect(isExecutable("carrierPigeon")).toBe(false);
  });
});

describe("getExecutable", () => {
  it("returns a definition whose execute can be called", () => {
    const block = getExecutable("start");

    expect(block).not.toBeNull();
    expect(typeof block?.execute).toBe("function");
  });

  it("returns null for an unknown type", () => {
    expect(getExecutable("carrierPigeon")).toBeNull();
  });

  // A block that suspends without a resume would leave the conversation stuck
  // forever — the kind of mistake that only shows up in production, at 2am.
  it("guarantees every block that can await a reply knows how to resume", () => {
    const awaiting = getExecutable("waitReply");

    expect(typeof awaiting?.resume).toBe("function");
  });
});
