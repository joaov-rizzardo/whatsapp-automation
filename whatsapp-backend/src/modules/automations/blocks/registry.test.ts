import { describe, expect, it } from "vitest";

import { getExecutable, isExecutable } from "./registry.js";

/**
 * O que estes testes protegem não é o mapa — é a promessa da spec 008 §4.10:
 * "tem `execute`" e "é publicável" são a mesma frase. Quando `comparação` ganhar
 * o seu `execute`, é este arquivo que muda de lado, e nada mais.
 */
describe("isExecutable", () => {
  it("says yes for the four blocks the engine runs today", () => {
    expect(isExecutable("start")).toBe(true);
    expect(isExecutable("text")).toBe(true);
    expect(isExecutable("delay")).toBe(true);
    expect(isExecutable("waitReply")).toBe(true);
  });

  it("says no for the blocks whose execute the next spec writes", () => {
    expect(isExecutable("condition")).toBe(false);
    expect(isExecutable("setVariable")).toBe(false);
    expect(isExecutable("randomizer")).toBe(false);
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

  it("returns null for a block that cannot run yet", () => {
    expect(getExecutable("condition")).toBeNull();
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
