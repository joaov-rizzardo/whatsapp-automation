# whatsapp-automation

WhatsApp automation project, split into two independent applications in one Git repository:

| Folder | What it is | Read before touching it |
| --- | --- | --- |
| `whatsapp-backend/` | Fastify + TypeScript API, Prisma + PostgreSQL | `whatsapp-backend/CLAUDE.md` |
| `whatsapp-frontend/` | Next.js 16 (App Router) + React 19 web client | `whatsapp-frontend/CLAUDE.md` |

**Each folder's CLAUDE.md is authoritative for that side.** They cover architecture, folder rules, and conventions in detail — read the relevant one before writing code there, and put side-specific rules in it rather than here. This file only covers what spans both.

## Not a monorepo

There is no root `package.json`, no workspaces, no shared tooling. Each project has its own `package.json`, `node_modules/`, and `tsconfig.json`.

**Run every command from inside the project folder**, never from the root — `npm run dev` at the root does nothing. Installing a dependency for one side never installs it for the other; there is no hoisting.

The two sides share no code. If both need the same type (an API payload shape, for instance), each declares it on its own side — the backend derives it from its route schema, the frontend from its Zod schema. Don't reach across the folder boundary with a relative import; the only contract between them is HTTP.

## How the two connect

The frontend talks to the backend over HTTP and nothing else. Backend listens on `PORT` (default **3333**), frontend dev server on **3000**. Both must be running to work on any feature that crosses the boundary.

The backend never renders UI; the frontend never touches PostgreSQL. Anything that needs the database is a backend endpoint the frontend calls.

Validate at both ends: the backend validates every request with its route schema (client validation is UX, not security), and the frontend validates the same input with Zod before submitting.

## The rules genuinely differ between the two sides — don't carry habits across

The most common mistake here is applying one side's convention to the other. Concretely:

- **Tests:** the backend is strictly test-driven — no production code without a failing test first. The frontend writes **no unit tests at all**; changes there are validated by running the app. Don't add tests to the frontend, and don't skip them in the backend.
- **Imports:** the backend is ESM with `moduleResolution: NodeNext`, so relative imports need the `.js` extension (`./app.js` from `app.ts`). The frontend does not — it uses the `@/*` alias.
- **Type source:** backend types come from route JSON Schemas via a type provider; frontend types come from Zod schemas via `z.infer`. Both share one principle — never hand-write an interface that duplicates a schema.

Shared across both: `strict` TypeScript, no `any`, `async`/`await` with no floating promises.

## Both stacks are newer than your training data

Next 16 and Prisma 7 both contain breaking changes you will otherwise get wrong from memory — async request APIs, `proxy.ts` replacing `middleware.ts`, the `prisma-client` generator, Tailwind v4's CSS-first config with no `tailwind.config.js`. **Check the docs before writing** (`node_modules/next/dist/docs/`, `node_modules/prisma`, or context7). Each side's CLAUDE.md lists the specific traps.

## Current state

Early scaffolding. The backend is a `buildApp()` with a `/health` route and no Prisma, no test runner, no modules. The frontend is a fresh Next install without React Query, React Hook Form, or Zod. Nothing has been committed yet — the repository has zero commits.

The architecture in both CLAUDE.md files is the **target**, not a description of what exists. Build toward it as features arrive; don't assume a file described there is already on disk.
