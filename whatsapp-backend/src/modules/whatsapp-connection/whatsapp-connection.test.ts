import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { silentLogger } from "../../lib/logger/logger.js";
import {
  EvolutionApiError,
  type EvolutionClient,
} from "../../lib/evolution/evolution-client.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors.js";
import { createWhatsappConnectionRepository } from "./whatsapp-connection.repository.js";
import type {
  WhatsappConnectionRecord,
  WhatsappConnectionRepository,
} from "./whatsapp-connection.repository.js";
import { WhatsappConnectionService } from "./whatsapp-connection.service.js";

// --- Test doubles ------------------------------------------------------------

function createFakeRepository(
  seed: WhatsappConnectionRecord[] = [],
): WhatsappConnectionRepository & { rows: Map<string, WhatsappConnectionRecord> } {
  const rows = new Map<string, WhatsappConnectionRecord>();
  for (const row of seed) rows.set(row.organizationId, row);

  return {
    rows,
    async findByOrganizationId(organizationId) {
      return rows.get(organizationId) ?? null;
    },
    async findByInstanceName(instanceName) {
      return (
        [...rows.values()].find((r) => r.instanceName === instanceName) ?? null
      );
    },
    async upsert(input) {
      const record: WhatsappConnectionRecord = { ...input };
      rows.set(input.organizationId, record);
      return record;
    },
    async delete(organizationId) {
      rows.delete(organizationId);
    },
  };
}

interface EvolutionCalls {
  createInstance: { instanceName: string }[];
  connect: { instanceName: string; number?: string }[];
  logout: string[];
  deleteInstance: string[];
}

/**
 * @param pairingCodeAfterAttempts on the pairing path, return a null pairingCode
 *   until this many connect calls have happened (mirrors Baileys not being ready
 *   on the first call). Defaults to 1 — a code on the first call.
 * @param createInUseAttempts make createInstance throw 403 "in use" this many
 *   times before succeeding (mirrors Evolution's async cleanup after a delete).
 */
function createFakeEvolution(
  pairingCodeAfterAttempts = 1,
  createInUseAttempts = 0,
): EvolutionClient & { calls: EvolutionCalls } {
  const calls: EvolutionCalls = {
    createInstance: [],
    connect: [],
    logout: [],
    deleteInstance: [],
  };
  let createAttempts = 0;
  return {
    calls,
    async createInstance(params) {
      createAttempts += 1;
      if (createAttempts <= createInUseAttempts) {
        throw new EvolutionApiError(
          403,
          `/instance/create/${params.instanceName}`,
          "already in use",
        );
      }
      calls.createInstance.push(params);
    },
    async connect(params) {
      calls.connect.push(params);
      // Mirror the real API: a number yields a pairing code; without it, a QR.
      const pairingReady =
        calls.connect.filter((c) => c.number).length >= pairingCodeAfterAttempts;
      return {
        base64: "data:image/png;base64,QRDATA",
        code: "2@rawcode",
        pairingCode: params.number && pairingReady ? "ABCD1234" : null,
      };
    },
    async logout(instanceName) {
      calls.logout.push(instanceName);
    },
    async deleteInstance(instanceName) {
      calls.deleteInstance.push(instanceName);
    },
  };
}

function buildService(
  seed: WhatsappConnectionRecord[] = [],
  pairingCodeAfterAttempts = 1,
  createInUseAttempts = 0,
) {
  const repository = createFakeRepository(seed);
  const evolution = createFakeEvolution(
    pairingCodeAfterAttempts,
    createInUseAttempts,
  );
  // No-op sleep so the pairing retry and logout->delete delay don't slow tests.
  const service = new WhatsappConnectionService(
    repository,
    evolution,
    silentLogger,
    async () => {},
  );
  return { repository, evolution, service };
}

function connectionRow(
  overrides: Partial<WhatsappConnectionRecord> = {},
): WhatsappConnectionRecord {
  return {
    organizationId: "org-1",
    instanceName: "acme",
    status: "connecting",
    method: "qrcode",
    qrCode: null,
    pairingCode: null,
    phoneNumber: null,
    ...overrides,
  };
}

// --- Service tests -----------------------------------------------------------

