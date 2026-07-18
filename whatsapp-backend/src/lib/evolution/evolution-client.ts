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
  };
}
