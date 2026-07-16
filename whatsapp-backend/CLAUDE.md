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
- Use the Fastify logger (`app.log` / `request.log`), never `console.log`. Logs are structured JSON — pass objects, and never log tokens, phone numbers, or message contents.

## Current state

Authentication is implemented and is the first real vertical slice:

- `config/env.ts` (Zod, crashes at boot on a bad env), `plugins/` (`prisma`, `auth`, `require-auth`, `require-organization`, `error-handler`), `shared/errors.ts`, `lib/auth.ts`.
- Better Auth serves `/api/auth/*`; `modules/me/` is a protected `GET /api/me` and the reference for the route shape.
- Prisma 7 + PostgreSQL with the `add_auth` and `add_organizations` migrations; Vitest against the real database (`npm test`).
- Organizations via the Better Auth `organization` plugin, and `requireOrganization` — the gate every per-organization feature route is meant to use. No production route consumes it yet; `plugins/require-organization.test.ts` is what covers it.

`npm run dev` needs PostgreSQL up (`docker compose up -d` at the repo root) and a `.env` — copy `.env.example`. The generated Prisma client is gitignored, so a fresh clone runs `prisma generate` (wired to `postinstall`).

No type provider (TypeBox / `json-schema-to-ts`) is installed yet — routes declare plain JSON Schema. Install one when the first route needs a typed body.

`modules/` beyond `me/` is still the **target**, not what exists.

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
