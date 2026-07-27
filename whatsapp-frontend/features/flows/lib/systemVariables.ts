import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * Variables the runtime provides — who's on the other side, the clock, and the
 * last message received. Read-only: they show up as the left side of a
 * condition, never as a write target.
 *
 * Constant, outside the editor's state: they don't change per flow. Their ids
 * are prefixed so a custom variable can never collide with one.
 *
 * Four of them carry a **special** type, which only exists here — no custom
 * variable is ever a hora or a data. That's what gives the condition block its
 * range and set pickers instead of a bare text field.
 *
 * Date and time are always resolved in `America/Sao_Paulo`.
 */
export const systemVariables: FlowVariable[] = [
  {
    id: "sys:nome",
    name: "nome",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Nome de quem está conversando",
  },
  {
    id: "sys:primeiro_nome",
    name: "primeiro_nome",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Só o primeiro nome, para saudar",
  },
  {
    id: "sys:numero_telefone",
    name: "numero_telefone",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Número de quem está conversando, com DDI e DDD",
  },
  {
    id: "sys:hora",
    name: "hora",
    type: "time",
    initialValue: "00:00",
    origin: "system",
    description: "Hora atual, no fuso de São Paulo",
  },
  {
    id: "sys:data",
    name: "data",
    type: "date",
    initialValue: "1970-01-01",
    origin: "system",
    description: "Data de hoje",
  },
  {
    id: "sys:mes",
    name: "mes",
    type: "month",
    initialValue: "1",
    origin: "system",
    description: "Mês atual",
  },
  {
    id: "sys:dia_semana",
    name: "dia_semana",
    type: "weekday",
    initialValue: "1",
    origin: "system",
    description: "Dia da semana de hoje",
  },
  {
    id: "sys:ultima_resposta",
    name: "ultima_resposta",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Texto da última mensagem recebida",
  },
];

export const systemVariableNames = new Set(systemVariables.map((v) => v.name));
