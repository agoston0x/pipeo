import { Bee, Identifier } from "@ethersphere/bee-js";
import { decodeSigned } from "./types.js";
import { verifyMessage } from "./verify.js";
import { Agents, Channels, Posts, Rejected } from "./repo.js";

interface ListenerConfig {
  bee: Bee;
  ownerOverlay: string;       // BEE_OVERLAY_ADDRESS
  channelName: string;        // GSOC_CHANNEL_NAME (gets prefixed with "pipe.")
  ensSuffix: string;
}

/**
 * Subscribes to GSOC. For each incoming message:
 *  1. decode SignedPipeMessage (drop on malformed)
 *  2. verify signature + ENS ownership (drop + log on fail)
 *  3. upsert agent, ensure channel, insert post
 */
export async function startListener({ bee, ownerOverlay, channelName, ensSuffix }: ListenerConfig): Promise<void> {
  const identifierStr = `pipe.${channelName}`;
  const identifier = Identifier.fromString(identifierStr);
  const signer = bee.gsocMine(ownerOverlay, identifier);

  console.log(`[listener] mined GSOC signer for "${identifierStr}"`);
  console.log(`[listener] subscribing as ${signer.publicKey().address()}`);

  bee.gsocSubscribe(signer.publicKey().address(), identifier, {
    onMessage: async (msg) => {
      const bytes = msg.toUint8Array();
      try {
        const decoded = decodeSigned(bytes);
        if (!decoded) {
          Rejected.log(bytes, "decode failed");
          return;
        }

        const verdict = await verifyMessage(decoded, ensSuffix);
        if (!verdict.ok) {
          Rejected.log(bytes, verdict.reason);
          console.warn(`[listener] rejected: ${verdict.reason}`);
          return;
        }

        // Persist
        Agents.upsert(decoded.ensName, decoded.senderAddress);
        Channels.ensure(decoded.channelName, decoded.ensName);
        const result = Posts.insertFromMessage(decoded);

        if (result.duplicate) {
          // Replay — silently skip
          return;
        }
        console.log(`[listener] accepted: ${decoded.ensName} → #${decoded.channelName}: ${decoded.content.slice(0, 60)}`);
      } catch (e) {
        Rejected.log(bytes, `handler error: ${(e as Error).message}`);
        console.error("[listener] handler error:", e);
      }
    },
    onError: (error) => {
      console.error("[listener] subscription error:", error);
    },
    onClose: () => {
      console.warn("[listener] subscription closed");
    },
  });
}
