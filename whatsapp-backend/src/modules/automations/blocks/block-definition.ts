import type { JSONSchema } from "json-schema-to-ts";

import type { ResumeInput, RuntimeContext, StepOutcome } from "./block-runtime.js";
import type { FlowVariableDocument } from "../flow.schema.js";
import type { ValidationIssue } from "../../../shared/errors.js";
import type { VariableType } from "./variable-types.js";

/**
 * O contrato do registry de blocos do backend — o espelho do registry do
 * frontend, do lado que importa para os dados. Não é código compartilhado (a
 * regra do repositório é explícita: cada lado declara o seu, o contrato entre
 * eles é HTTP): lá a responsabilidade é *desenhar*, aqui é *validar* e — desde
 * a spec 008 — *executar*, pelo `execute`/`resume` no fim deste arquivo.
 *
 * Um bloco novo é um arquivo aqui e um lá. Nada de coluna nova, nada de
 * ALTER TABLE.
 */

/** Um problema de um nó específico, do jeito que a publicação devolve. */
export type BlockValidationIssue = ValidationIssue;

/**
 * Uma variável como as regras semânticas a enxergam: as do documento mais as do
 * sistema, que o backend é dono. `origin` é o que distingue "posso comparar" de
 * "posso gravar".
 *
 * O `type` é mais largo do que o do documento: só as de sistema podem ser de um
 * tipo especial (hora, data, mês, dia da semana), e é justamente por isso que
 * eles não aparecem no schema do documento.
 */
export type FlowValidationVariable = Omit<FlowVariableDocument, "type"> & {
  type: VariableType;
  origin: "custom" | "system";
};

/** O que uma regra pode precisar além do próprio `data`. */
export type FlowValidationContext = {
  variables: FlowValidationVariable[];
};

/** Os handles que um bloco expõe para um certo `data`, só os ids. */
export type BlockHandles = {
  inputs: string[];
  outputs: string[];
};

export type BlockDefinition<Data = unknown> = {
  type: string;

  /** JSON Schema do `data`. Vale no SALVAMENTO — é a forma, não o sentido. */
  dataSchema: JSONSchema;

  /**
   * Espelha `resolveHandles` do frontend: é o que valida o `sourceHandle` de
   * cada aresta e o que o motor vai usar para escolher a saída. Função dos
   * dados porque o randomizador tem saídas configuradas pelo usuário.
   */
  handles: (data: Data) => BlockHandles;

  /**
   * Regras semânticas. Valem só na PUBLICAÇÃO: mensagem vazia, randomizador
   * fora de 100%, variável referenciada que não existe. `null` = ok.
   */
  validate?: (data: Data, context: FlowValidationContext) => string | null;

  /**
   * Dados iniciais. Hoje só o `start` precisa (a automação nasce com ele); os
   * outros nascem no frontend e chegam prontos.
   */
  createData?: () => Data;

  /**
   * Executa o bloco (spec 008). Devolve uma **intenção** — continuar, dormir,
   * esperar resposta, encerrar — e nunca toca em fila, banco ou HTTP: quem
   * agenda, grava e envia é o motor, através das portas do `ctx`.
   *
   * **A ausência dele é o que impede a publicação** (spec 008 §4.10): "tem
   * `execute`" e "é executável" são a mesma frase, então não há uma segunda
   * lista de tipos executáveis para esquecer de atualizar.
   */
  execute?: (data: Data, ctx: RuntimeContext) => Promise<StepOutcome>;

  /**
   * Só para quem devolve `awaitReply`: o que fazer quando a espera acaba, por
   * resposta ou por tempo. Um bloco que suspende sem `resume` ficaria preso —
   * `registry.getExecutable` é onde isso é conferido.
   */
  resume?: (
    data: Data,
    ctx: RuntimeContext,
    input: ResumeInput,
  ) => Promise<StepOutcome>;
};

/**
 * Amarra o `Data` de uma definição no momento em que ela é escrita (schema,
 * handles e validate checados contra a mesma forma) e depois o apaga, para que
 * o registry possa guardar definições de formas diferentes num mapa só. Mesmo
 * movimento do `defineBlock` do frontend — e o único lugar onde o `data`
 * genérico de um nó encontra uma definição tipada é a chamada do registry, onde
 * o cast é intencional e está contido.
 */
export function defineBlock<Data>(
  definition: BlockDefinition<Data>,
): BlockDefinition {
  return definition as BlockDefinition;
}
