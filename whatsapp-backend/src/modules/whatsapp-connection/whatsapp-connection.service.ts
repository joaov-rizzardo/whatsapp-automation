import type { Logger } from "../../lib/logger/logger.js";
import {
  EvolutionApiError,
  type EvolutionClient,
  type EvolutionConnectResult,
} from "../../lib/evolution/evolution-client.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors.js";

/**
 * The first `connect` right after `createInstance` usually returns a null
 * pairingCode — the Baileys socket isn't ready yet. Retry until it appears so
 * the user gets the code on the first click, not the second.
 */
const PAIRING_MAX_ATTEMPTS = 5;
const PAIRING_RETRY_DELAY_MS = 800;

/**
 * `logout` unpairs the device by sending a message over the Baileys socket;
 * `deleteInstance` tears that socket down. Deleting immediately can race the
 * unpair and leave the phone still showing the linked device. Wait between them.
 */
const LOGOUT_TO_DELETE_DELAY_MS = 1500;

/**
 * Every connect starts from a fresh instance (delete old, create new). Evolution
 * cleans a deleted instance up asynchronously, so recreating the same name too
 * soon returns 403 "already in use" — retry the create until the old one is gone.
 */
const CREATE_MAX_ATTEMPTS = 6;
const CREATE_RETRY_DELAY_MS = 1000;

/** Default real timer; tests inject a no-op to stay instant. */
const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
import type {
  ConnectInput,
  ConnectionStatus,
} from "./whatsapp-connection.schema.js";
import type {
  WhatsappConnectionRecord,
  WhatsappConnectionRepository,
} from "./whatsapp-connection.repository.js";

/** Reduces the many Baileys states onto the three we persist. */
function mapState(state: string): ConnectionStatus {
  if (state === "open") return "open";
  if (state === "connecting") return "connecting";
  return "close";
}

/** Digits only, with DDI. Returns null when nothing usable is left. */
function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/** Safe read of a nested string from hostile broker data — no throwing. */
function readString(source: unknown, ...path: string[]): string | null {
  let current: unknown = source;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
}

/**
 * The business rules for one organization's WhatsApp connection. Framework
 * agnostic: it takes a repository, the Evolution client and a Logger in the
 * constructor, so the exact same instance is driven by the HTTP routes
 * (server.ts) and by the queue consumer (worker.ts). It never imports fastify.
 */
export class WhatsappConnectionService {
  constructor(
    private readonly repository: WhatsappConnectionRepository,
    private readonly evolution: EvolutionClient,
    private readonly logger: Logger,
    private readonly sleep: (ms: number) => Promise<void> = realSleep,
  ) {}

  /**
   * Destroys any existing instance and creates a brand-new one under the same
   * name. Called on every connect so QR and pairing always start from a clean
   * Baileys session, never a stale one. The delete is best-effort (a first-ever
   * connect has nothing to delete → 404, ignored).
   */
  private async recreateInstance(instanceName: string): Promise<void> {
    try {
      await this.evolution.deleteInstance(instanceName);
      this.logger.info({ instanceName }, "deleted previous instance before reconnect");
    } catch (err) {
      // 404 = nothing to delete; anything else, log and still try to create.
      this.logger.debug(
        { instanceName, err: (err as Error).message },
        "no previous instance to delete (or delete failed)",
      );
    }
    await this.createInstanceWithRetry(instanceName);
  }

