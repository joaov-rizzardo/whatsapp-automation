# whatsapp-backend

Node.js + TypeScript + Fastify backend for the WhatsApp automation project. Data layer is Prisma + PostgreSQL. Development is test-driven.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the **HTTP server** with `tsx watch` (hot reload) |
| `npm run dev:worker` | Runs the **queue worker** with `tsx watch` (the evolution-events consumer) |
| `npm run build` | Type-checks and emits to `dist/` |
| `npm start` | Runs the compiled HTTP server |
| `npm run start:worker` | Runs the compiled worker |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Test suite (see Testing) |

Server reads `PORT` (default 3333) and `HOST` (default `0.0.0.0`) from the environment.

**The backend is two processes** (since spec 003): the HTTP server (`server.ts`) and a dedicated worker (`worker.ts`) that consumes Evolution events from RabbitMQ. Both share the same codebase, infra plugins and services — they only differ in entrypoint. For any feature that consumes the queue, run both (`npm run dev` **and** `npm run dev:worker`).

## Architecture

A modular monolith. Feature modules are self-contained and split into three layers; new features are added as new folders, never by growing shared files.

```
src/
  server.ts              # HTTP entrypoint: env, listen, signals. Nothing else.
  worker.ts              # queue entrypoint: same plugins, ready() not listen()
  app.ts                 # buildApp(): assembles HTTP plugins + modules, no listen()
  config/
    env.ts               # parses and validates process.env, exported as a typed object
  lib/                   # framework-agnostic infra clients + providers
    logger/logger.ts     # the Logger provider injected into services (see Logging)
    evolution/           # thin HTTP client for the Evolution API
  plugins/               # cross-cutting concerns, each wrapped in fastify-plugin
    prisma.ts            # decorates app.prisma, closes client on shutdown
    evolution.ts         # decorates app.evolution (HTTP client; stateless)
    rabbitmq.ts          # decorates app.amqp (managed connection; worker only)
    error-handler.ts     # maps domain errors -> HTTP responses
  modules/
    <feature>/
      <feature>.routes.ts       # HTTP input adapter: route schema + thin handler
      <feature>.service.ts      # business rules. Framework-agnostic.
      <feature>.repository.ts   # the ONLY place that touches Prisma
      <feature>.schema.ts       # request/response schemas and inferred types
      <feature>.test.ts         # tests live next to the code
    evolution-events/           # QUEUE input adapter: the consumer counterpart of routes.ts
      evolution-events.consumer.ts   # parses, normalizes, routes to a service, ack/nack/DLQ
      evolution-events.topology.ts   # exchange/queue/routing keys/DLX in one place
  shared/
    errors.ts            # domain error classes
```

**Two entrypoints, one codebase.** `server.ts` opens the HTTP socket; `worker.ts` builds a Fastify instance only to reuse the plugin system, logger and graceful shutdown, registers `prisma`+`evolution`+`rabbitmq`+the consumer, and calls `app.ready()` — **never `listen()`**. `listen()` stays exclusive to `server.ts`. A service is the unit both processes share: the same `WhatsappConnectionService` is driven by HTTP routes (user actions) and by the queue consumer (`handleEvolutionEvent`), which is exactly what its framework-independence buys.

### The dependency rule

`routes → service → repository → Prisma`. Dependencies point one direction only.

- **Routes** parse and validate input, call one service method, shape the response. No business logic, no Prisma.
- **Services** hold the business rules. They must not import `fastify` or touch `request`/`reply` — this is what keeps them unit-testable and reusable from a queue worker or a CLI later.
- **Repositories** own all Prisma queries and return domain shapes, not raw Prisma types where it can be helped. Swapping the ORM should touch only this layer.

If a handler needs logic, it belongs in the service. If a service needs a query, it belongs in the repository.

### Why an app factory

`buildApp()` returns a configured instance without calling `listen()`. Tests build a real app and drive it with `app.inject()` — no port, no network, full realism. `server.ts` is the only file that opens a socket. Never call `listen()` anywhere else.

### Fastify plugin rules

Encapsulation is the core Fastify concept: anything registered inside a plugin is invisible to its parent. That is a feature — use it to scope auth or hooks to a subtree of routes.

- Wrap a plugin in `fastify-plugin` (`fp`) **only** when you want its decorators to escape into the parent scope (the Prisma client, for instance). Registering without `fp` keeps it encapsulated. Choosing wrong here is the most common source of "why is `app.x` undefined?".
- Share dependencies with `app.decorate('prisma', client)` plus a `declare module 'fastify'` block so it is typed. Do not import a Prisma singleton directly in modules — take it from the instance, so tests can pass a different client.
- Register plugins in `app.ts` in dependency order: config → prisma → error handler → modules.

### Validation is the type source

Declare a JSON Schema on every route (`body`, `querystring`, `params`, `response`). Fastify then validates input at runtime and serializes responses fast (response schemas also strip fields you did not intend to leak).

Use a type provider (TypeBox or `json-schema-to-ts`) so the schema **is** the TypeScript type — one declaration, checked at compile time and at runtime. Never hand-write an interface that duplicates a schema; they drift.

