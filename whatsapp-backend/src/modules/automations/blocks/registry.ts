import { Ajv, type ValidateFunction } from "ajv";

import type { BlockDefinition, BlockHandles } from "./block-definition.js";
import { conditionBlock } from "./condition/condition.block.js";
import { delayBlock } from "./delay/delay.block.js";
import { randomizerBlock } from "./randomizer/randomizer.block.js";
import { setVariableBlock } from "./set-variable/set-variable.block.js";
import { startBlock } from "./start/start.block.js";
import { textBlock } from "./text/text.block.js";
import { waitReplyBlock } from "./wait-reply/wait-reply.block.js";

/**
 * O mapa `type -> definição`. Registrar um bloco novo aqui é a segunda metade
 * de adicioná-lo — a primeira é o arquivo da definição, e não há terceira: nem
 * migração, nem coluna, nem `if` em lugar nenhum da service.
 */
const definitions: BlockDefinition[] = [
  startBlock,
  textBlock,
  waitReplyBlock,
  conditionBlock,
  setVariableBlock,
  delayBlock,
  randomizerBlock,
];

export const blockRegistry: Record<string, BlockDefinition> = Object.fromEntries(
  definitions.map((definition) => [definition.type, definition]),
);

export function getBlock(type: string): BlockDefinition | undefined {
  return blockRegistry[type];
}

/** O tipo do nó âncora, que a service trata como singleton do documento. */
export const START_BLOCK_TYPE = startBlock.type;

// Uma instância só, e um validador compilado por tipo no boot: compilar por
// requisição num autosave que dispara a cada segundo seria desperdício puro.
const ajv = new Ajv({ allErrors: false, strict: false });

const dataValidators = new Map<string, ValidateFunction>(
  definitions.map((definition) => [
    definition.type,
    ajv.compile(definition.dataSchema),
  ]),
);

/**
 * O `data` de um nó contra o schema do seu tipo. Vale no SALVAMENTO: é a forma,
 * não o sentido — um texto vazio passa, um `typingSeconds: "muito"` não.
 * Devolve a mensagem do problema, ou `null` quando está tudo certo.
 */
export function validateBlockData(type: string, data: unknown): string | null {
  const validate = dataValidators.get(type);
  if (!validate) return `Tipo de bloco desconhecido: ${type}`;
  if (validate(data)) return null;

  const [error] = validate.errors ?? [];
  const path = error?.instancePath ? `${error.instancePath} ` : "";
  return `Dados inválidos para o bloco ${type}: ${path}${error?.message ?? "formato inesperado"}`;
}

/**
 * Uma definição que o motor sabe rodar. O `execute` deixa de ser opcional —
 * quem passou por aqui não precisa mais checá-lo.
 */
export type ExecutableBlockDefinition = BlockDefinition &
  Required<Pick<BlockDefinition, "execute">>;

/**
 * A definição executável de um tipo, ou `null` — para o tipo desconhecido e
 * para o que existe mas ainda não roda, que do ponto de vista do motor são a
 * mesma coisa: não há o que executar.
 *
 * É a **única** fonte de "isto é executável" (spec 008 §4.10). A publicação
 * pergunta aqui e o motor pergunta aqui, então nenhuma lista precisa ser
 * mantida em dia quando um bloco ganhar o seu `execute`.
 */
export function getExecutable(type: string): ExecutableBlockDefinition | null {
  const definition = getBlock(type);
  if (!definition?.execute) return null;
  return definition as ExecutableBlockDefinition;
}

export function isExecutable(type: string): boolean {
  return getExecutable(type) !== null;
}

/**
 * Os handles que um nó expõe para os dados que ele tem agora. Espelha o
 * `resolveHandles` do frontend, e é contra isto que cada aresta é conferida.
 */
export function resolveBlockHandles(
  definition: BlockDefinition,
  data: unknown,
): BlockHandles {
  return definition.handles(data);
}
