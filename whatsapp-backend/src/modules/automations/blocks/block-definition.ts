import type { JSONSchema } from "json-schema-to-ts";

import type { FlowVariableDocument } from "../flow.schema.js";
import type { ValidationIssue } from "../../../shared/errors.js";

/**
 * O contrato do registry de blocos do backend — o espelho do registry do
 * frontend, do lado que importa para os dados. Não é código compartilhado (a
 * regra do repositório é explícita: cada lado declara o seu, o contrato entre
 * eles é HTTP): lá a responsabilidade é *desenhar*, aqui é *validar* e, quando
 * o motor existir, *executar*.
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
 */
export type FlowValidationVariable = FlowVariableDocument & {
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

  // execute?: (…) => …   ← a spec do motor entra aqui, e em nenhum outro lugar
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
