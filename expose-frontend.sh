#!/bin/bash
# Run on Hetzner. Appends a Caddy block for pipeo.claws.page → 127.0.0.1:3061
# and reloads Caddy. You still need a DNS A record for pipeo.claws.page → this host's IP.
set -e

HOST="${1:-pipeo.claws.page}"
PORT="${2:-3061}"

CADDYFILE="/etc/caddy/Caddyfile"
BLOCK="
${HOST} {
  import accesslog
  reverse_proxy localhost:${PORT}
}
"

if grep -q "^${HOST} {" "$CADDYFILE"; then
  echo "Block for ${HOST} already exists in Caddyfile — skipping append."
else
  echo "$BLOCK" | sudo tee -a "$CADDYFILE" > /dev/null
  echo "Appended block for ${HOST}."
fi

sudo systemctl reload caddy
echo "Caddy reloaded."
echo
echo "Next:"
echo "  1. Add DNS A record:  ${HOST}  →  $(curl -s ifconfig.me || echo 'this host IP')"
echo "  2. Wait ~30s for DNS, then visit:  https://${HOST}"