describe("WhatsappConnectionService.connect", () => {
  it("connects from scratch via QR (no number, stores qrCode)", async () => {
    const { service, evolution, repository } = buildService();

    const row = await service.connect("org-1", "acme", { method: "qrcode" });

    expect(evolution.calls.createInstance).toEqual([{ instanceName: "acme" }]);
    expect(evolution.calls.connect).toEqual([
      { instanceName: "acme", number: undefined },
    ]);
    expect(row).toMatchObject({
      instanceName: "acme",
      status: "connecting",
      method: "qrcode",
      qrCode: "data:image/png;base64,QRDATA",
      pairingCode: null,
    });
    expect(repository.rows.get("org-1")?.method).toBe("qrcode");
  });

  it("connects from scratch via pairing (passes number, stores pairingCode)", async () => {
    const { service, evolution } = buildService();

    const row = await service.connect("org-1", "acme", {
      method: "pairing",
      phoneNumber: "+55 (11) 99999-8888",
    });

    expect(evolution.calls.connect).toEqual([
      { instanceName: "acme", number: "5511999998888" },
    ]);
    expect(row).toMatchObject({
      method: "pairing",
      pairingCode: "ABCD1234",
      qrCode: null,
      phoneNumber: "5511999998888",
    });
  });

  it("retries connect until Evolution returns the pairing code (not ready on first call)", async () => {
    // First connect returns a null pairingCode; the second returns it.
    const { service, evolution } = buildService([], 2);

    const row = await service.connect("org-1", "acme", {
      method: "pairing",
      phoneNumber: "5511999998888",
    });

    expect(evolution.calls.connect.length).toBe(2);
    expect(row.pairingCode).toBe("ABCD1234");
    expect(row.method).toBe("pairing");
  });

  it("rejects pairing without a phone number, without calling Evolution", async () => {
    const { service, evolution } = buildService();

    await expect(
      service.connect("org-1", "acme", { method: "pairing" }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(evolution.calls.createInstance).toEqual([]);
    expect(evolution.calls.connect).toEqual([]);
  });

  it("recreates the instance (delete + create) when switching QR -> pairing", async () => {
    const { service, evolution, repository } = buildService([
      connectionRow({ method: "qrcode", qrCode: "data:old", status: "connecting" }),
    ]);

    const row = await service.connect("org-1", "acme", {
      method: "pairing",
      phoneNumber: "5511999998888",
    });

    // Old instance destroyed, a fresh one created under the same name.
    expect(evolution.calls.deleteInstance).toEqual(["acme"]);
    expect(evolution.calls.createInstance).toEqual([{ instanceName: "acme" }]);
    expect(evolution.calls.connect).toEqual([
      { instanceName: "acme", number: "5511999998888" },
    ]);
    expect(row).toMatchObject({
      method: "pairing",
      pairingCode: "ABCD1234",
      qrCode: null,
    });
    expect(repository.rows.get("org-1")?.qrCode).toBeNull();
  });

  it("recreates the instance when switching pairing -> QR", async () => {
    const { service, evolution } = buildService([
      connectionRow({
        method: "pairing",
        pairingCode: "OLD12345",
        phoneNumber: "5511999998888",
        status: "connecting",
      }),
    ]);

    const row = await service.connect("org-1", "acme", { method: "qrcode" });

    expect(evolution.calls.deleteInstance).toEqual(["acme"]);
    expect(evolution.calls.createInstance).toEqual([{ instanceName: "acme" }]);
    expect(row).toMatchObject({
      method: "qrcode",
      qrCode: "data:image/png;base64,QRDATA",
      pairingCode: null,
    });
  });

  it("retries create while the just-deleted instance name is still in use", async () => {
    // Reconnect where Evolution reports 403 "in use" twice before the create sticks.
    const { service, evolution } = buildService(
      [connectionRow({ status: "close" })],
      1,
      2,
    );

    const row = await service.connect("org-1", "acme", { method: "qrcode" });

    expect(evolution.calls.deleteInstance).toEqual(["acme"]);
    expect(evolution.calls.createInstance).toEqual([{ instanceName: "acme" }]);
    expect(row.status).toBe("connecting");
  });

  it("rejects connecting when already open", async () => {
    const { service } = buildService([connectionRow({ status: "open" })]);

    await expect(
      service.connect("org-1", "acme", { method: "qrcode" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("WhatsappConnectionService.disconnect", () => {
  it("logs out, deletes the instance and removes the row, in order", async () => {
    const { service, evolution, repository } = buildService([connectionRow()]);

    await service.disconnect("org-1");

    expect(evolution.calls.logout).toEqual(["acme"]);
    expect(evolution.calls.deleteInstance).toEqual(["acme"]);
    expect(repository.rows.has("org-1")).toBe(false);
  });

  it("throws NotFound when there is no connection", async () => {
    const { service } = buildService();

    await expect(service.disconnect("org-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("WhatsappConnectionService.handleEvolutionEvent", () => {
  it("marks open, clears codes and captures the number from wuid", async () => {
    const { service, repository } = buildService([
      connectionRow({ method: "qrcode", qrCode: "data:pending" }),
    ]);

    await service.handleEvolutionEvent("acme", "CONNECTION_UPDATE", {
      state: "open",
      wuid: "5511999998888@s.whatsapp.net",
    });

    expect(repository.rows.get("org-1")).toMatchObject({
      status: "open",
      qrCode: null,
      pairingCode: null,
      phoneNumber: "5511999998888",
    });
  });

  it("maps a close state", async () => {
    const { service, repository } = buildService([connectionRow()]);

    await service.handleEvolutionEvent("acme", "CONNECTION_UPDATE", {
      state: "close",
    });

    expect(repository.rows.get("org-1")?.status).toBe("close");
  });

  it("updates the qr code from a QRCODE_UPDATED event (nested data.qrcode.base64)", async () => {
    const { service, repository } = buildService([connectionRow()]);

    await service.handleEvolutionEvent("acme", "QRCODE_UPDATED", {
      qrcode: { base64: "data:image/png;base64,NEWQR" },
    });

    expect(repository.rows.get("org-1")).toMatchObject({
      status: "connecting",
      qrCode: "data:image/png;base64,NEWQR",
    });
  });

  it("throws NotFound for an unknown instance (permanent error -> DLQ)", async () => {
    const { service } = buildService([connectionRow()]);

    await expect(
      service.handleEvolutionEvent("ghost", "CONNECTION_UPDATE", {
        state: "open",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("ignores an unsubscribed event without throwing or mutating", async () => {
    const { service, repository } = buildService([connectionRow()]);

    await service.handleEvolutionEvent("acme", "MESSAGES_UPSERT", {});

    expect(repository.rows.get("org-1")).toMatchObject({ status: "connecting" });
  });
});

// --- Repository tests (real PostgreSQL) --------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("WhatsappConnectionRepository", () => {
  it("persists and finds a pairing connection by instance name", async () => {
    const repository = createWhatsappConnectionRepository(app.prisma);
    const organizationId = `org-${crypto.randomUUID()}`;
    const instanceName = `inst-${crypto.randomUUID()}`;

    try {
      await repository.upsert({
        organizationId,
        instanceName,
        status: "connecting",
        method: "pairing",
        qrCode: null,
        pairingCode: "ABCD1234",
        phoneNumber: "5511999998888",
      });

      const byInstance = await repository.findByInstanceName(instanceName);
      expect(byInstance).toMatchObject({
        organizationId,
        method: "pairing",
        pairingCode: "ABCD1234",
        qrCode: null,
      });
    } finally {
      await repository.delete(organizationId);
    }
  });

  it("stores a long qrCode data URI (confirms @db.Text)", async () => {
    const repository = createWhatsappConnectionRepository(app.prisma);
    const organizationId = `org-${crypto.randomUUID()}`;
    const instanceName = `inst-${crypto.randomUUID()}`;
    const bigQr = `data:image/png;base64,${"A".repeat(20000)}`;

    try {
      await repository.upsert({
        organizationId,
        instanceName,
        status: "connecting",
        method: "qrcode",
        qrCode: bigQr,
        pairingCode: null,
        phoneNumber: null,
      });

      const found = await repository.findByOrganizationId(organizationId);
      expect(found?.qrCode).toBe(bigQr);
    } finally {
      await repository.delete(organizationId);
    }
  });
});

// --- Route tests -------------------------------------------------------------

function uniqueEmail(): string {
  return `test-${crypto.randomUUID()}@example.com`;
}

function cookieOf(response: { headers: Record<string, unknown> }): string {
  const cookie = response.headers["set-cookie"];
  if (!cookie) throw new Error("expected a session cookie");
  return Array.isArray(cookie) ? cookie.join("; ") : String(cookie);
}

async function signUpWithOrg(): Promise<string> {
  const email = uniqueEmail();
  const signUp = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { name: "WA Tester", email, password: "senha-super-secreta" },
  });
  const cookie = cookieOf(signUp);

  await app.inject({
    method: "POST",
    url: "/api/auth/organization/create",
    headers: { cookie },
    payload: { name: "acme", slug: `acme-${crypto.randomUUID().slice(0, 8)}` },
  });

  // Sign in again so the session hook activates the single organization.
  const signIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    payload: { email, password: "senha-super-secreta" },
  });
  return cookieOf(signIn);
}

describe("whatsapp connection routes", () => {
  it("returns 401 without a session cookie", async () => {
    for (const method of ["GET", "DELETE"] as const) {
      const response = await app.inject({
        method,
        url: "/api/whatsapp/connection",
      });
      expect(response.statusCode).toBe(401);
    }

    const post = await app.inject({
      method: "POST",
      url: "/api/whatsapp/connection",
      payload: { method: "qrcode" },
    });
    expect(post.statusCode).toBe(401);
  });

  it("returns 403 when authenticated without an active organization", async () => {
    const email = uniqueEmail();
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name: "No Org", email, password: "senha-super-secreta" },
    });
    const cookie = cookieOf(signUp);

    const response = await app.inject({
      method: "GET",
      url: "/api/whatsapp/connection",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "ORGANIZATION_REQUIRED" });
  });

  it("returns 400 for an invalid method", async () => {
    const cookie = await signUpWithOrg();

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/connection",
      headers: { cookie },
      payload: { method: "bogus" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for pairing without a phone number", async () => {
    const cookie = await signUpWithOrg();

    const response = await app.inject({
      method: "POST",
      url: "/api/whatsapp/connection",
      headers: { cookie },
      payload: { method: "pairing" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("returns the connection (null) for an org that never connected", async () => {
    const cookie = await signUpWithOrg();

    const response = await app.inject({
      method: "GET",
      url: "/api/whatsapp/connection",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toBeNull();
  });
});
