import type { VariableStore } from "../automations/blocks/block-runtime.js";
import { renderPlaceholders } from "../automations/blocks/interpolation.js";
import { systemVariables } from "../automations/blocks/system-variables.js";
import type { VariableType } from "../automations/blocks/variable-types.js";
import type { FlowVariableDocument } from "../automations/flow.schema.js";

/**
 * As variáveis de uma execução (spec 008 §4.8), com três origens e uma só
 * ordem de resolução:
 *
 * 1. **do documento** — iniciadas no `initialValue`, gravadas por **id**;
 * 2. **`sys:ultima_resposta`** — a única de sistema que é guardada;
 * 3. **as outras de sistema** — calculadas na leitura, nunca gravadas.
 *
 * Gravar por id (e não por nome) é o que faz renomear uma variável no editor
 * não afetar conversa em andamento: ela roda na versão congelada, onde o id
 * continua o mesmo.
 */

/** Data e hora do produto são de São Paulo, sempre. Sem fuso fixo, `{{hora}}` não quer dizer nada. */
const TIME_ZONE = "America/Sao_Paulo";

/**
 * O prefixo de toda variável de sistema, o mesmo de `blocks/system-variables.ts`
 * — e o que garante que nenhuma delas colida com um cuid do documento. É por ele
 * que `get` sabe, olhando só o id, que deve calcular em vez de procurar.
 */
const SYSTEM_PREFIX = "sys:";

/** A única variável de sistema com estado. */
export const LAST_REPLY_VARIABLE_ID = `${SYSTEM_PREFIX}ultima_resposta`;

export interface VariableStoreInput {
  /** As declaradas no documento da versão publicada. */
  variables: FlowVariableDocument[];
  /** O que já está gravado na execução: `{ "<id>": "<valor>" }`. */
  values: Record<string, string>;
  contact: { number: string; name: string | null };
  now: () => Date;
}

export interface FlowVariableStore extends VariableStore {
  /** O que vai para a coluna `variables` da execução — só o que é guardado. */
  toJSON(): Record<string, string>;
}

/**
 * As partes do relógio, no fuso do produto. `Intl` é a única forma de fazer
 * isto sem uma biblioteca de datas: `getHours()` devolveria a hora do servidor,
 * e um container em UTC erra o dia inteiro depois das 21h.
 */
function clockParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** Segunda = 1, domingo = 7 — a numeração ISO que `variable-types.ts` define. */
const ISO_WEEKDAY: Record<string, string> = {
  Mon: "1",
  Tue: "2",
  Wed: "3",
  Thu: "4",
  Fri: "5",
  Sat: "6",
  Sun: "7",
};

export function createVariableStore(input: VariableStoreInput): FlowVariableStore {
  const values = new Map(Object.entries(input.values));

  const initialValueById = new Map(
    input.variables.map((variable) => [variable.id, variable.initialValue]),
  );
  const idByName = new Map(
    input.variables.map((variable) => [variable.name, variable.id]),
  );

  const typeById = new Map<string, VariableType>([
    ...systemVariables.map(
      (variable) => [variable.id, variable.type] as const,
    ),
    ...input.variables.map((variable) => [variable.id, variable.type] as const),
  ]);

  /** É calculada na leitura? Todas as de sistema menos `ultima_resposta`. */
  function isComputed(variableId: string): boolean {
    return (
      variableId.startsWith(SYSTEM_PREFIX) && variableId !== LAST_REPLY_VARIABLE_ID
    );
  }

  function get(variableId: string): string {
    // As de sistema pelo id, e não só pelo nome no `render`: os blocos da spec
    // 009 leem `sys:hora` por id o tempo todo, e uma condição sobre uma hora
    // vazia responderia sempre a mesma coisa.
    if (isComputed(variableId)) {
      return systemValue(variableId.slice(SYSTEM_PREFIX.length)) ?? "";
    }
    // `??`, não `||`: uma variável gravada como string vazia foi zerada de
    // propósito, e voltar ao `initialValue` desfaria o que o fluxo fez.
    return values.get(variableId) ?? initialValueById.get(variableId) ?? "";
  }

  function contactName(): string {
    // Nem todo mundo tem pushName (quem nunca abriu o WhatsApp Web, por
    // exemplo). O número é feio numa saudação, mas é melhor que "Oi !".
    return input.contact.name ?? input.contact.number;
  }

  /**
   * O nome de sistema, ou `null` se não for uma. Calculadas na leitura de
   * propósito: gravar `hora` seria congelar o relógio no instante em que a
   * execução começou, e uma condição sobre ela responderia sempre a mesma coisa.
   */
  function systemValue(name: string): string | null {
    switch (name) {
      case "nome":
        return contactName();
      case "primeiro_nome":
        return contactName().split(" ")[0];
      case "numero_telefone":
        return input.contact.number;
      case "ultima_resposta":
        return get(LAST_REPLY_VARIABLE_ID);
      default:
        break;
    }

    const parts = clockParts(input.now());
    switch (name) {
      case "hora":
        // `hour12: false` devolve "24" na meia-noite em algumas engines; o
        // resto do sistema espera "00:00" (o TIME_PATTERN de variable-types).
        return `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
      case "data":
        return `${parts.year}-${parts.month}-${parts.day}`;
      case "mes":
        // Sem zero à esquerda: o formato de `month` é o inteiro, e "07" não
        // casaria com um valor "7" escolhido no editor.
        return String(Number(parts.month));
      case "dia_semana":
        return ISO_WEEKDAY[parts.weekday] ?? "";
      default:
        return null;
    }
  }

  return {
    get,

    set(variableId, value) {
      // Gravar numa calculada não é erro do usuário — a publicação já barra —,
      // é documento congelado por um validador mais velho. Ignorar em silêncio
      // é melhor que derrubar a conversa; guardar seria congelar um relógio.
      if (isComputed(variableId)) return;
      values.set(variableId, value);
    },

    typeOf(variableId) {
      // Desconhecida lê como texto, do mesmo jeito que `get` lê como vazio: uma
      // variável apagada faz a comparação ser falsa, não explodir.
      return typeById.get(variableId) ?? "text";
    },

    render(text) {
      return renderPlaceholders(text, (name) => {
        const system = systemValue(name);
        if (system !== null) return system;

        const variableId = idByName.get(name);
        // Nome desconhecido vira vazio: a publicação já garante que ele existe,
        // e um `{{fantasma}}` cru chegando ao cliente seria pior que um buraco.
        return variableId === undefined ? "" : get(variableId);
      });
    },

    toJSON() {
      return Object.fromEntries(values);
    },
  };
}
