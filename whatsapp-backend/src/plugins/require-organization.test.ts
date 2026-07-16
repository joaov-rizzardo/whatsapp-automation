import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();

  // No production route uses requireOrganization yet — the plugin is the
  // subject here, so the route exists only to drive it. Registering inside a
  // plugin callback is what makes the decorator available: decorators only
  // exist once the plugins ahead of this one have finished loading.
  app.register(async (instance) => {
    instance.get(
      "/test-only/organization",
      { preHandler: instance.requireOrganization },
      async (request) => ({ organizationId: request.organizationId }),
    );
  });

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function uniqueEmail(): string {
  return `test-${crypto.randomUUID()}@example.com`;
}

/** Fastify hands back set-cookie as an array; requests want one header. */
function cookieOf(response: { headers: Record<string, unknown> }): string {
  const cookie = response.headers["set-cookie"];
  if (!cookie) throw new Error("expected a session cookie");
  return Array.isArray(cookie) ? cookie.join("; ") : String(cookie);
}

async function signUp(): Promise<{ email: string; cookie: string }> {
  const email = uniqueEmail();
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: { name: "Org Tester", email, password: "senha-super-secreta" },
  });

  expect(response.statusCode).toBe(200);
  return { email, cookie: cookieOf(response) };
}

/** Signing in again is what re-runs the session hook under test. */
async function signIn(email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email",
    payload: { email, password: "senha-super-secreta" },
  });

  expect(response.statusCode).toBe(200);
  return cookieOf(response);
}

/** Through the HTTP surface on purpose — never by writing the table directly. */
async function createOrganization(
  cookie: string,
  name: string,
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/organization/create",
    headers: { cookie },
    payload: { name, slug: `${name}-${crypto.randomUUID().slice(0, 8)}` },
  });

  expect(response.statusCode).toBe(200);
  return response.json().id as string;
}

function getGuarded(cookie?: string) {
  return app.inject({
    method: "GET",
    url: "/test-only/organization",
    ...(cookie ? { headers: { cookie } } : {}),
  });
}

describe("requireOrganization", () => {
  it("returns 401 without a session cookie", async () => {
    const response = await getGuarded();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns 403 when the user is authenticated but has no organization", async () => {
    const { cookie } = await signUp();

    const response = await getGuarded(cookie);

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "ORGANIZATION_REQUIRED" });
  });

  it("activates the only organization of the user on sign-in", async () => {
    const { email, cookie } = await signUp();
    const organizationId = await createOrganization(cookie, "acme");

    const freshCookie = await signIn(email);
    const response = await getGuarded(freshCookie);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ organizationId });
  });

  it("activates nothing on sign-in when the user has more than one organization", async () => {
    const { email, cookie } = await signUp();
    await createOrganization(cookie, "acme");
    await createOrganization(cookie, "globex");

    const freshCookie = await signIn(email);
    const response = await getGuarded(freshCookie);

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "ORGANIZATION_REQUIRED" });
  });

  it("passes with the organization chosen through set-active", async () => {
    const { email, cookie } = await signUp();
    await createOrganization(cookie, "acme");
    const chosenId = await createOrganization(cookie, "globex");

    const freshCookie = await signIn(email);
    const setActiveResponse = await app.inject({
      method: "POST",
      url: "/api/auth/organization/set-active",
      headers: { cookie: freshCookie },
      payload: { organizationId: chosenId },
    });
    expect(setActiveResponse.statusCode).toBe(200);

    const response = await getGuarded(freshCookie);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ organizationId: chosenId });
  });
});
