import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Bee, BatchId, Identifier, PrivateKey } from "@ethersphere/bee-js";
import type { Hex } from "viem";
import { encodeSigned } from "./types.js";
import { signMessage } from "./sign.js";

const PORT = Number(process.env.PORT ?? 4071);
const SWARM_URL = process.env.SWARM_URL ?? "http://localhost:1633";
const POSTAGE_BATCH_ID_RAW = process.env.POSTAGE_BATCH_ID ?? "";
const GSOC_CHANNEL_NAME = process.env.GSOC_CHANNEL_NAME ?? "pipeo-mainnet";
const GSOC_SIGNER_PRIVATE_KEY = process.env.GSOC_SIGNER_PRIVATE_KEY ?? "";
const AGENT_ENS_NAME = process.env.AGENT_ENS_NAME ?? "";
const AGENT_PRIVATE_KEY = (process.env.AGENT_PRIVATE_KEY ?? "") as Hex;

function requireEnv(name: string, value: string): void {
  if (!value) {
    console.error(`FATAL: ${name} is not set`);
    process.exit(1);
  }
}

requireEnv("POSTAGE_BATCH_ID", POSTAGE_BATCH_ID_RAW);
requireEnv("GSOC_SIGNER_PRIVATE_KEY", GSOC_SIGNER_PRIVATE_KEY);
requireEnv("AGENT_ENS_NAME", AGENT_ENS_NAME);
requireEnv("AGENT_PRIVATE_KEY", AGENT_PRIVATE_KEY);

const bee = new Bee(SWARM_URL);
const POSTAGE_BATCH_ID = new BatchId(POSTAGE_BATCH_ID_RAW);
const gsocSigner = new PrivateKey(GSOC_SIGNER_PRIVATE_KEY);
const identifier = Identifier.fromString(`pipe.${GSOC_CHANNEL_NAME}`);

const app = new Hono();
app.use("*", cors({ origin: "*" }));

app.get("/health", (c) => c.text("ok"));
app.get("/info", (c) =>
  c.json({
    agent: AGENT_ENS_NAME,
    gsocChannel: GSOC_CHANNEL_NAME,
    swarmUrl: SWARM_URL,
  }),
);

/**
 * POST /message
 * body: { channel: string, content: string, contentType?: string, parentId?: string }
 *
 * Signs the message with AGENT_PRIVATE_KEY, then publishes via GSOC to the
 * Hetzner aggregator. Returns the swarm reference + signature on success.
 */
app.post("/message", async (c) => {
  let body: { channel?: string; content?: string; contentType?: string; parentId?: string };
  try { body = await c.req.json(); }
  catch { return c.json({ error: "Invalid JSON" }, 400); }

  if (!body.channel || !body.content) {
    return c.json({ error: "channel and content are required" }, 400);
  }

  const signed = await signMessage(
    {
      channelName: body.channel,
      contentType: body.contentType ?? "text/plain",
      content: body.content,
      timestamp: Date.now(),
      parentId: body.parentId ?? "",
      ensName: AGENT_ENS_NAME,
    },
    AGENT_PRIVATE_KEY,
  );

  try {
    const data = encodeSigned(signed);
    await bee.gsocSend(POSTAGE_BATCH_ID, gsocSigner, identifier, data);
    return c.json({
      ok: true,
      ensName: signed.ensName,
      senderAddress: signed.senderAddress,
      signature: signed.signature,
      channel: signed.channelName,
    });
  } catch (e) {
    console.error("[client] gsocSend failed:", e);
    return c.json({ error: "gsocSend failed", detail: (e as Error).message }, 500);
  }
});

async function start(): Promise<void> {
  // Wait for bee to be reachable
  while (true) {
    try {
      await bee.checkConnection();
      break;
    } catch (e) {
      console.warn(`[bee] not ready yet (${(e as Error).message}); retry 5s`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  serve({ fetch: app.fetch, port: PORT });
  console.log(`[client] http://0.0.0.0:${PORT}`);
  console.log(`[client] agent: ${AGENT_ENS_NAME}`);
  console.log(`[client] channel: ${GSOC_CHANNEL_NAME}`);
}

start().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
