#!/bin/bash
# Sync the clawpipes/ tree to Hetzner CLAWS host.
set -e

SRC="/Users/mac/Code/Prague/clawpipes/"
DEST="hetzner-claws:/home/ubuntu/clawpipes/"

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
echo "  cd /home/ubuntu/clawpipes"
echo "  docker compose up -d --build"
