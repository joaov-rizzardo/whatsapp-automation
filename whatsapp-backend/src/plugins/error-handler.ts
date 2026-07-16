import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { AppError } from "../shared/errors.js";

function statusCodeOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const { statusCode } = error as { statusCode?: unknown };
    return typeof statusCode === "number" ? statusCode : undefined;
  }
  return undefined;
}

function isValidationError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "validation" in error
  );
}

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ code: error.code, message: error.message });
    }

    if (isValidationError(error)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Requisição inválida",
      });
    }

    // Anything unrecognised is logged in full server-side and reported to the
    // client as a bare 500 — internals never cross the wire.
    request.log.error({ err: error }, "unhandled error");

    return reply.status(statusCodeOf(error) ?? 500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro interno do servidor",
    });
  });
}

export default fp(errorHandlerPlugin, { name: "error-handler" });
