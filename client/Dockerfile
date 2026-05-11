FROM node:20-bookworm-slim

WORKDIR /app

# better-sqlite3 native build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV PORT=4071
ENV DATA_DIR=/var/lib/pipeo-client
RUN mkdir -p /var/lib/pipeo-client

VOLUME ["/var/lib/pipeo-client"]
EXPOSE 4071

CMD ["pnpm", "start"]
