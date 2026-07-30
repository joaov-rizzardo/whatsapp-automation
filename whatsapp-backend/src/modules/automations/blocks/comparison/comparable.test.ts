import { describe, expect, it } from "vitest";

import { toComparable } from "./comparable.js";

/**
 * `null` é a resposta de "não dá para ler isto como este tipo", e é ele que faz
 * a comparação inteira ser falsa (spec 009 §3) — inclusive nos operadores
 * negados. Metade dos casos daqui existe para provar o `null`.
 */
describe("toComparable, number", () => {
  it("reads the decimal comma, which is how people write it", () => {
    expect(toComparable("number", "10,5")).toBe(10.5);
  });

  it("ignores the space around it", () => {
    expect(toComparable("number", " 10 ")).toBe(10);
  });

  it("reads a negative", () => {
    expect(toComparable("number", "-3")).toBe(-3);
  });

  it("refuses anything that is not just a number", () => {
    expect(toComparable("number", "R$ 10")).toBeNull();
    expect(toComparable("number", "10 reais")).toBeNull();
    expect(toComparable("number", "")).toBeNull();
    expect(toComparable("number", "dez")).toBeNull();
    // Duas formas de separador na mesma string não são um número, são um erro.
    expect(toComparable("number", "1.000,5")).toBeNull();
  });
});

describe("toComparable, time", () => {
  it("turns HH:MM into minutes so the ordering is arithmetic", () => {
    expect(toComparable("time", "08:30")).toBe(510);
    expect(toComparable("time", "00:00")).toBe(0);
    expect(toComparable("time", "23:59")).toBe(1439);
  });

  it("refuses a time that is not in the canonical format", () => {
    expect(toComparable("time", "24:00")).toBeNull();
    expect(toComparable("time", "8:30")).toBeNull();
    expect(toComparable("time", "08:60")).toBeNull();
    expect(toComparable("time", "")).toBeNull();
  });
});

describe("toComparable, date", () => {
  it("keeps the ISO string, which already sorts correctly", () => {
    expect(toComparable("date", "2026-07-30")).toBe("2026-07-30");
  });

  it("refuses a date that matches the pattern but does not exist", () => {
    expect(toComparable("date", "2026-02-31")).toBeNull();
    expect(toComparable("date", "30/07/2026")).toBeNull();
  });
});

describe("toComparable, month and weekday", () => {
  it("reads the integer the editor stores", () => {
    expect(toComparable("month", "12")).toBe(12);
    expect(toComparable("weekday", "7")).toBe(7);
  });

  it("refuses a value outside the range", () => {
    expect(toComparable("month", "13")).toBeNull();
    expect(toComparable("month", "0")).toBeNull();
    expect(toComparable("weekday", "8")).toBeNull();
  });
});

describe("toComparable, boolean and text", () => {
  it("reads a boolean as 0 or 1", () => {
    expect(toComparable("boolean", "Sim")).toBe(1);
    expect(toComparable("boolean", "talvez")).toBe(0);
  });

  it("normalizes text, so accent and case never decide a comparison", () => {
    expect(toComparable("text", "João!")).toBe("joao");
  });

  it("reads empty text as empty text, never as null", () => {
    // Texto nunca é ilegível: `""` é um valor, e é o que `eq ""` compara.
    expect(toComparable("text", "")).toBe("");
  });
});
