import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import fp from "fastify-plugin";

import type { Auth } from "../lib/auth.js";
import { UnauthorizedError } from "../shared/errors.js";

type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

export type SessionUser = AuthSession["user"];

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: preHandlerAsyncHookHandler;
  }

  interface FastifyRequest {
    user: SessionUser | null;
  }
}

async function requireAuthPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest("user", null);

  const requireAuth: preHandlerAsyncHookHandler = async (request) => {
    const session = await app.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedError();
    }

    request.user = session.user;
  };

  app.decorate("requireAuth", requireAuth);
}

export default fp(requireAuthPlugin, {
  name: "require-auth",
  dependencies: ["auth"],
});
