import { describe, expect, it } from "vitest";

import { matchesKeyword } from "./keyword.js";

describe("matchesKeyword", () => {
  it("matches a whole word regardless of accent, case and punctuation", () => {
    expect(matchesKeyword("Quero um orçamento!", ["orcamento"])).toBe(true);
    expect(matchesKeyword("ORÇAMENTO", ["orcamento"])).toBe(true);
  });

  it("matches a keyword written with an accent against a message without one", () => {
    expect(matchesKeyword("quero orcamento", ["orçamento"])).toBe(true);
  });

  // The falsest of false positives, and the reason this is not `includes`: on
  // day one someone registers "oi" and every "coisa" fires the bot.
  it("does not match inside a longer word", () => {
    expect(matchesKeyword("que coisa", ["oi"])).toBe(false);
    expect(matchesKeyword("um boi", ["oi"])).toBe(false);
    expect(matchesKeyword("oitenta reais", ["oi"])).toBe(false);
  });

  it("does not match a plural — it is another word", () => {
    expect(matchesKeyword("quero orcamentos", ["orcamento"])).toBe(false);
  });

  it("matches a multi-word keyword as a contiguous sequence", () => {
    expect(matchesKeyword("eu quero orcamento hoje", ["quero orcamento"])).toBe(
      true,
    );
  });

  it("does not match a multi-word keyword whose words are apart", () => {
    expect(matchesKeyword("quero saber do orcamento", ["quero orcamento"])).toBe(
      false,
    );
  });

  it("matches when any one of the keywords matches", () => {
    expect(matchesKeyword("bom dia", ["oi", "ola", "bom dia"])).toBe(true);
  });

  it("ignores empty and punctuation-only keywords instead of matching everything", () => {
    expect(matchesKeyword("qualquer coisa", ["", "   ", "!!!"])).toBe(false);
  });

  it("does not match an empty message", () => {
    expect(matchesKeyword("", ["oi"])).toBe(false);
    expect(matchesKeyword("!!!", ["oi"])).toBe(false);
  });

  it("does not match an empty keyword list", () => {
    expect(matchesKeyword("oi", [])).toBe(false);
  });
});
