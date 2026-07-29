import { describe, expect, it } from "vitest";

import { selectTriggeredVersion, type TriggerCandidate } from "./trigger-matcher.js";

function candidate(
  overrides: Partial<TriggerCandidate> & Pick<TriggerCandidate, "id" | "trigger">,
): TriggerCandidate {
  return {
    automationId: `automation-${overrides.id}`,
    publishedAt: new Date("2026-07-01T12:00:00Z"),
    ...overrides,
  };
}

describe("selectTriggeredVersion", () => {
  it("matches a keyword as a whole word", () => {
    const keyword = candidate({
      id: "a",
      trigger: { kind: "keyword", keywords: ["orcamento"] },
    });

    expect(
      selectTriggeredVersion([keyword], {
        text: "Quero um orçamento!",
        isFirstContact: false,
      }),
    ).toBe(keyword);
  });

  it("returns null when no candidate matches", () => {
    const keyword = candidate({
      id: "a",
      trigger: { kind: "keyword", keywords: ["oi"] },
    });

    expect(
      selectTriggeredVersion([keyword], {
        text: "que coisa",
        isFirstContact: false,
      }),
    ).toBeNull();
  });

  // The whole point of the ranking: the most specific intent wins, even when a
  // catch-all was published later.
  it("prefers keyword over firstContact and anyMessage", () => {
    const anyMessage = candidate({
      id: "any",
      trigger: { kind: "anyMessage" },
      publishedAt: new Date("2026-07-20T12:00:00Z"),
    });
    const firstContact = candidate({
      id: "first",
      trigger: { kind: "firstContact" },
      publishedAt: new Date("2026-07-15T12:00:00Z"),
    });
    const keyword = candidate({
      id: "kw",
      trigger: { kind: "keyword", keywords: ["oi"] },
      publishedAt: new Date("2026-07-01T12:00:00Z"),
    });

    expect(
      selectTriggeredVersion([anyMessage, firstContact, keyword], {
        text: "oi",
        isFirstContact: true,
      }),
    ).toBe(keyword);
  });

  it("prefers firstContact over anyMessage", () => {
    const anyMessage = candidate({
      id: "any",
      trigger: { kind: "anyMessage" },
      publishedAt: new Date("2026-07-20T12:00:00Z"),
    });
    const firstContact = candidate({
      id: "first",
      trigger: { kind: "firstContact" },
      publishedAt: new Date("2026-07-01T12:00:00Z"),
    });

    expect(
      selectTriggeredVersion([anyMessage, firstContact], {
        text: "qualquer coisa",
        isFirstContact: true,
      }),
    ).toBe(firstContact);
  });

  it("falls back to anyMessage when the keyword does not match", () => {
    const anyMessage = candidate({ id: "any", trigger: { kind: "anyMessage" } });
    const keyword = candidate({
      id: "kw",
      trigger: { kind: "keyword", keywords: ["orcamento"] },
    });

    expect(
      selectTriggeredVersion([keyword, anyMessage], {
        text: "bom dia",
        isFirstContact: false,
      }),
    ).toBe(anyMessage);
  });

  it("does not fire firstContact for someone who has written before", () => {
    const firstContact = candidate({
      id: "first",
      trigger: { kind: "firstContact" },
    });

    expect(
      selectTriggeredVersion([firstContact], {
        text: "oi de novo",
        isFirstContact: false,
      }),
    ).toBeNull();
  });

  it("breaks a tie by the most recently published", () => {
    const older = candidate({
      id: "older",
      trigger: { kind: "keyword", keywords: ["oi"] },
      publishedAt: new Date("2026-07-01T12:00:00Z"),
    });
    const newer = candidate({
      id: "newer",
      trigger: { kind: "keyword", keywords: ["oi"] },
      publishedAt: new Date("2026-07-20T12:00:00Z"),
    });

    expect(
      selectTriggeredVersion([older, newer], { text: "oi", isFirstContact: false }),
    ).toBe(newer);
  });

  // Determinism matters more than which one wins: the same message must always
  // pick the same flow, including inside one millisecond.
  it("breaks a same-instant tie by id, and does so deterministically", () => {
    const sameInstant = new Date("2026-07-20T12:00:00Z");
    const a = candidate({
      id: "aaa",
      trigger: { kind: "anyMessage" },
      publishedAt: sameInstant,
    });
    const b = candidate({
      id: "bbb",
      trigger: { kind: "anyMessage" },
      publishedAt: sameInstant,
    });

    expect(selectTriggeredVersion([a, b], { text: "oi", isFirstContact: false })).toBe(b);
    expect(selectTriggeredVersion([b, a], { text: "oi", isFirstContact: false })).toBe(b);
  });

  it("never picks a version whose trigger is still undefined", () => {
    const none = candidate({ id: "none", trigger: { kind: "none" } });

    expect(
      selectTriggeredVersion([none], { text: "oi", isFirstContact: true }),
    ).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(
      selectTriggeredVersion([], { text: "oi", isFirstContact: true }),
    ).toBeNull();
  });

  // Non-text content carries no text to match, and must not silently fire an
  // anyMessage flow the person never spoke to.
  it("matches nothing when there is no text", () => {
    const anyMessage = candidate({ id: "any", trigger: { kind: "anyMessage" } });

    expect(
      selectTriggeredVersion([anyMessage], { text: null, isFirstContact: true }),
    ).toBeNull();
  });
});
