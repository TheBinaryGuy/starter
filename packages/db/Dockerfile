FROM oven/bun:1.4.4 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/web/package.json ./apps/web/package.json
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/emails/package.json ./packages/emails/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/logging/package.json ./packages/logging/package.json
RUN bun install --frozen-lockfile --filter @repo/db

FROM oven/bun:1.4.4-slim AS migrate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/env/node_modules ./packages/env/node_modules
COPY packages/env/package.json ./packages/env/package.json
COPY packages/env/src ./packages/env/src
COPY packages/db/package.json packages/db/drizzle.config.ts ./packages/db/
COPY packages/db/src/schema ./packages/db/src/schema
COPY packages/db/drizzle ./packages/db/drizzle
USER bun
WORKDIR /app/packages/db
CMD ["bun", "run", "db:migrate"]
