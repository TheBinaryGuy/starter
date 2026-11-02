## Skill loading

Before editing files for a substantial task:

- Run `bunx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` before changing files, and follow its `SKILL.md`.
- Prefer the most specific skill for the package or concern you are changing.

# Development

- Tests are required for code that handles auth, money, keys or quota: Vitest suites beside the code, against a real Postgres where it touches the database (`@repo/db/test/database`, see `packages/auth`). Elsewhere, validate with lint, format, typecheck, build and a focused manual check. Where a test would help, say where and why and ask before adding it.
- No tautological tests. Every test must fail on a defect a user or attacker would notice: boundaries, state transitions, wrong passwords, tampered or replayed tokens, stale sessions. Never assert that a mock returned what it was told to return.
- Never commit or push unless asked in the current request. Finish the work, report it, leave it in the working tree.
- Before committing, run `bun run format`, `bun run lint`, `bun run typecheck` and `bun run test`, and fix what they report.
- Commit messages follow Conventional Commits: `type(scope): summary`, imperative, lowercase, no trailing period. Scopes are the package or area (`web`, `auth`, `db`, `emails`, `env`, `logging`, `e2e`). One change per commit; the body says why.
- Be direct and critical. Name a weakness first and specifically, then the fix.
- Four spaces. Oxfmt owns formatting; Oxlint owns linting.

# Structure

- `apps/web`: TanStack Start on Nitro (Bun preset). Pages use directory routes (`login/route.tsx`, `_authenticated/app/index.tsx`), reusable UI lives in `components/`, helpers in `lib/`.
- Elysia handlers live together in `apps/web/src/lib/api.server.ts`; `routes/api/$.ts` mounts them at `/api`. Better Auth answers everything under `/api/auth` itself. The browser calls Elysia through Eden (`lib/api-client.ts`) and Better Auth through `lib/auth-client.ts`.
- Every API route that reads or writes a person's data calls `requireUser(request)` and passes the user's id to a repository function that scopes the query to it (see `packages/db/src/todos.ts`). Someone else's id answers 404, never 403. Writes are refused unless they come from `APP_ORIGIN` as JSON (`lib/origin-guard.ts`), so don't add form-encoded endpoints.
- `packages/auth` holds the Better Auth config. A plugin that adds tables or columns needs them in `packages/db/src/schema` too, then `bun run db:generate`.
- Schema changes: edit `packages/db/src/schema`, run `bun run db:generate -- --name <what>`, commit the migration. Never edit a migration that has run anywhere.
- Use `@/*` within the web app and `@repo/*` package exports between workspaces.
- UI is shadcn on Base UI with the `b1Ymqvgiu` preset (Inter, blue primary). Add components with `bunx --bun shadcn@latest add <name>` from `apps/web`; never npm or pnpm. Use theme tokens (`bg-background`, `text-muted-foreground`), not raw colours.
- Keep secrets and database access in server-only code. Use `import type` for API contracts; inside `createServerFn` handlers import server modules dynamically (`await import('@repo/auth/server')`) so they never reach the browser build.
- Logs go through evlog (`@repo/logging`). Never log a request body, token, email address or error message from a dependency; `redactEvent` keeps auth requests to an allowlist of fields.
