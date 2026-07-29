import type { EvolutionClient } from "../../lib/evolution/evolution-client.js";
import type { Redis } from "ioredis";

import type { MessageDeduplicator, MessageGateway } from "./flow-runtime.types.js";

/**
 * Os dois adapters pequenos do motor: a saída e a memória de "já vi".
 * Ficam juntos por serem a mesma espécie de coisa — casca sobre infra externa,
 * sem regra de negócio nenhuma.
 */

/** O mínimo que a saída precisa da conexão: de qual instância a organização envia. */
export interface InstanceLookup {
  findByOrganizationId(
    organizationId: string,
  ): Promise<{ instanceName: string } | null>;
}

/**
 * Resolve a instância **na hora do envio**, e não na criação da execução: uma
 * conversa pode durar horas, e o número pode ter sido reconectado no meio. A
 * `whatsapp_connection` tem `organizationId @unique`, então não há ambiguidade.
 *
 * Não checa o `status` da conexão de propósito (spec 008 §3): a Evolution é a
 * fonte da verdade, e nossa coluna pode estar atrás dela. Número fora do ar dá
 * erro no envio, o BullMQ repete, e uma reconexão de cinco segundos não custa
 * a conversa.
 */
export function createWhatsappGateway(options: {
  evolution: EvolutionClient;
  connections: InstanceLookup;
}): MessageGateway {
  return {
    async sendText({ organizationId, number, text, delayMs }) {
      const connection = await options.connections.findByOrganizationId(organizationId);
      if (!connection) {
        // Sobe como erro: o BullMQ repete e, esgotado, o listener `failed`
        // encerra a execução. Silenciar aqui deixaria a pessoa esperando.
        throw new Error(
          `organização ${organizationId} não tem número conectado para enviar`,
        );
      }

      return options.evolution.sendText({
        instanceName: connection.instanceName,
        number,
        text,
        delayMs,
      });
    },
  };
}

/**
 * Dez minutos cobrem com folga a janela de redelivery do Rabbit — e, sem tabela
 * geral de mensagens, o Redis é o único lugar onde "já vi esta" cabe.
 */
const DEDUPE_TTL_SECONDS = 600;

export function createRedisDeduplicator(redis: Redis): MessageDeduplicator {
  return {
    async markSeen(organizationId, externalId) {
      // `NX` faz do SET inteiro o teste: quem conseguiu escrever é quem viu
      // primeiro, sem ler-depois-escrever e sem corrida entre dois consumers.
      const result = await redis.set(
        `dedupe:${organizationId}:${externalId}`,
        "1",
        "EX",
        DEDUPE_TTL_SECONDS,
        "NX",
      );
      return result === "OK";
    },
  };
}
