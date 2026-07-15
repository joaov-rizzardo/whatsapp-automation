# whatsapp-backend

Node.js + TypeScript + Fastify backend for the WhatsApp automation project. Data layer is Prisma + PostgreSQL. Development is test-driven.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the server with `tsx watch` (hot reload) |
| `npm run build` | Type-checks and emits to `dist/` |
| `npm start` | Runs the compiled build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Test suite (see Testing) |

Server reads `PORT` (default 3333) and `HOST` (default `0.0.0.0`) from the environment.

## Architecture

A modular monolith. Feature modules are self-contained and split into three layers; new features are added as new folders, never by growing shared files.

```
src/
  server.ts              # entrypoint: env, listen, signals. Nothing else.
  app.ts                 # buildApp(): assembles plugins + modules, no listen()
  config/
    env.ts               # parses and validates process.env, exported as a typed object
  plugins/               # cross-cutting concerns, each wrapped in fastify-plugin
    prisma.ts            # decorates app.prisma, closes client on shutdown
    error-handler.ts     # maps domain errors -> HTTP responses
  modules/
    <feature>/
      <feature>.routes.ts       # HTTP layer: route schema + thin handler
      <feature>.service.ts      # business rules. Framework-agnostic.
      <feature>.repository.ts   # the ONLY place that touches Prisma
      <feature>.schema.ts       # request/response schemas and inferred types
      <feature>.test.ts         # tests live next to the code
  shared/
    errors.ts            # domain error classes
```

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

- The generator is `prisma-client`, **not** `prisma-client-js`, and `output` is now required: `generator client { provider = "prisma-client", output = "../generated/prisma" }`.
- The client is imported from the generated output path, not from `@prisma/client`.
- CLI configuration lives in `prisma.config.ts` (schema path, migrations path, `datasource.url` from env) instead of the datasource block reading `env()` directly.

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
- Use the Fastify logger (`app.log` / `request.log`), never `console.log`. Logs are structured JSON — pass objects, and never log tokens, phone numbers, or message contents.

## Current state

Scaffolding is minimal so far: `app.ts` (health route), `server.ts`, TypeScript config. Prisma, the test runner, the plugins, and `modules/` described above are the **target** and not wired up yet — build them in that shape as features arrive.
