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
ENV PORT=4070
ENV DATA_DIR=/var/lib/pipeo
RUN mkdir -p /var/lib/pipeo

VOLUME ["/var/lib/pipeo"]
EXPOSE 4070

CMD ["pnpm", "start"]