  /** Retries create while Evolution still reports the just-deleted name in use. */
  private async createInstanceWithRetry(instanceName: string): Promise<void> {
    for (let attempt = 1; attempt <= CREATE_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.evolution.createInstance({ instanceName });
        return;
      } catch (err) {
        const stillInUse =
          err instanceof EvolutionApiError && err.status === 403;
        if (stillInUse && attempt < CREATE_MAX_ATTEMPTS) {
          this.logger.debug(
            { instanceName, attempt },
            "instance name still in use, waiting for cleanup",
          );
          await this.sleep(CREATE_RETRY_DELAY_MS);
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Calls `connect`, retrying the pairing path until Evolution returns a
   * pairingCode (see PAIRING_MAX_ATTEMPTS). QR comes back on the first call, and
   * QRCODE_UPDATED events fill any gap, so QR is not retried here.
   */
  private async connectInstance(
    instanceName: string,
    method: ConnectInput["method"],
    phoneNumber: string | null,
  ): Promise<EvolutionConnectResult> {
    const number = method === "pairing" ? (phoneNumber ?? undefined) : undefined;

    let result = await this.evolution.connect({ instanceName, number });
    if (method !== "pairing") return result;

    let attempts = 1;
    while (!result.pairingCode && attempts < PAIRING_MAX_ATTEMPTS) {
      await this.sleep(PAIRING_RETRY_DELAY_MS);
      result = await this.evolution.connect({ instanceName, number });
      attempts += 1;
    }
    if (!result.pairingCode) {
      this.logger.warn(
        { instanceName, attempts },
        "pairing code not returned by Evolution after retries",
      );
    }
    return result;
  }

  /**
   * Start (or refresh) a connection. `organizationSlug` becomes the Evolution
   * instanceName on first creation and is then frozen on the row — never
   * recomputed. The connecting/close branch is what lets the user switch between
   * QR and pairing without recreating anything.
   */
  async connect(
    organizationId: string,
    organizationSlug: string,
    input: ConnectInput,
  ): Promise<WhatsappConnectionRecord> {
    const method = input.method;
    this.logger.info({ organizationId, method }, "whatsapp connect requested");

    let phoneNumber: string | null = null;
    if (method === "pairing") {
      phoneNumber = normalizePhone(input.phoneNumber);
      if (!phoneNumber) {
        // Rejected before any call to Evolution.
        throw new ValidationError(
          "Informe um número de telefone válido para parear.",
        );
      }
    }

    const existing = await this.repository.findByOrganizationId(organizationId);

    if (existing?.status === "open") {
      throw new ConflictError("O WhatsApp já está conectado.");
    }

    const instanceName = existing?.instanceName ?? organizationSlug;

    // Always start from a fresh instance: delete the old one and create a new
    // one, whether connecting by QR or by pairing code.
    await this.recreateInstance(instanceName);

    const result = await this.connectInstance(instanceName, method, phoneNumber);

    console.log("----------------------------", result)

    // qrcode fills qrCode and zeroes pairingCode; pairing does the inverse —
    // never both at once.
    const row = await this.repository.upsert({
      organizationId,
      instanceName,
      status: "connecting",
      method,
      qrCode: method === "qrcode" ? result.base64 : null,
      pairingCode: method === "pairing" ? result.pairingCode : null,
      phoneNumber:
        method === "pairing" ? phoneNumber : (existing?.phoneNumber ?? null),
    });

    this.logger.info(
      { organizationId, instanceName, method, status: row.status },
      "whatsapp connection upserted",
    );
    return row;
  }

  async getConnection(
    organizationId: string,
  ): Promise<WhatsappConnectionRecord | null> {
    return this.repository.findByOrganizationId(organizationId);
  }

  async disconnect(organizationId: string): Promise<void> {
    const existing = await this.repository.findByOrganizationId(organizationId);
    if (!existing) {
      throw new NotFoundError("Nenhuma conexão de WhatsApp para desconectar.");
    }

    this.logger.info(
      { organizationId, instanceName: existing.instanceName },
      "whatsapp disconnect requested",
    );

    // Logout before delete (conservative path from the docs). A logout failure
    // on an already-dead session must not block the delete, so it is logged and
    // swallowed.
    try {
      await this.evolution.logout(existing.instanceName);
    } catch (err) {
      this.logger.warn(
        { err, instanceName: existing.instanceName },
        "evolution logout failed during disconnect; continuing to delete",
      );
    }
    // Give the unpair time to reach the phone before deleteInstance tears down
    // the socket — otherwise the device stays linked ("não desconectou").
    await this.sleep(LOGOUT_TO_DELETE_DELAY_MS);
    await this.evolution.deleteInstance(existing.instanceName);
    await this.repository.delete(organizationId);

    this.logger.info({ organizationId }, "whatsapp connection deleted");
  }

  /**
   * Called by the evolution-events consumer, not by HTTP. `event` arrives
   * already normalized (CONNECTION_UPDATE / QRCODE_UPDATED). `data` is hostile
   * broker input — read defensively.
   *
   * The instance is resolved to OUR row by instanceName only; the payload never
   * chooses the organization. An unknown instance is a permanent error
   * (NotFoundError → the consumer dead-letters it, no requeue loop).
   */
  async handleEvolutionEvent(
    instanceName: string,
    event: string,
    data: unknown,
  ): Promise<void> {
    const row = await this.repository.findByInstanceName(instanceName);
    if (!row) {
      throw new NotFoundError(`Instância desconhecida: ${instanceName}`);
    }

    if (event === "CONNECTION_UPDATE") {
      const state = readString(data, "state") ?? "close";
      const status = mapState(state);

      let { qrCode, pairingCode, phoneNumber } = row;
      if (status === "open") {
        // Connected: clear the pending codes and capture the connected number
        // from data.wuid ("55...@s.whatsapp.net") when present.
        qrCode = null;
        pairingCode = null;
        const wuid = readString(data, "wuid");
        if (wuid) {
          phoneNumber = wuid.split("@")[0] ?? phoneNumber;
        }
      }

      await this.repository.upsert({
        organizationId: row.organizationId,
        instanceName: row.instanceName,
        status,
        method: row.method,
        qrCode,
        pairingCode,
        phoneNumber,
      });
      // Never log the phone number.
      this.logger.info(
        { instanceName, status },
        "whatsapp connection status updated from event",
      );
      return;
    }

    if (event === "QRCODE_UPDATED") {
      // Captured shape: the rotated QR lives at data.qrcode.base64 (nested),
      // not data.base64. Pairing never comes through here.
      const base64 = readString(data, "qrcode", "base64");
      await this.repository.upsert({
        organizationId: row.organizationId,
        instanceName: row.instanceName,
        status: "connecting",
        method: row.method,
        qrCode: base64,
        pairingCode: null,
        phoneNumber: row.phoneNumber,
      });
      this.logger.info({ instanceName }, "whatsapp qr code updated from event");
      return;
    }

    // Any other event: ignore without throwing — we only subscribe to two, but
    // a stray one must not crash the consumer.
    this.logger.debug({ instanceName, event }, "ignoring unsubscribed event");
  }
}
