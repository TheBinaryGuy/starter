# Starter

A full-stack TypeScript monorepo to start projects from: TanStack Start, Elysia, Better Auth, Drizzle on Postgres, shadcn/ui on Base UI, all on Bun.

## What's inside

- **Web** (`apps/web`): TanStack Start with SSR on Nitro, TanStack Router, Query and Form, Tailwind v4 and shadcn/ui (preset `b1Ymqvgiu`). Light, dark and system themes without a flash.
- **API**: Elysia mounted at `/api`, typed end to end in the browser through Eden. Writes must come from the app's own origin as JSON, on top of Better Auth's SameSite cookie.
- **Example app**: a todo list on `/app`, with `GET`, `POST`, `PATCH` and `DELETE` on `/api/todos`, every row scoped to its owner, a per-person limit that holds under concurrent requests, and tests for all of it. Keep it as a pattern or delete it.
- **Auth** (`packages/auth`): Better Auth with email and password, required email confirmation, password reset, session list and sign-out elsewhere, account deletion, and optional GitHub and Google sign-in. Rate limited in production, keyed on an address the client can't spoof.
- **Database** (`packages/db`): Drizzle ORM 1.0 on Postgres 18, with checked-in migrations.
- **Email** (`packages/emails`): React Email templates sent through SMTP, Resend, or the log. Mailpit catches everything locally.
- **Logging** (`packages/logging`): evlog wide events with a request id, redaction of secrets and personal data, and errors stripped of their messages before they reach the browser.
- **Security headers**: a per-request nonce Content Security Policy, HSTS on HTTPS, no framing.
- **Tooling**: Turborepo, Oxlint, Oxfmt, TypeScript 7, Vitest against a real Postgres, Playwright, GitHub Actions, Docker Compose.

## Start with an agent

Paste this into Claude Code, Codex or another coding agent, in the folder where the project should live. It asks you what to call the project.

```text
Start a new project from the TheBinaryGuy/starter template, and get it running on this machine.

Before anything else, ask me what to call the project, and wait for my answer. Use it as <project-name> below: lowercase, with hyphens instead of spaces (it becomes the repository and folder name). Use the name as I wrote it for APP_NAME.

1. Check the prerequisites: Bun 1.4.4 or newer (`bun --version`), Docker running (`docker info`), and the GitHub CLI signed in (`gh auth status`). If one is missing, stop and tell me what to install.
2. Create the repository from the template and clone it: `gh repo create <project-name> --template TheBinaryGuy/starter --private --clone`, then work inside that folder. If I can't use the template, clone https://github.com/TheBinaryGuy/starter.git into <project-name>, delete its .git folder and run `git init` instead.
3. Read AGENTS.md and README.md before changing anything, and follow AGENTS.md from then on.
4. Run `bun install`, then `bun run setup`, which writes .env with fresh secrets. Set APP_NAME in .env to the project's name as I wrote it.
5. Check whether ports 5173 (app), 5434 (Postgres), 1025 and 8025 (Mailpit) are already in use (`lsof -iTCP -sTCP:LISTEN -P`). For each one that is taken, pick a free port and update .env to match: PORT and APP_ORIGIN for the app; POSTGRES_PORT and the port inside DATABASE_URL for Postgres; MAILPIT_SMTP_PORT, SMTP_PORT and MAILPIT_WEB_PORT for Mailpit.
6. Run `bun run infra:up` and `bun run db:migrate`.
7. Run `bun run check` and `bun run test`. Both must pass; if one fails, find out why and fix it before going on.
8. Start the dev server with `bun run dev` and confirm that http://localhost:<PORT>/api/health answers {"status":"ok"}.
9. Prove sign-in works: sign up in the browser, open the confirmation email in Mailpit (http://localhost:<MAILPIT_WEB_PORT>), follow its link and check that it lands on /app signed in. Or run `bun run e2e`, which does the same.

Don't commit or push anything. When you're done, tell me the app's URL, the Mailpit URL, any ports you changed, and anything that didn't work.
```

## Start by hand

You need [Bun](https://bun.sh) 1.4.4 or newer and Docker.

Make a repository of your own from the template and clone it with the [GitHub CLI](https://cli.github.com):

```bash
gh repo create my-app --template TheBinaryGuy/starter --private --clone
cd my-app
```

Or take a copy without a GitHub repository:

```bash
git clone --depth 1 https://github.com/TheBinaryGuy/starter.git my-app
cd my-app
rm -rf .git && git init
```

Then:

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
- Add API routes to `apiApp` in `apps/web/src/lib/api.server.ts`; `requireUser(request)` gives you the signed-in user. The todo routes there show the whole pattern.
- Add tables in `packages/db/src/schema`, then `bun run db:generate`. `packages/db/src/todos.ts` is an example repository: every function takes the owner's id.
- To remove the todo example: delete `components/todo-list.tsx`, the `/todos` routes, `packages/db/src/todos*.ts`, `schema/todos.ts` and its relation, `e2e/todos.spec.ts`, then `bun run db:generate -- --name drop_todos`.
- For social sign-in, set `GITHUB_CLIENT_ID`/`SECRET` or `GOOGLE_CLIENT_ID`/`SECRET`; the buttons appear on their own. Callback URL: `<APP_ORIGIN>/api/auth/callback/<provider>`.
- To change the look, apply another shadcn preset from `apps/web`: `bunx --bun shadcn@latest apply --preset <id>`.
- The workspace scope is `@repo/*`; rename it with a find and replace if you like.

## Deploy

`compose.yaml` runs Postgres, a one-shot migration job and the web server. Put the production values in their own file, never in git:

```bash
# .env.production
POSTGRES_PASSWORD=…          # openssl rand -hex 16
BETTER_AUTH_SECRET=…         # openssl rand -hex 32
APP_NAME=My App
APP_ORIGIN=https://example.com
EMAIL_ADAPTER=resend
EMAIL_FROM="My App <hello@example.com>"
RESEND_API_KEY=…
```

```bash
docker compose --env-file .env.production up -d --build --wait
```

Put it behind a reverse proxy that terminates TLS, and set `TRUSTED_PROXY_HEADER` (for example `x-forwarded-for`) so rate limits see real client addresses. Rate limits are kept in memory, so they assume one web process; switch Better Auth's `rateLimit.storage` to `database` before running more than one.

## License

MIT. See [LICENSE](LICENSE).
