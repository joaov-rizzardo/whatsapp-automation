import cors from "@fastify/cors";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { env } from "../config/env.js";
import { createAuth, type Auth } from "../lib/auth.js";

declare module "fastify" {
  interface FastifyInstance {
    auth: Auth;
  }
}

async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorate("auth", createAuth(app.prisma));

  // Must come before the auth handler, and `origin` can never be "*" — a
  // wildcard origin is incompatible with credentials, and the session cookie
  // rides on credentials.
  await app.register(cors, {
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Encapsulated child scope: the content type parsers below are scoped to the
  // auth routes and must not leak to the rest of the API, which wants Fastify's
  // normal JSON parsing.
  await app.register(async (scope) => {
    // Better Auth wants the raw body, and Fastify would otherwise hand us a
    // parsed object we'd have to re-stringify. Keeping it raw also avoids
    // FST_ERR_CTP_EMPTY_JSON_BODY on the bodyless POSTs (sign-out).
    const passthrough = (
      _request: unknown,
      body: string,
      done: (err: Error | null, body?: string) => void,
    ): void => {
      done(null, body);
    };

    scope.addContentTypeParser(
      ["application/json", "application/x-www-form-urlencoded", "text/plain"],
      { parseAs: "string" },
      passthrough,
    );

    scope.route({
      method: ["GET", "POST"],
      url: "/api/auth/*",
      async handler(request, reply) {
        const url = new URL(request.url, env.BETTER_AUTH_URL);

        const body =
          typeof request.body === "string" && request.body.length > 0
            ? request.body
            : undefined;

        const response = await app.auth.handler(
          new Request(url.toString(), {
            method: request.method,
            headers: fromNodeHeaders(request.headers),
            ...(body !== undefined ? { body } : {}),
          }),
        );

        reply.status(response.status);

        // Headers.forEach() folds repeated set-cookie into one comma-joined
        // string, which produces a broken cookie. getSetCookie() keeps them apart.
        const setCookies = response.headers.getSetCookie();
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== "set-cookie") {
            reply.header(key, value);
          }
        });
        if (setCookies.length > 0) {
          reply.header("set-cookie", setCookies);
        }

        return reply.send(response.body ? await response.text() : null);
      },
    });
  });
}

export default fp(authPlugin, { name: "auth", dependencies: ["prisma"] });
