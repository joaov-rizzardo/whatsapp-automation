import { describe, expect, it } from "vitest";

import { evaluateComparison } from "./evaluate.js";
import type { ComparisonValue } from "../value-schemas.js";
import type { VariableType } from "../variable-types.js";

function check(
  type: VariableType,
  left: string,
  operator: string,
  right: ComparisonValue = { kind: "literal", value: "" },
  resolve: (variableId: string) => string = () => "",
): boolean {
  return evaluateComparison({ type, operator, left, right, resolve });
}

const literal = (value: string): ComparisonValue => ({ kind: "literal", value });
const range = (from: string, to: string): ComparisonValue => ({
  kind: "range",
  from,
  to,
});
const set = (...values: string[]): ComparisonValue => ({ kind: "set", values });

describe("texto", () => {
  it("compara ignorando caixa, acento e pontuação", () => {
    expect(check("text", "Sim!", "eq", literal("sim"))).toBe(true);
    expect(check("text", "JOÃO", "eq", literal("joao"))).toBe(true);
    expect(check("text", "sim", "neq", literal("sim"))).toBe(false);
  });

  it("`contém` é substring, ao contrário do gatilho por palavra-chave", () => {
    // A diferença é deliberada (spec 009 §3): aqui o usuário escolheu "contém"
    // numa lista onde "é" e "começa com" também estavam.
    expect(check("text", "joao", "contains", literal("joa"))).toBe(true);
    expect(check("text", "coisa", "contains", literal("oi"))).toBe(true);
    expect(check("text", "coisa", "not_contains", literal("oi"))).toBe(false);
  });

  it("começa e termina", () => {
    expect(check("text", "Bom dia", "starts_with", literal("bom"))).toBe(true);
    expect(check("text", "Bom dia", "ends_with", literal("dia"))).toBe(true);
    expect(check("text", "Bom dia", "starts_with", literal("dia"))).toBe(false);
  });

  it("`está vazio` olha o valor cru, não o normalizado", () => {
    // Uma mensagem só de emoji normaliza para vazio e NÃO está vazia: `empty`
    // responde "a pessoa não escreveu nada".
    expect(check("text", "", "empty")).toBe(true);
    expect(check("text", "   ", "empty")).toBe(true);
    expect(check("text", "🙂", "empty")).toBe(false);
    expect(check("text", "🙂", "not_empty")).toBe(true);
  });
});

describe("número", () => {
  it("ordena como número, não como texto", () => {
    expect(check("number", "9", "lt", literal("10"))).toBe(true);
    expect(check("number", "10", "gte", literal("10"))).toBe(true);
    expect(check("number", "10,5", "gt", literal("10"))).toBe(true);
    expect(check("number", "10", "eq", literal("10.0"))).toBe(true);
  });

  it("valor ilegível é falso — e o operador negado também", () => {
    // A regra que mais surpreende (spec 009 §3): "não deu certo" sai pelo
    // `false`, que é o caminho que a pessoa desenhou para isso. Deixar o `neq`
    // virar verdadeiro faria um dado corrompido ACIONAR um ramo.
    expect(check("number", "dez", "gt", literal("5"))).toBe(false);
    expect(check("number", "dez", "neq", literal("5"))).toBe(false);
    expect(check("number", "5", "neq", literal("cinco"))).toBe(false);
  });
});

describe("booleano", () => {
  it("aceita o que a pessoa digitou, não só o que o editor grava", () => {
    expect(check("boolean", "sim", "is_true")).toBe(true);
    expect(check("boolean", "true", "is_true")).toBe(true);
    expect(check("boolean", "false", "is_true")).toBe(false);
    expect(check("boolean", "talvez", "is_false")).toBe(true);
  });
});

