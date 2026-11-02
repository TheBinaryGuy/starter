FROM oven/bun:1.4.4 AS build
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
RUN bun install --frozen-lockfile
COPY . .
RUN NODE_ENV=production bun run --cwd apps/web build

FROM oven/bun:1.4.4-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
COPY --from=build /app/apps/web/.output ./.output
USER bun
EXPOSE 5173
CMD ["bun", ".output/server/index.mjs"]
