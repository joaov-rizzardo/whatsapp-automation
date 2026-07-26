import type { Automation } from "../types/automation";

/**
 * Dados temporários: a tela é só layout, não há API nem persistência. Some
 * inteiro quando a spec de persistência entrar — nenhum componente conhece este
 * arquivo, só o hook da lista.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const reference = Date.now();
const ago = (ms: number) => new Date(reference - ms).toISOString();

export const mockAutomations: Automation[] = [
  {
    id: "boas-vindas-novo-lead",
    name: "Boas-vindas novo lead",
    status: "active",
    trigger: { kind: "keyword", keywords: ["oi", "olá"] },
    blockCount: 12,
    conversations: 184,
    completionRate: 0.72,
    updatedAt: ago(2 * DAY),
  },
  {
    id: "catalogo-de-produtos",
    name: "Catálogo de produtos",
    status: "active",
    trigger: { kind: "keyword", keywords: ["catálogo", "preço"] },
    blockCount: 16,
    conversations: 1284,
    completionRate: 0.58,
    updatedAt: ago(5 * HOUR),
  },
  {
    id: "fora-do-horario",
    name: "Fora do horário",
    status: "active",
    trigger: { kind: "anyMessage" },
    blockCount: 5,
    conversations: 512,
    completionRate: 0.91,
    updatedAt: ago(14 * DAY),
  },
  {
    id: "agendamento-de-horario",
    name: "Agendamento de horário",
    status: "active",
    trigger: { kind: "keyword", keywords: ["agendar"] },
    blockCount: 21,
    conversations: 342,
    completionRate: 0.66,
    updatedAt: ago(9 * DAY),
  },
  {
    id: "recuperacao-de-carrinho",
    name: "Recuperação de carrinho",
    status: "paused",
    trigger: { kind: "anyMessage" },
    blockCount: 8,
    conversations: 96,
    completionRate: 0.41,
    updatedAt: ago(6 * DAY),
  },
  {
    id: "qualificacao-primeiro-contato",
    name: "Qualificação de primeiro contato",
    status: "paused",
    trigger: { kind: "firstContact" },
    blockCount: 9,
    conversations: 73,
    completionRate: 0.34,
    updatedAt: ago(21 * DAY),
  },
  {
    id: "pesquisa-de-satisfacao",
    name: "Pesquisa de satisfação",
    status: "draft",
    trigger: { kind: "none" },
    blockCount: 3,
    conversations: 0,
    completionRate: null,
    updatedAt: ago(20 * MINUTE),
  },
];
