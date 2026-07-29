import type { AutomationTrigger } from "../automations/blocks/start/start.block.js";
import { matchesKeyword } from "./keyword.js";

/**
 * Qual fluxo publicado responde a esta mensagem — puro, e a única regra que
 * decide qual automação "ganha" quando várias poderiam responder.
 *
 * O gatilho vem SEMPRE da versão publicada, nunca de `automation.trigger`: a
 * coluna da automação é derivada do rascunho e pode já ter mudado desde a
 * publicação (spec 008 §4.4).
 */

/** Uma versão publicada e ativa, do jeito que a escolha precisa vê-la. */
export interface TriggerCandidate {
  /** Da `flow_version` — é ele que desempata no mesmo instante. */
  id: string;
  automationId: string;
  trigger: AutomationTrigger;
  publishedAt: Date;
}

export interface TriggerInput {
  /** `null` para conteúdo que não é texto: não casa com nada. */
  text: string | null;
  /** A linha de contato acabou de ser criada por esta mensagem. */
  isFirstContact: boolean;
}

/**
 * Do mais específico para o mais genérico. `none` não entra na tabela porque
 * não é uma prioridade menor — é uma versão que não deveria ter sido publicada,
 * e é descartada antes.
 */
const RANK: Record<Exclude<AutomationTrigger["kind"], "none">, number> = {
  keyword: 0,
  firstContact: 1,
  anyMessage: 2,
};

/** Uma candidata cujo gatilho já foi decidido — o que sobra depois do filtro. */
type RankedCandidate = TriggerCandidate & {
  trigger: Exclude<AutomationTrigger, { kind: "none" }>;
};

function isRanked(candidate: TriggerCandidate): candidate is RankedCandidate {
  return candidate.trigger.kind !== "none";
}

function matches(candidate: TriggerCandidate, input: TriggerInput): boolean {
  // Sem texto não há o que casar. Vale inclusive para `anyMessage`: uma foto não
  // pode acordar um fluxo que a pessoa nunca escreveu (spec 008 §3).
  if (input.text === null) return false;

  switch (candidate.trigger.kind) {
    case "keyword":
      return matchesKeyword(input.text, candidate.trigger.keywords);
    case "firstContact":
      return input.isFirstContact;
    case "anyMessage":
      return true;
    case "none":
      return false;
  }
}

/**
 * **Todas** as que casam, na ordem (prioridade, mais nova, id).
 *
 * A lista inteira, e não só a primeira, porque uma versão publicada pode não ser
 * executável — `schemaVersion` maior do que este backend lê, documento sem nó de
 * início — e nesse caso o motor tenta a próxima em vez de deixar a organização
 * inteira muda (spec 008 §4.4).
 *
 * A ordenação acontece antes do casamento, e não o contrário, porque é ela que
 * dá o critério; casar primeiro exigiria comparar as que casaram, que é a mesma
 * ordenação escrita duas vezes.
 */
export function rankTriggeredVersions(
  candidates: TriggerCandidate[],
  input: TriggerInput,
): TriggerCandidate[] {
  const ranked = candidates
    .filter(isRanked)
    .sort((a, b) => {
      const byRank = RANK[a.trigger.kind] - RANK[b.trigger.kind];
      if (byRank !== 0) return byRank;

      const byDate = b.publishedAt.getTime() - a.publishedAt.getTime();
      if (byDate !== 0) return byDate;

      // O desempate final. Existe para a escolha ser determinística até no mesmo
      // milissegundo — duas publicações no mesmo instante não podem depender da
      // ordem em que o Postgres devolveu as linhas.
      return b.id.localeCompare(a.id);
    });

  return ranked.filter((candidate) => matches(candidate, input));
}

/** A escolhida, ou `null` quando nenhuma casa — que é o caso comum, e não é erro. */
export function selectTriggeredVersion(
  candidates: TriggerCandidate[],
  input: TriggerInput,
): TriggerCandidate | null {
  return rankTriggeredVersions(candidates, input)[0] ?? null;
}
