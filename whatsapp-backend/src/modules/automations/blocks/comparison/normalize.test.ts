import { describe, expect, it } from "vitest";

import { isTruthy, normalizeText } from "./normalize.js";

/**
 * Os casos do `normalizeText` vieram inteiros do `keyword.test.ts` junto com a
 * função (spec 009 §3): se `"ORÇAMENTO!!"` casa com `"orcamento"` no gatilho,
 * `contém` tem que enxergar igual — duas normalizações seriam duas explicações
 * diferentes para a mesma pessoa.
 */
describe("normalizeText", () => {
  it("strips diacritics, lowercases and turns punctuation into a separator", () => {
    expect(normalizeText("Quero um ORÇAMENTO!!")).toBe("quero um orcamento");
  });

  it("treats emoji as a separator, not as part of a word", () => {
    expect(normalizeText("oi👋tudo bem")).toBe("oi tudo bem");
  });

  it("collapses repeated separators and trims the edges", () => {
    expect(normalizeText("  ...oi,,  tudo   bem!  ")).toBe("oi tudo bem");
  });

  it("keeps digits, which are part of what people write", () => {
    expect(normalizeText("Plano 2 por favor")).toBe("plano 2 por favor");
  });

  it("returns an empty string for text with nothing but punctuation", () => {
    expect(normalizeText("!!! ??? 🙂")).toBe("");
  });
});

describe("isTruthy", () => {
  it("accepts what the editor writes", () => {
    expect(isTruthy("true")).toBe(true);
    expect(isTruthy("false")).toBe(false);
  });

  it("accepts what a person types, since a variable can be copied from a reply", () => {
    expect(isTruthy("Sim")).toBe(true);
    expect(isTruthy("SIM!")).toBe(true);
    expect(isTruthy("yes")).toBe(true);
    expect(isTruthy("Verdadeiro")).toBe(true);
    expect(isTruthy("1")).toBe(true);
  });

  it("is false for everything else, including empty and 0", () => {
    expect(isTruthy("")).toBe(false);
    expect(isTruthy("   ")).toBe(false);
    expect(isTruthy("0")).toBe(false);
    expect(isTruthy("talvez")).toBe(false);
    expect(isTruthy("não")).toBe(false);
  });
});
