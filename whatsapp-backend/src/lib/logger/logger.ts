/**
 * The logging provider for the backend.
 *
 * Services and the queue consumer run in two different processes (`server.ts`
 * and `worker.ts`) and must stay framework-agnostic — they cannot reach for
 * `app.log`/`request.log` directly without importing Fastify, which would break
 * the layering rule (services never import `fastify`). So they take a `Logger`
 * in their constructor instead.
 *
 * The shape is a structural subset of pino's logger (the one Fastify uses under
 * the hood), so `app.log` — and any `app.log.child(...)` — is assignable to it
 * with no adapter. The composition roots (`*.routes.ts`, `worker.ts`) pass a
 * scoped child, e.g. `app.log.child({ module: "whatsapp-connection" })`, and the
 * business code logs structured JSON through this interface.
 *
 * Logging rules (backend CLAUDE.md): structured JSON — pass objects, and never
 * log tokens, phone numbers, or message contents.
 */
export interface LogFn {
  (obj: unknown, msg?: string, ...args: unknown[]): void;
  (msg: string, ...args: unknown[]): void;
}

export interface Logger {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  /** Returns a logger that adds `bindings` to every line — used to scope by module. */
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * A no-op logger for tests and any caller that has nothing to log to. Keeps the
 * `Logger` a required dependency (no `?`/`undefined` checks at every call site)
 * without forcing unit tests to build a real pino instance.
 */
export const silentLogger: Logger = {
  fatal: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
  child: () => silentLogger,
};
