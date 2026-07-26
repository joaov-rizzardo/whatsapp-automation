import type { FlowValidationVariable } from "./block-definition.js";

/**
 * As variáveis que o runtime preenche — data/hora, quem está do outro lado e a
 * última mensagem recebida. Não entram no documento (spec §4.1): são constantes
 * de que o backend é dono, e gravá-las seria congelar uma lista nossa dentro do
 * fluxo do usuário.
 *
 * Existem aqui porque a validação semântica precisa delas: uma mensagem com
 * `{{nome_contato}}` ou uma condição sobre `hora` é legítima, e sem esta lista
 * a publicação recusaria as duas.
 *
 * Somente leitura: comparáveis, nunca alvo de escrita — é o que `origin` faz o
 * bloco `setVariable` conseguir distinguir.
 */
export const systemVariables: FlowValidationVariable[] = [
  { id: "sys:dia_semana", name: "dia_semana", type: "text", initialValue: "", origin: "system" },
  { id: "sys:hora", name: "hora", type: "number", initialValue: "0", origin: "system" },
  { id: "sys:minuto", name: "minuto", type: "number", initialValue: "0", origin: "system" },
  { id: "sys:data", name: "data", type: "text", initialValue: "", origin: "system" },
  { id: "sys:mes", name: "mes", type: "number", initialValue: "1", origin: "system" },
  { id: "sys:nome_contato", name: "nome_contato", type: "text", initialValue: "", origin: "system" },
  {
    id: "sys:telefone_contato",
    name: "telefone_contato",
    type: "text",
    initialValue: "",
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
