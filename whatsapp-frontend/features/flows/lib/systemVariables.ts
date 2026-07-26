import type { FlowVariable } from "@/features/flows/types/variable";

/**
 * Variables the runtime provides — date/time, who's on the other side, and the
 * last message received. Read-only: they show up as the left side of a
 * condition, never as a write target.
 *
 * Constant, outside the editor's state: they don't change per flow. Their ids
 * are prefixed so a custom variable can never collide with one.
 */
export const systemVariables: FlowVariable[] = [
  {
    id: "sys:dia_semana",
    name: "dia_semana",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "segunda, terça… domingo",
  },
  {
    id: "sys:hora",
    name: "hora",
    type: "number",
    initialValue: "0",
    origin: "system",
    description: "Hora do dia, de 0 a 23",
  },
  {
    id: "sys:minuto",
    name: "minuto",
    type: "number",
    initialValue: "0",
    origin: "system",
    description: "Minuto da hora, de 0 a 59",
  },
  {
    id: "sys:data",
    name: "data",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Data de hoje, no formato dd/mm/aaaa",
  },
  {
    id: "sys:mes",
    name: "mes",
    type: "number",
    initialValue: "1",
    origin: "system",
    description: "Mês do ano, de 1 a 12",
  },
  {
    id: "sys:nome_contato",
    name: "nome_contato",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Nome de quem está conversando",
  },
  {
    id: "sys:telefone_contato",
    name: "telefone_contato",
    type: "text",
    initialValue: "",
    origin: "system",
    description: "Número de quem está conversando",
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
