FROM oven/bun:1.4.0-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --ignore-scripts

COPY tsconfig.json openapi.json ./
COPY src ./src

RUN bun run build


FROM oven/bun:1.4.0-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production --ignore-scripts \
  && rm -rf /root/.bun/install/cache

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.json ./openapi.json
COPY --from=builder /app/src/config.toml ./src/config.toml

RUN mkdir -p logs database-backups

EXPOSE 3000

CMD ["bun", "dist/index.js"]

