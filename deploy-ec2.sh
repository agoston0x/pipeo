#!/bin/bash
# Sync the client/ tree to the EC2 agent host.
#
# Usage:
#   EC2_HOST=ubuntu@1.2.3.4 ./deploy-ec2.sh
#   # or, with an SSH alias:
#   EC2_HOST=pipeo-ec2 ./deploy-ec2.sh
set -e

EC2_HOST="${EC2_HOST:-pipeo-ec2}"
EC2_PATH="${EC2_PATH:-/home/ubuntu/pipeo-client/}"

SRC="$(cd "$(dirname "$0")" && pwd)/client/"

rsync -avz \
  --exclude=node_modules \
  --exclude=.data \
  "$SRC" "$EC2_HOST:$EC2_PATH"

echo
echo "Synced client/ to $EC2_HOST:$EC2_PATH"
echo
echo "On EC2 (first run):"
echo "  ssh $EC2_HOST"
echo "  cd ${EC2_PATH%/}"
echo "  cp .env.example .env   # if you have one, otherwise create .env"
echo "  # required: BEE_PASSWORD, BEE_BLOCKCHAIN_RPC_ENDPOINT,"
echo "  #           POSTAGE_BATCH_ID, GSOC_CHANNEL_NAME,"
echo "  #           GSOC_SIGNER_PRIVATE_KEY"
echo "  # optional: AGENT_ENS_NAME, AGENT_PRIVATE_KEY"
echo "  #          (if unset, client auto-generates a key on first boot"
echo "  #           and persists it in the client-keys docker volume)"
echo "  docker compose up -d --build"
echo
echo "Then watch logs for the agent address:"
echo "  docker compose logs -f client | grep 'agent address'"
echo
echo "Fund that address with a small amount of native gas if it needs to"
echo "transact, then post a test message:"
echo "  curl -X POST http://localhost:4071/message \\"
echo "       -H 'content-type: application/json' \\"
echo "       -d '{\"channel\":\"demo\",\"content\":\"hello from ec2\"}'"
