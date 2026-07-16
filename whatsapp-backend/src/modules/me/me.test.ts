import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

/** Unique per run so tests never collide on the unique email constraint. */
function uniqueEmail(): string {
  return `test-${crypto.randomUUID()}@example.com`;
}

async function signUp(credentials: {
  name: string;
  email: string;
  password: string;
}) {
  return app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: credentials,
  });
}

describe("POST /api/auth/sign-up/email", () => {
  it("creates the user and returns a session cookie", async () => {
    const email = uniqueEmail();

    const response = await signUp({
      name: "Maria Silva",
      email,
      password: "senha-super-secreta",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toBeDefined();

    const user = await app.prisma.user.findUnique({ where: { email } });
    expect(user?.name).toBe("Maria Silva");
  });

  it("rejects a password shorter than 8 characters", async () => {
    const response = await signUp({
      name: "Senha Curta",
      email: uniqueEmail(),
      password: "1234567",
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe("POST /api/auth/sign-in/email", () => {
  it("does not authenticate with the wrong password", async () => {
    const email = uniqueEmail();
    await signUp({ name: "Joao Souza", email, password: "senha-correta-123" });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email, password: "senha-errada-123" },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

describe("GET /api/me", () => {
  it("returns 401 without a session cookie", async () => {
    const response = await app.inject({ method: "GET", url: "/api/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns 401 with a garbage session cookie", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: "better-auth.session_token=nao-e-um-token-valido" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns the signed-in user when given a valid session cookie", async () => {
    const email = uniqueEmail();
    const signUpResponse = await signUp({
      name: "Ana Costa",
      email,
      password: "senha-super-secreta",
    });

    const cookie = signUpResponse.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: "Ana Costa", email });
  });

  it("does not leak the password hash or other unintended fields", async () => {
    const email = uniqueEmail();
    const signUpResponse = await signUp({
      name: "Carlos Lima",
      email,
      password: "senha-super-secreta",
    });

    const cookie = signUpResponse.headers["set-cookie"];
    const response = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: Array.isArray(cookie) ? cookie.join("; ") : cookie },
    });

    expect(Object.keys(response.json()).sort()).toEqual([
      "email",
      "emailVerified",
      "id",
      "image",
      "name",
    ]);
  });
});