```ts
const app = Fastify().withTypeProvider<TypeBoxTypeProvider>()
// request.body is now inferred from schema.body
```

### Errors

Throw typed domain errors from services (`NotFoundError`, `ConflictError`, `ValidationError` in `shared/errors.ts`). A single `setErrorHandler` in `plugins/error-handler.ts` maps them to status codes. Handlers do not write try/catch around business calls, and services stay free of HTTP concepts.

Never leak internals: log the full error server-side, return a safe message and a stable machine-readable `code` to the client.

### Configuration

Parse and validate the whole environment once, at boot, in `config/env.ts`, and export a typed frozen object. Crash immediately on a missing or malformed variable — a boot failure is far cheaper than a `undefined` surfacing under load. `process.env` should not be read anywhere else.

## Testing (TDD)

**Red → green → refactor.** Write the failing test first, make it pass with the simplest thing, then clean up with the test as a safety net. Do not write production code without a failing test asking for it.

Test through the public surface, not the internals — a test that knows about private methods breaks on every refactor and verifies nothing a user cares about. Prefer few, meaningful test doubles.

Three levels, in decreasing quantity:

- **Service tests** (most): pure, in-memory, fast. Inject a fake repository (a plain object matching the interface) — this is where business rules get covered thoroughly.
- **Repository tests**: run against a **real PostgreSQL** instance, never a mocked Prisma client. Mocking the ORM tests your mock, not your query. Isolate tests by wrapping each in a transaction that rolls back, or by truncating tables between tests.
- **Route tests** (fewest): `buildApp()` + `app.inject()` covering the happy path and validation/error mapping per endpoint.

Assert on behavior and output, not on which functions were called.

## Prisma

> **Prisma 7 differs significantly from older versions.** Do not write Prisma code from memory — check the current docs (context7 or `node_modules/prisma`) before touching schema or client setup.

Known deviations from pre-7 patterns:

- The generator is `prisma-client`, **not** `prisma-client-js`, and `output` is now required. It is `../src/generated/prisma` here: `tsconfig` sets `rootDir: "./src"`, so a client generated outside `src/` breaks `tsc` with "not under rootDir".
- The client is imported from the generated output path, not from `@prisma/client`.
- CLI configuration lives in `prisma.config.ts` (schema path, migrations path, `datasource.url` from env) instead of the datasource block reading `env()` directly. Prisma 7 does not load `.env` by itself — `prisma.config.ts` imports `dotenv/config`.
- **A driver adapter is mandatory, and `datasourceUrl` no longer exists.** `prisma.config.ts` only feeds the CLI; the runtime connection is built in `plugins/prisma.ts` with `new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })` (`@prisma/adapter-pg`). Constructing the client with no options throws at boot.

Working rules:

- One `PrismaClient` per process, created in `plugins/prisma.ts`, closed via `onClose`. Never instantiate per request.
- Schema changes always go through `prisma migrate dev`. Migrations are committed and never edited after being applied.
- Always `select` the fields you need instead of returning whole rows.
- Watch for N+1: use `include`/nested reads rather than looping queries.
- Multi-step writes that must be atomic go in `prisma.$transaction`.

## Conventions

- ESM (`"type": "module"`) with `moduleResolution: NodeNext` — **relative imports need the `.js` extension** even though the source is `.ts`.
- `strict` TypeScript. No `any`; use `unknown` and narrow. No non-null `!` to silence the compiler — handle the null case.
- `async`/`await` throughout; no floating promises.
- Filenames kebab-case, matching their module role (`send-message.service.ts`).
- Use the Fastify logger (`app.log` / `request.log`) in plugins and routes, never `console.log`. Logs are structured JSON — pass objects, and never log tokens, phone numbers, or message contents.
- **Services and the consumer take a `Logger` (the provider in `lib/logger/logger.ts`), not `app.log`.** They are framework-agnostic and must not import fastify, so they can't reach for `app.log` directly. The provider is a structural subset of pino, so the composition roots pass a scoped child — `app.log.child({ module: "..." })` — into the constructor, and `silentLogger` stands in for tests. This is how business code logs without breaking the layering rule.

## Current state

Authentication is implemented and is the first real vertical slice:

- `config/env.ts` (Zod, crashes at boot on a bad env), `plugins/` (`prisma`, `auth`, `require-auth`, `require-organization`, `error-handler`), `shared/errors.ts`, `lib/auth.ts`.
- Better Auth serves `/api/auth/*`; `modules/me/` is a protected `GET /api/me` and the reference for the route shape.
- Prisma 7 + PostgreSQL with the `add_auth` and `add_organizations` migrations; Vitest against the real database (`npm test`).
- Organizations via the Better Auth `organization` plugin, and `requireOrganization` — the gate every per-organization feature route uses. `plugins/require-organization.test.ts` and `modules/whatsapp-connection` both exercise it.

WhatsApp connection is the first real feature vertical slice (spec 003):

