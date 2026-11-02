# Starter

A full-stack TypeScript monorepo to start web projects from: TanStack Start, Elysia, Better Auth, Drizzle on Postgres, shadcn/ui on Base UI, all on Bun.

## What's inside

- **Web** (`apps/web`): TanStack Start with SSR on Nitro, TanStack Router, Query and Form, Tailwind v4 and shadcn/ui (preset `b1Ymqvgiu`). Light, dark and system themes without a flash.
- **API**: Elysia mounted at `/api`, typed end to end in the browser through Eden. `/api/health`, `/api/ready` and an example `/api/me` behind sign-in.
- **Auth** (`packages/auth`): Better Auth with email and password, required email confirmation, password reset, session list and sign-out elsewhere, account deletion, and optional GitHub and Google sign-in. Rate limited in production, keyed on an address the client can't spoof.
- **Database** (`packages/db`): Drizzle ORM 1.0 on Postgres 18, with checked-in migrations.
- **Email** (`packages/emails`): React Email templates sent through SMTP, Resend, or the log. Mailpit catches everything locally.
- **Logging** (`packages/logging`): evlog wide events with a request id, redaction of secrets and personal data, and errors stripped of their messages before they reach the browser.
- **Security headers**: a per-request nonce Content Security Policy, HSTS on HTTPS, no framing.
- **Tooling**: Turborepo, Oxlint, Oxfmt, TypeScript 7, Vitest against a real Postgres, Playwright, GitHub Actions, Docker Compose.

## Start

You need [Bun](https://bun.sh) 1.4.4 or newer and Docker.

```bash
bun install
bun run setup        # writes .env with fresh secrets
bun run infra:up     # Postgres on 5434, Mailpit on 1025 / 8025
bun run db:migrate
bun run dev          # http://localhost:5173
```

Sign up, then open the confirmation email in Mailpit at http://localhost:8025.

## Commands

| Command                                | What it does                                                       |
| -------------------------------------- | ------------------------------------------------------------------ |
| `bun run dev`                          | Dev server with HMR                                                |
| `bun run build` / `bun run start`      | Production build, and serve it                                     |
| `bun run check`                        | Lint, format check and typecheck                                   |
| `bun run test`                         | Vitest in every package (database tests use `<db>_test_<package>`) |
| `bun run e2e`                          | Playwright against the dev server and Mailpit                      |
| `bun run db:generate -- --name <what>` | A migration from schema changes                                    |
| `bun run db:migrate` / `db:studio`     | Apply migrations, or browse the database                           |
| `bun run infra:up` / `infra:down`      | Start or stop Postgres and Mailpit                                 |

## Layout

```
apps/web            TanStack Start app, Elysia API (src/lib/api.server.ts), shadcn components
packages/auth       Better Auth config and its tests
packages/db         Drizzle schema, client, migrations, test database setup
packages/emails     Email templates and delivery adapters
packages/env        Validated environment variables
packages/logging    evlog setup and redaction
packages/config     Shared Oxlint and Oxfmt config
e2e                 Playwright tests
```

## Make it yours

- Set `APP_NAME` in `.env`; it names the page titles and emails.
- Replace the landing page (`apps/web/src/routes/index.tsx`) and the home page (`routes/_authenticated/app/index.tsx`).
- Add API routes to `apiApp` in `apps/web/src/lib/api.server.ts`; `requireUser(request)` gives you the signed-in user.
- Add tables in `packages/db/src/schema`, then `bun run db:generate`.
- For social sign-in, set `GITHUB_CLIENT_ID`/`SECRET` or `GOOGLE_CLIENT_ID`/`SECRET`; the buttons appear on their own. Callback URL: `<APP_ORIGIN>/api/auth/callback/<provider>`.
- To change the look, apply another shadcn preset from `apps/web`: `bunx --bun shadcn@latest apply --preset <id>`.
- The workspace scope is `@repo/*`; rename it with a find and replace if you like.

## Deploy

`compose.yaml` runs Postgres, a one-shot migration job and the web server:

```bash
APP_ORIGIN=https://example.com EMAIL_ADAPTER=resend RESEND_API_KEY=… docker compose up -d --build
```

Put it behind a reverse proxy that terminates TLS, and set `TRUSTED_PROXY_HEADER` (for example `x-forwarded-for`) so rate limits see real client addresses. Rate limits are kept in memory, so they assume one web process; switch Better Auth's `rateLimit.storage` to `database` before running more than one.
