import type { FlowValidationVariable } from "./block-definition.js";

/**
 * As variáveis que o runtime preenche — quem está do outro lado, o relógio e a
 * última mensagem recebida. Não entram no documento (spec §4.1): são constantes
 * de que o backend é dono, e gravá-las seria congelar uma lista nossa dentro do
 * fluxo do usuário.
 *
 * Existem aqui porque a validação semântica precisa delas: uma mensagem com
 * `{{nome}}` ou uma condição sobre `hora` é legítima, e sem esta lista a
 * publicação recusaria as duas.
 *
 * Somente leitura: comparáveis, nunca alvo de escrita — é o que `origin` faz o
 * bloco `setVariable` conseguir distinguir. Quatro delas são de tipo ESPECIAL
 * (`variable-types.ts`), que só existe aqui: nenhuma variável do fluxo pode ser
 * de hora, data, mês ou dia da semana.
 *
 * Data e hora são sempre resolvidas em `America/Sao_Paulo` — sem um fuso fixo,
 * nenhuma comparação sobre elas quer dizer coisa alguma.
 */
export const systemVariables: FlowValidationVariable[] = [
  { id: "sys:nome", name: "nome", type: "text", initialValue: "", origin: "system" },
  {
    id: "sys:primeiro_nome",
    name: "primeiro_nome",
    type: "text",
    initialValue: "",
    origin: "system",
  },
  {
    id: "sys:numero_telefone",
    name: "numero_telefone",
    type: "text",
    initialValue: "",
    origin: "system",
  },
  {
    id: "sys:hora",
    name: "hora",
    type: "time",
    initialValue: "00:00",
    origin: "system",
  },
  {
    id: "sys:data",
    name: "data",
    type: "date",
    initialValue: "1970-01-01",
    origin: "system",
  },
  { id: "sys:mes", name: "mes", type: "month", initialValue: "1", origin: "system" },
  {
    id: "sys:dia_semana",
    name: "dia_semana",
    type: "weekday",
    initialValue: "1",
    origin: "system",
  },
  {
    id: "sys:ultima_resposta",
    name: "ultima_resposta",
    type: "text",
    initialValue: "",
    origin: "system",
  },
];