- `modules/whatsapp-connection/` (routes → service → repository, TDD) — `GET`/`POST`/`DELETE /api/whatsapp/connection`, plus `handleEvolutionEvent` on the service, driven by the queue.
- `modules/evolution-events/` — the RabbitMQ **consumer**, the precedent for a queue input adapter (thin: parse, normalize the event name, call the service, ack/nack/DLQ; no business logic).
- `plugins/evolution.ts` (HTTP client) and `plugins/rabbitmq.ts` (managed AMQP connection, worker only); `worker.ts`, the second entrypoint; `lib/logger/` (the Logger provider) and `lib/evolution/`.
- Migration `add_whatsapp_connection` (our own `whatsapp_connection` table — no FK to Better Auth's tables).

`npm run dev` needs PostgreSQL up, and the WhatsApp feature also needs Evolution + RabbitMQ (`docker compose up -d` at the repo root) and a `.env` — copy `.env.example`. The generated Prisma client is gitignored, so a fresh clone runs `prisma generate` (wired to `postinstall`).

`json-schema-to-ts` is installed and used by `whatsapp-connection.schema.ts` (`FromSchema`) — the first route with a typed body. Other routes may still declare plain JSON Schema.

Modules beyond `me/`, `whatsapp-connection/` and `evolution-events/` are still the **target**, not what exists.

## Better Auth and the layering rule

Better Auth does **not** follow `routes → service → repository`, and that is intentional. It is a library that brings its own routes, its own tables, and its own database access. It lives in `plugins/auth.ts` because it is a cross-cutting concern like Prisma — not in `modules/`.

- **Do not wrap it in an `auth.service.ts` / `auth.repository.ts`.** A pass-through wrapper adds nothing and drifts from the library. Better Auth *is* the auth layer. The same holds for its plugins: the `organization` plugin's routes are served at `/api/auth/organization/*` by the existing catch-all — do not add an `organizations.routes.ts` that forwards to them.
- **The `user`, `session`, `account`, `verification`, `organization`, `member` and `invitation` tables belong to Better Auth.** They are generated by its CLI (`npx auth@<version> generate --adapter prisma`) — never hand-edited. No feature module writes to them; reading (`user.name` for display) from a feature's own repository is fine.
- A future feature needing per-user data gets its own table with an FK to `user.id`, rather than a new column on a Better Auth table.
- `/api/auth/*` is also the one exception to the per-route JSON Schema rule, because Better Auth validates its own payloads. Everything else follows the rule.

Two traps worth knowing before touching `plugins/auth.ts`: the auth route keeps the **raw body** via a scoped `addContentTypeParser` (Fastify would otherwise parse it, forcing a re-stringify and breaking bodyless POSTs like sign-out), and `set-cookie` is forwarded via `getSetCookie()` because `Headers.forEach()` folds repeated cookies into one broken value.

The CLI ships as the `auth` package (version-matched to `better-auth`), not `@better-auth/cli`, which lags well behind. It expects a module exporting an `auth` instance, which this project does not have — `createAuth(prisma)` takes the client from the plugin. Point it at a throwaway config with `--config` and delete the file afterwards.

## The organization rule — `organizationId` never comes from the client

Every feature route that handles per-organization data (WhatsApp connections, conversations, messages) reads the organization from **`request.organizationId`**, filled by `preHandler: app.requireOrganization` from the session. **Never** from `body.organizationId`, `params`, `query` or a header.

If the id came from the payload, any authenticated user would read and write another organization's data by editing one JSON field. The session is the only place the user does not control.

**Corollary for repositories: every feature query filters by `organizationId`.** A `findMany` without that filter is a security bug, not a missing feature.

`requireOrganization` is an **array** of preHandlers (`requireAuth` first), so it guarantees authentication *and* an active organization in one line. It answers **403 `ORGANIZATION_REQUIRED`**, distinct from 401: the user is authenticated and only needs to pick an organization, and the frontend routes the two differently.

The active organization lives in `session.activeOrganizationId`, chosen at session creation by the `databaseHooks.session.create.before` hook in `lib/auth.ts` — exactly one organization is auto-activated, zero or several leave it null. That hook is the single place the 0/1/N rule lives.

⚠️ `session.cookieCache` is off, so `getSession` always reads a fresh `activeOrganizationId`. Turning it on makes the active organization travel signed inside the cookie and go stale for up to `maxAge` after a `set-active` — the user switches organization and keeps seeing the previous one.

### The rule extends to the queue consumer: `instanceName` is never chosen by the payload

The `whatsapp_connection.instanceName` is the organization's `slug`, frozen on the row at creation. The routes read `request.organizationId` (the session) and look up the slug in our database — never from the body. The **consumer** faces hostile input (the broker payload carries an `instance` field anyone could forge), so it only ever *finds* the row by `findByInstanceName` — it never *chooses* an organization from the payload. An unknown instance is a permanent error → dead-lettered, not requeued.

**`method` and `phoneNumber` MAY come from the POST body** — they are legitimate user input (which connection method, which number to pair), validated by the route schema and re-checked in the service. This does **not** weaken the rule: the rule is specifically about `organizationId`/`instanceName`, the fields that decide *whose* data you touch. A number to pair is not one of those.
