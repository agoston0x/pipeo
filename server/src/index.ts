import { Bee } from "@ethersphere/bee-js";
import { serve } from "@hono/node-server";
import { buildApi } from "./api.js";
import { startListener } from "./listener.js";

const PORT = Number(process.env.PORT ?? 4070);
const SWARM_URL = process.env.SWARM_URL ?? "http://localhost:1633";
const GSOC_CHANNEL_NAME = process.env.GSOC_CHANNEL_NAME ?? "pipeo-mainnet";
const BEE_OVERLAY_OVERRIDE = process.env.BEE_OVERLAY_ADDRESS ?? "";
const ENS_SUFFIX = process.env.ENS_SUFFIX ?? "";

async function main(): Promise<void> {
  // Start API immediately so /health works for orchestrators
  const app = buildApi();
  serve({ fetch: app.fetch, port: PORT });
  console.log(`[api] listening on :${PORT}`);

  // Try to connect to bee + start listener (retry forever)
  while (true) {
    try {
      const bee = new Bee(SWARM_URL);
      await bee.checkConnection();
      console.log(`[bee] connected to ${SWARM_URL}`);

      // Auto-detect overlay if not overridden
      let overlay = BEE_OVERLAY_OVERRIDE;
      if (!overlay) {
        const addrs = await bee.getNodeAddresses();
        overlay = String(addrs.ethereum);
        console.log(`[bee] auto-detected overlay (ethereum): ${overlay}`);
      } else {
        console.log(`[bee] using overlay override: ${overlay}`);
      }

      await startListener({ bee, ownerOverlay: overlay, channelName: GSOC_CHANNEL_NAME, ensSuffix: ENS_SUFFIX });
      break;
    } catch (e) {
      console.warn(`[bee] not ready (${(e as Error).message}); retrying in 5s`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
