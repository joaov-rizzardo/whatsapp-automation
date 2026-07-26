import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { env } from "../config/env.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

/**
 * The methods allowlist was written when only GET and POST existed and then
 * silently fell behind the routes: the automations screen renames and
 * pauses with PATCH, the flow editor autosaves with PUT, and a method missing
 * here fails the browser's preflight — the route itself is never reached, so no
 * route test catches it.
 */
describe("CORS preflight", () => {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

  it.each(methods)("allows %s from the client origin", async (method) => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/automations",
      headers: {
        origin: env.CLIENT_ORIGIN,
        "access-control-request-method": method,
        "access-control-request-headers": "content-type",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain(method);
  });

  it("echoes the client origin and allows credentials", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/automations",
      headers: {
        origin: env.CLIENT_ORIGIN,
        "access-control-request-method": "PATCH",
      },
    });

    // Never "*": a wildcard origin is incompatible with credentials, and the
    // session cookie rides on credentials.
    expect(response.headers["access-control-allow-origin"]).toBe(env.CLIENT_ORIGIN);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
});
