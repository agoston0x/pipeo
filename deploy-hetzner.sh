#!/bin/bash
# Sync the pipeo/ tree to Hetzner CLAWS host.
set -e

SRC="$(cd "$(dirname "$0")" && pwd)/"
DEST="hetzner-claws:/home/ubuntu/pipeo/"

rsync -avz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.data \
  --exclude=PipeOrganMonorepo \
  --exclude=.git \
  --exclude=aggregator \
  "$SRC" "$DEST"

echo
echo "Synced. Next:"
echo "  ssh hetzner-claws"
echo "  cd /home/ubuntu/pipeo"
echo "  docker compose up -d --build"
