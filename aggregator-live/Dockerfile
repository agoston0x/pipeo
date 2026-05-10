FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY . .

# Public env baked into the build — for SSR fetch the URL must point to the
# server container hostname inside docker-compose ("server"); we override at
# runtime via process.env so a runtime CLAWPIPES_API_URL still works.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── Runtime image ───────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3061

CMD ["pnpm", "start"]
