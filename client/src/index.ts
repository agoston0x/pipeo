import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Bee, Identifier, PrivateKey } from "@ethersphere/bee-js";
import { encodeSigned } from "./types.js";
import { signMessage } from "./sign.js";
import { loadOrCreateAgentKey } from "./keystore.js";
import { openCache, lastSeenSignature, rememberMessage } from "./cache.js";
import { makeEnsResolver } from "./ens.js";
import { resolveBatchId } from "./stamps.js";
import { startSubscriber } from "./subscriber.js";

const PORT = Number(process.env.PORT ?? 4071);
const SWARM_URL = process.env.SWARM_URL ?? "http://localhost:1633";
const POSTAGE_BATCH_ID_ENV = process.env.POSTAGE_BATCH_ID ?? "";
const GSOC_CHANNEL_NAME = process.env.GSOC_CHANNEL_NAME ?? "pipeo-mainnet";
const GSOC_SIGNER_PRIVATE_KEY = process.env.GSOC_SIGNER_PRIVATE_KEY ?? "";
const AGENT_ENS_NAME = process.env.AGENT_ENS_NAME ?? "";
const KEY_FILE_PATH = process.env.AGENT_KEY_FILE ?? "/var/lib/pipeo-client/agent.key";
const DATA_DIR = process.env.DATA_DIR ?? "/var/lib/pipeo-client";
const ETH_RPC_URL = process.env.ETH_RPC_URL ?? "";
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "";
const AUTO_REPLY = process.env.AUTO_REPLY === "1" || process.env.AUTO_REPLY === "true";

function requireEnv(name: string, value: string): void {
  if (!value) {
    console.error(`FATAL: ${name} is not set`);
    process.exit(1);
  }
}

requireEnv("GSOC_SIGNER_PRIVATE_KEY", GSOC_SIGNER_PRIVATE_KEY);

const agentKey = loadOrCreateAgentKey({
  envKey: process.env.AGENT_PRIVATE_KEY ?? "",
  keyFilePath: KEY_FILE_PATH,
});
const AGENT_PRIVATE_KEY = agentKey.privateKey;
const AGENT_ADDRESS = agentKey.address;

const bee = new Bee(SWARM_URL);
const gsocSigner = new PrivateKey(GSOC_SIGNER_PRIVATE_KEY);
const identifier = Identifier.fromString(`pipe.${GSOC_CHANNEL_NAME}`);
const db = openCache(DATA_DIR);
const ens = makeEnsResolver(ETH_RPC_URL || undefined);

const app = new Hono();
app.use("*", cors({ origin: "*" }));

app.get("/health", (c) => c.text("ok"));
app.get("/info", (c) =>
  c.json({
    agent: AGENT_ENS_NAME || AGENT_ADDRESS,
    address: AGENT_ADDRESS,
    gsocChannel: GSOC_CHANNEL_NAME,
    swarmUrl: SWARM_URL,
    ensEnabled: ens.enabled,
    autoReply: AUTO_REPLY,
    gateway: OPENCLAW_GATEWAY_URL || null,
  }),
);

let postageBatchId: Awaited<ReturnType<typeof resolveBatchId>> | null = null;

/**
 * POST /message
 * body: { channel, content, contentType?, parentId? }
 *
 * If parentId is omitted, auto-fills with the last-seen signature for that
 * channel (so replies thread automatically when called from a tool).
 */
app.post("/message", async (c) => {
  if (!postageBatchId) {
    return c.json({ error: "no usable postage batch yet" }, 503);
  }
  let body: { channel?: string; content?: string; contentType?: string; parentId?: string };
  try { body = await c.req.json(); }
  catch { return c.json({ error: "Invalid JSON" }, 400); }

  if (!body.channel || !body.content) {
    return c.json({ error: "channel and content are required" }, 400);
  }

  const parentId = body.parentId ?? lastSeenSignature(db, body.channel) ?? "";

  const signed = await signMessage(
    {
      channelName: body.channel,
      contentType: body.contentType ?? "text/plain",
      content: body.content,
      timestamp: Date.now(),
      parentId,
      ensName: AGENT_ENS_NAME || AGENT_ADDRESS,
    },
    AGENT_PRIVATE_KEY,
  );

  try {
    const data = encodeSigned(signed);
    await bee.gsocSend(postageBatchId, gsocSigner, identifier, data);
    rememberMessage(db, {
      signature: signed.signature,
      channelName: signed.channelName,
      contentType: signed.contentType,
      content: signed.content,
      timestamp: signed.timestamp,
      parentId: signed.parentId,
      ensName: signed.ensName,
      senderAddress: signed.senderAddress,
      direction: "out",
      receivedAt: Date.now(),
    });
    return c.json({
      ok: true,
      ensName: signed.ensName,
      senderAddress: signed.senderAddress,
      signature: signed.signature,
      channel: signed.channelName,
      parentId: signed.parentId,
    });
  } catch (e) {
    console.error("[client] gsocSend failed:", e);
    return c.json({ error: "gsocSend failed", detail: (e as Error).message }, 500);
  }
});

async function start(): Promise<void> {
  while (true) {
    try {
      await bee.checkConnection();
      break;
    } catch (e) {
      console.warn(`[bee] not ready yet (${(e as Error).message}); retry 5s`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  postageBatchId = await resolveBatchId({ bee, envOverride: POSTAGE_BATCH_ID_ENV });

  startSubscriber({
    bee,
    db,
    ens,
    gsocSigner,
    identifier,
    postageBatchId,
    agentEnsName: AGENT_ENS_NAME,
    agentAddress: AGENT_ADDRESS,
    agentPrivateKey: AGENT_PRIVATE_KEY,
    autoReply: AUTO_REPLY,
    gatewayUrl: OPENCLAW_GATEWAY_URL,
  });

  serve({ fetch: app.fetch, port: PORT });
  console.log(`[client] http://0.0.0.0:${PORT}`);
  console.log(`[client] agent address: ${AGENT_ADDRESS} (key from ${agentKey.source})`);
  console.log(`[client] agent ENS: ${AGENT_ENS_NAME || "(none — using address)"}`);
  console.log(`[client] channel: ${GSOC_CHANNEL_NAME}`);
  console.log(`[client] ens resolver: ${ens.enabled ? "on" : "off"}`);
  console.log(`[client] auto-reply: ${AUTO_REPLY ? `on → ${OPENCLAW_GATEWAY_URL}` : "off"}`);
}

start().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
