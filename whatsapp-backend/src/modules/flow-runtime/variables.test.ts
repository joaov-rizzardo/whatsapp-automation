import { describe, expect, it } from "vitest";

import type { FlowVariableDocument } from "../automations/flow.schema.js";
import { LAST_REPLY_VARIABLE_ID, createVariableStore } from "./variables.js";

const contact = { number: "5511988887777", name: "João Silva" };

function store(options: {
  variables?: FlowVariableDocument[];
  values?: Record<string, string>;
  contact?: { number: string; name: string | null };
  now?: Date;
}) {
  return createVariableStore({
    variables: options.variables ?? [],
    values: options.values ?? {},
    contact: options.contact ?? contact,
    now: () => options.now ?? new Date("2026-07-29T15:30:00Z"),
  });
}

const nomeCliente: FlowVariableDocument = {
  id: "var-1",
  name: "nome_cliente",
  type: "text",
  initialValue: "ninguém",
};

describe("createVariableStore", () => {
  describe("document variables", () => {
    it("starts a variable at its initialValue", () => {
      expect(store({ variables: [nomeCliente] }).get("var-1")).toBe("ninguém");
    });

    it("prefers a stored value over the initialValue", () => {
      const subject = store({
        variables: [nomeCliente],
        values: { "var-1": "Maria" },
      });

      expect(subject.get("var-1")).toBe("Maria");
    });

    it("keeps a stored empty string instead of falling back to the initialValue", () => {
      const subject = store({
        variables: [nomeCliente],
        values: { "var-1": "" },
      });

      expect(subject.get("var-1")).toBe("");
    });

    it("reads back what was set, and exposes it for persistence", () => {
      const subject = store({ variables: [nomeCliente] });

      subject.set("var-1", "Pedro");

      expect(subject.get("var-1")).toBe("Pedro");
      expect(subject.toJSON()).toEqual({ "var-1": "Pedro" });
    });

    it("reads an unknown id as an empty string rather than throwing", () => {
      expect(store({}).get("var-ghost")).toBe("");
    });
  });

  describe("sys:ultima_resposta", () => {
    it("is stored, so it survives between steps", () => {
      const subject = store({ values: { [LAST_REPLY_VARIABLE_ID]: "meu nome é João" } });

      expect(subject.render("Você disse: {{ultima_resposta}}")).toBe(
        "Você disse: meu nome é João",
      );
    });

    it("goes into the persisted JSON, unlike the other system variables", () => {
      const subject = store({});

      subject.set(LAST_REPLY_VARIABLE_ID, "oi");

      expect(subject.toJSON()).toEqual({ [LAST_REPLY_VARIABLE_ID]: "oi" });
    });

    it("renders as empty before the first reply", () => {
      expect(store({}).render("[{{ultima_resposta}}]")).toBe("[]");
    });
  });

  describe("system variables", () => {
    it("uses the pushName for nome and its first word for primeiro_nome", () => {
      const subject = store({});

      expect(subject.render("{{nome}} / {{primeiro_nome}}")).toBe(
        "João Silva / João",
      );
    });

    it("falls back to the number when the contact has no pushName", () => {
      const subject = store({
        contact: { number: "5511988887777", name: null },
      });

      expect(subject.render("{{nome}}")).toBe("5511988887777");
      expect(subject.render("{{primeiro_nome}}")).toBe("5511988887777");
    });

    it("exposes the phone number", () => {
      expect(store({}).render("{{numero_telefone}}")).toBe("5511988887777");
    });

    // The test that catches a raw `new Date().getHours()`: 2026-07-29T02:30Z is
    // still the 28th, at 23:30, in São Paulo (UTC-3).
    it("resolves the clock in America/Sao_Paulo, not in the server's timezone", () => {
      const subject = store({ now: new Date("2026-07-29T02:30:00Z") });

      expect(subject.render("{{hora}}")).toBe("23:30");
      expect(subject.render("{{data}}")).toBe("2026-07-28");
      expect(subject.render("{{mes}}")).toBe("7");
      // 2026-07-28 is a Tuesday -> ISO weekday 2.
      expect(subject.render("{{dia_semana}}")).toBe("2");
    });

    it("formats the hour with a leading zero and midnight as 00", () => {
      const subject = store({ now: new Date("2026-07-29T04:05:00Z") });

      expect(subject.render("{{hora}}")).toBe("01:05");
      expect(store({ now: new Date("2026-07-29T03:00:00Z") }).render("{{hora}}")).toBe(
        "00:00",
      );
    });

    it("uses ISO weekday numbering, where Sunday is 7", () => {
      // 2026-08-02 is a Sunday.
      const subject = store({ now: new Date("2026-08-02T15:00:00Z") });

      expect(subject.render("{{dia_semana}}")).toBe("7");
    });

    it("never persists a computed system variable — that would freeze a clock", () => {
      const subject = store({});

      subject.render("{{hora}}");

      expect(subject.toJSON()).toEqual({});
    });
  });

  /**
   * O que a spec 009 acrescentou. Até ela, `sys:` só era resolvido pelo
   * `render`, por NOME — `get("sys:hora")` devolvia string vazia, e nenhum
   * bloco de então exercitava isso. Os três blocos da 009 leem por id o tempo
   * todo, e uma condição sobre uma hora vazia responderia sempre a mesma coisa.
   */
  describe("system variables read by id", () => {
    it("resolves the clock by id, in the same timezone render uses", () => {
      const subject = store({ now: new Date("2026-07-29T02:30:00Z") });

      expect(subject.get("sys:hora")).toBe("23:30");
      expect(subject.get("sys:data")).toBe("2026-07-28");
      expect(subject.get("sys:mes")).toBe("7");
      expect(subject.get("sys:dia_semana")).toBe("2");
    });

    it("resolves the contact by id", () => {
      const subject = store({});

      expect(subject.get("sys:nome")).toBe("João Silva");
      expect(subject.get("sys:primeiro_nome")).toBe("João");
      expect(subject.get("sys:numero_telefone")).toBe("5511988887777");
    });

    it("keeps reading sys:ultima_resposta from what was stored", () => {
      const subject = store({ values: { [LAST_REPLY_VARIABLE_ID]: "oi" } });

      expect(subject.get(LAST_REPLY_VARIABLE_ID)).toBe("oi");
    });

    it("reads an unknown sys: id as empty rather than throwing", () => {
      expect(store({}).get("sys:inventada")).toBe("");
    });

    it("ignores a write to a computed system variable", () => {
      // A publicação já barra; isto é defesa em profundidade para um documento
      // congelado por um validador mais velho. Ignorar é melhor que lançar: uma
      // execução não deve morrer por causa disso.
      const subject = store({ now: new Date("2026-07-29T02:30:00Z") });

      subject.set("sys:hora", "07:00");

      expect(subject.get("sys:hora")).toBe("23:30");
      expect(subject.toJSON()).toEqual({});
    });
  });

  describe("typeOf", () => {
    it("gives the declared type of a document variable", () => {
      const subject = store({
        variables: [
          nomeCliente,
          { id: "var-2", name: "total", type: "number", initialValue: "0" },
        ],
      });

      expect(subject.typeOf("var-1")).toBe("text");
      expect(subject.typeOf("var-2")).toBe("number");
    });

    it("gives the special type of a system variable, which the document cannot hold", () => {
      const subject = store({});

      expect(subject.typeOf("sys:hora")).toBe("time");
      expect(subject.typeOf("sys:data")).toBe("date");
      expect(subject.typeOf("sys:mes")).toBe("month");
      expect(subject.typeOf("sys:dia_semana")).toBe("weekday");
      expect(subject.typeOf("sys:nome")).toBe("text");
    });

    it("falls back to text for an unknown id, so a deleted variable is comparable", () => {
      expect(store({}).typeOf("var-ghost")).toBe("text");
    });
  });

  describe("render", () => {
    it("replaces every occurrence, including repeats", () => {
      const subject = store({
        variables: [nomeCliente],
        values: { "var-1": "Ana" },
      });

      expect(subject.render("{{nome_cliente}}, oi {{nome_cliente}}!")).toBe(
        "Ana, oi Ana!",
      );
    });

    it("tolerates spaces inside the braces, as the editor's pattern allows", () => {
      const subject = store({
        variables: [nomeCliente],
        values: { "var-1": "Ana" },
      });

      expect(subject.render("{{  nome_cliente  }}")).toBe("Ana");
    });

    // Publishing already refuses an unknown name, so this only happens to a
    // version published before a variable was deleted. A raw `{{x}}` reaching
    // the customer would be worse than nothing.
    it("renders an unknown name as empty", () => {
      expect(store({}).render("Oi {{fantasma}}!")).toBe("Oi !");
    });

    it("leaves text with no placeholders untouched", () => {
      expect(store({}).render("Bom dia!")).toBe("Bom dia!");
    });

    it("resolves by name, so two variables with similar names do not collide", () => {
      const subject = store({
        variables: [
          nomeCliente,
          { id: "var-2", name: "nome_cliente_2", type: "text", initialValue: "B" },
        ],
        values: { "var-1": "A" },
      });

      expect(subject.render("{{nome_cliente}}|{{nome_cliente_2}}")).toBe("A|B");
    });
  });
});
