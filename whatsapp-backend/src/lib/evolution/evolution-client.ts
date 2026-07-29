import type { Logger } from "../logger/logger.js";

/**
 * Result of `GET /instance/connect/{instance}`. Exactly one of `base64`
 * (QR image) or `pairingCode` is meaningful, decided by whether `number` was
 * passed — see `connect`.
 */
export interface EvolutionConnectResult {
  base64: string | null; // QR ready for <img src> — present when NO number is passed
  code: string | null; // raw QR contents
  pairingCode: string | null; // 8-char code — present when a number is passed
}

export interface EvolutionClient {
  createInstance(params: { instanceName: string }): Promise<void>;
  /**
   * `number` optional: present => pairing code; absent => QR Code. This is the
   * single parameter that tells the two connection methods apart.
   */
  connect(params: {
    instanceName: string;
    number?: string;
  }): Promise<EvolutionConnectResult>;
  logout(instanceName: string): Promise<void>;
  deleteInstance(instanceName: string): Promise<void>;
  /**
   * Envia um texto. O primeiro método que **produz** algo no WhatsApp em vez de
   * administrar a instância — é a ponta de saída do motor de fluxos (spec 008).
   */
  sendText(params: SendTextParams): Promise<SendTextResult>;
}

export interface SendTextParams {
  instanceName: string;
  /** Destino com DDI, sem o sufixo de JID. */
  number: string;
  text: string;
  /** Milissegundos de "digitando…" antes de a mensagem sair. */
  delayMs?: number;
}

export interface SendTextResult {
  /**
   * O `key.id` da mensagem enviada — **quando ele vier**. O corpo da resposta do
   * `sendText` não é documentado (`docs/evolution/04-mensagens.md`), então ler
   * um campo obrigatório aqui seria transformar uma suposição em exceção no
   * meio de uma conversa. Sem ele, a mensagem é gravada sem correlação externa.
   */
  externalId: string | null;
}

export interface EvolutionClientOptions {
  baseUrl: string;
  apiKey: string;
  logger: Logger;
}

/** Thrown when the Evolution API answers with a non-2xx status. */
export class EvolutionApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`Evolution API ${path} responded ${status}`);
    this.name = "EvolutionApiError";
  }
}

/**
 * Reads `key.id` out of an undocumented response body, defensively — the shape
 * of what `sendText` answers is `[não verificado]` in the docs, and the only
 * thing worse than not having the id is throwing a TypeError while the customer
 * waits. Anything unexpected reads as "no id", which the caller supports.
 */
function readMessageId(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;

  const key = (response as { key?: unknown }).key;
  if (typeof key !== "object" || key === null) return null;

  const id = (key as { id?: unknown }).id;
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Thin, stateless HTTP client for the Evolution API. Framework-agnostic (never
 * imports fastify) and analogous to the Prisma client — it is decorated onto the
 * app in `plugins/evolution.ts` and injected into the service.
 *
 * Never logs the phone number or the api key: the api key is the root
 * credential of the whole Evolution server, and phone numbers are PII.
 */
export function createEvolutionClient(
  options: EvolutionClientOptions,
): EvolutionClient {
  const { baseUrl, apiKey, logger } = options;
  const base = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${base}${path}`;
    logger.debug({ method, path }, "evolution api request");

    const response = await fetch(url, {
      method,
      headers: {
        apikey: apiKey,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();

    if (!response.ok) {
      // Log the status and path, never the request body (it may carry a phone
      // number) nor the api key.
      logger.error(
        { method, path, status: response.status },
        "evolution api request failed",
      );
      throw new EvolutionApiError(response.status, path, text);
    }

    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    async createInstance({ instanceName }) {
      logger.info({ instanceName }, "creating evolution instance");
      await request("POST", "/instance/create", {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
      });
    },

    async connect({ instanceName, number }) {
      // Log the method, never the number itself.
      logger.info(
        { instanceName, method: number ? "pairing" : "qrcode" },
        "connecting evolution instance",
      );
      const query = number
        ? `?number=${encodeURIComponent(number)}`
        : "";
      const result = await request<{
        base64?: string | null;
        code?: string | null;
        pairingCode?: string | null;
      }>("GET", `/instance/connect/${encodeURIComponent(instanceName)}${query}`);

      return {
        base64: result.base64 ?? null,
        code: result.code ?? null,
        pairingCode: result.pairingCode ?? null,
      };
    },

    async logout(instanceName) {
      logger.info({ instanceName }, "logging out evolution instance");
      await request(
        "DELETE",
        `/instance/logout/${encodeURIComponent(instanceName)}`,
      );
    },

    async deleteInstance(instanceName) {
      logger.info({ instanceName }, "deleting evolution instance");
      await request(
        "DELETE",
        `/instance/delete/${encodeURIComponent(instanceName)}`,
      );
    },

    async sendText({ instanceName, number, text, delayMs }) {
      // Nem o número nem o texto entram no log — a conversa é inspecionável na
      // tabela execution_message, que é o que fechou a exceção de PII da 007.
      logger.debug(
        { instanceName, textLength: text.length, delayMs },
        "sending whatsapp text",
      );

      const response = await request<unknown>(
        "POST",
        `/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          number,
          text,
          // Só manda `delay` quando há o que esperar: um `delay: 0` é ruído no
          // corpo e a doc não diz como a Evolution o interpreta.
          ...(delayMs && delayMs > 0 ? { delay: delayMs } : {}),
        },
      );

      return { externalId: readMessageId(response) };
    },
  };
}