describe("hora", () => {
  it("`entre` é inclusivo nas duas pontas", () => {
    expect(check("time", "08:00", "between", range("08:00", "18:00"))).toBe(true);
    expect(check("time", "18:00", "between", range("08:00", "18:00"))).toBe(true);
    expect(check("time", "18:01", "between", range("08:00", "18:00"))).toBe(false);
  });

  it("a faixa atravessa a meia-noite quando o início é maior que o fim", () => {
    // Sem isto, plantão noturno exigiria um OU de duas condições.
    expect(check("time", "23:00", "between", range("22:00", "06:00"))).toBe(true);
    expect(check("time", "02:00", "between", range("22:00", "06:00"))).toBe(true);
    expect(check("time", "12:00", "between", range("22:00", "06:00"))).toBe(false);
  });

  it("`não entre` é o inverso exato, inclusive atravessando a meia-noite", () => {
    expect(check("time", "12:00", "not_between", range("22:00", "06:00"))).toBe(true);
    expect(check("time", "23:00", "not_between", range("22:00", "06:00"))).toBe(false);
  });

  it("ordena", () => {
    expect(check("time", "09:00", "after", literal("08:00"))).toBe(true);
    expect(check("time", "08:00", "on_or_after", literal("08:00"))).toBe(true);
    expect(check("time", "08:00", "before", literal("08:00"))).toBe(false);
  });

  it("hora malformada é falsa dos dois lados", () => {
    expect(check("time", "24:00", "after", literal("08:00"))).toBe(false);
    expect(check("time", "08:00", "after", literal("8h"))).toBe(false);
    expect(check("time", "08:00", "between", range("08:00", ""))).toBe(false);
  });
});

describe("data", () => {
  it("compara a janela da campanha", () => {
    expect(
      check("date", "2026-07-30", "between", range("2026-07-01", "2026-07-31")),
    ).toBe(true);
    expect(
      check("date", "2026-08-01", "between", range("2026-07-01", "2026-07-31")),
    ).toBe(false);
  });

  it("`é` e a ordenação", () => {
    expect(check("date", "2026-07-30", "eq", literal("2026-07-30"))).toBe(true);
    expect(check("date", "2026-07-30", "after", literal("2026-01-01"))).toBe(true);
  });

  it("data que não existe é falsa", () => {
    expect(check("date", "2026-02-31", "eq", literal("2026-02-31"))).toBe(false);
  });
});

describe("mês e dia da semana", () => {
  it("pertence ao conjunto", () => {
    expect(check("month", "12", "in", set("12", "1"))).toBe(true);
    expect(check("month", "7", "in", set("12", "1"))).toBe(false);
    expect(check("month", "7", "not_in", set("12", "1"))).toBe(true);
  });

  it("dia útil é segunda a sexta, e nada além disso", () => {
    // Não temos calendário de feriados, e chamar isto de "dia útil" prometeria
    // o que não entregamos.
    expect(check("weekday", "5", "is_weekday")).toBe(true);
    expect(check("weekday", "6", "is_weekday")).toBe(false);
    expect(check("weekday", "7", "is_weekend")).toBe(true);
  });

  it("conjunto vazio não casa com nada", () => {
    expect(check("weekday", "1", "in", set())).toBe(false);
  });

  it("um item ilegível no conjunto derruba a comparação", () => {
    expect(check("month", "12", "in", set("12", "treze"))).toBe(false);
  });
});

describe("lado direito por variável", () => {
  it("resolve pela porta e coage pelo tipo da ESQUERDA", () => {
    const resolve = (id: string) => (id === "var-1" ? "10,5" : "");

    expect(
      check(
        "number",
        "11",
        "gt",
        { kind: "variable", variableId: "var-1" },
        resolve,
      ),
    ).toBe(true);
  });

  it("variável não escolhida é falsa", () => {
    expect(check("text", "oi", "eq", { kind: "variable", variableId: null })).toBe(
      false,
    );
  });
});

describe("guardas", () => {
  it("operador que não vale para o tipo é falso", () => {
    expect(check("number", "10", "contains", literal("1"))).toBe(false);
    expect(check("text", "10", "gt", literal("1"))).toBe(false);
  });

  it("forma de valor que não bate com o operador é falsa", () => {
    // Um documento adulterado poderia trazer um `between` com um literal.
    expect(check("time", "08:00", "between", literal("08:00"))).toBe(false);
    expect(check("month", "12", "in", literal("12"))).toBe(false);
  });
});
