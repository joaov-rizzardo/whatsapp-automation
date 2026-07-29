import type { Logger } from "../../../lib/logger/logger.js";

/**
 * O contrato de EXECUÇÃO de um bloco (spec 008 §4.3) — o outro lado do
 * `block-definition.ts`, que já dizia como um bloco é validado.
 *
 * **Mora aqui, e não em `modules/flow-runtime/`, por causa da direção da
 * dependência.** O motor conhece o registry de blocos (ele o consulta a cada
 * passo); se o bloco também importasse o motor, os dois módulos ficariam presos
 * um ao outro e "um bloco novo é um arquivo" viraria mentira — escrever um
 * bloco passaria a exigir entender o runtime. Aqui só existem as **portas**: o
 * bloco declara o que precisa, e o motor implementa. Nada neste arquivo importa
 * fila, Prisma ou HTTP.
 */

/**
 * O que um bloco devolve. É esta união que faz "suspender" ser um `return` e
 * não um `if` dentro do motor: o dia em que existir "aguardar pagamento", o
 * motor não muda.
 */
export type StepOutcome =
  /** Continue por esta saída. `texto`, `comparação`, `randomizar`. */
  | { kind: "next"; handle: string }
  /** Suspenda por um tempo e depois continue por esta saída. `aguardar`. */
  | { kind: "sleep"; delayMs: number; handle: string }
  /** Suspenda até a pessoa responder ou o tempo estourar. `aguardar resposta`. */
  | { kind: "awaitReply"; timeoutMs: number; groupingMs: number }
  /** Encerre a execução aqui, com sucesso. */
  | { kind: "end" };

/** Por que uma espera acabou. */
export type ResumeInput =
  /** `text` já vem com as mensagens picadas juntadas (spec 008 §4.7). */
  | { kind: "reply"; text: string; messageIds: string[] }
  | { kind: "timeout" };

/**
 * As variáveis, do ponto de vista do bloco: por **id**, sempre string.
 * Quem resolve nome -> valor, sistema e fuso é a implementação do motor.
 */
export interface VariableStore {
  /** Nunca falha: uma variável que não existe lê como string vazia. */
  get(variableId: string): string;
  set(variableId: string, value: string): void;
  /** Troca cada `{{nome}}` pelo valor. A outra metade de `interpolation.ts`. */
  render(text: string): string;
}

export interface SendTextOptions {
  /** Segundos de "digitando…" antes de a mensagem sair. */
  typingSeconds?: number;
}

/**
 * A porta de saída. A implementação grava a `execution_message` e respeita o
 * "digitando…" — o bloco só diz o que dizer.
 */
export interface MessageSender {
  text(text: string, options?: SendTextOptions): Promise<void>;
}

export interface RuntimeContext {
  readonly variables: VariableStore;
  readonly send: MessageSender;
  readonly contact: { number: string; name: string | null };
  readonly logger: Logger;
  /** Injetado para que um teste de bloco possa congelar o relógio. */
  now(): Date;
}
