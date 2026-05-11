import { Bee, BatchId, Identifier, PrivateKey } from "@ethersphere/bee-js";
import type { Hex } from "viem";
import type Database from "better-sqlite3";
import { decodeSigned, encodeSigned } from "./types.js";
import { signMessage } from "./sign.js";
import { hasSignature, rememberAgent, rememberMessage } from "./cache.js";
import type { EnsResolver } from "./ens.js";
import { forwardToGateway } from "./openclaw.js";

interface SubscribeConfig {
  bee: Bee;
  db: Database.Database;
  ens: EnsResolver;
  gsocSigner: PrivateKey;
  identifier: Identifier;
  postageBatchId: BatchId;
  agentEnsName: string;
  agentAddress: string;
  agentPrivateKey: Hex;
  autoReply: boolean;
  gatewayUrl: string;
}

/**
 * Subscribe to the GSOC channel and route every incoming message:
 *   1. dedup by signature (cache hit → drop)
 *   2. optionally verify sender ENS resolves to senderAddress
 *   3. cache the incoming message
 *   4. if autoReply and message is NOT ours, forward to openclaw gateway
 *   5. if gateway returns content, sign + gsocSend it back with parentId
 */
export function startSubscriber(cfg: SubscribeConfig): void {
  const channelPubAddress = cfg.gsocSigner.publicKey().address();
  console.log(`[sub] subscribing to topic owned by ${channelPubAddress}`);

  cfg.bee.gsocSubscribe(channelPubAddress, cfg.identifier, {
    onMessage: async (msg) => {
      const bytes = msg.toUint8Array();
      let decoded;
      try {
        decoded = decodeSigned(bytes);
      } catch {
        return;
      }
      if (!decoded) return;
      if (hasSignature(cfg.db, decoded.signature)) return;

      if (cfg.ens.enabled && decoded.ensName) {
        const resolved = await cfg.ens.resolveAddress(decoded.ensName);
        if (resolved && resolved.toLowerCase() !== decoded.senderAddress.toLowerCase()) {
          console.warn(`[sub] ens mismatch: ${decoded.ensName} → ${resolved} but signer ${decoded.senderAddress}`);
          return;
        }
      }

      rememberAgent(cfg.db, decoded.ensName, decoded.senderAddress);
      rememberMessage(cfg.db, {
        signature: decoded.signature,
        channelName: decoded.channelName,
        contentType: decoded.contentType,
        content: decoded.content,
        timestamp: decoded.timestamp,
        parentId: decoded.parentId,
        ensName: decoded.ensName,
        senderAddress: decoded.senderAddress,
        direction: "in",
        receivedAt: Date.now(),
      });
      console.log(`[sub] in: ${decoded.ensName} → #${decoded.channelName}: ${decoded.content.slice(0, 60)}`);

      const isSelf = decoded.senderAddress.toLowerCase() === cfg.agentAddress.toLowerCase();
      if (isSelf) return;
      if (!cfg.autoReply || !cfg.gatewayUrl) return;

      let reply;
      try {
        reply = await forwardToGateway(cfg.gatewayUrl, {
          channel: decoded.channelName,
          content: decoded.content,
          sender: decoded.ensName || decoded.senderAddress,
          parentId: decoded.signature,
        });
      } catch (e) {
        console.warn(`[sub] gateway forward failed:`, (e as Error).message);
        return;
      }
      if (!reply || !reply.content) return;

      const signed = await signMessage(
        {
          channelName: decoded.channelName,
          contentType: reply.contentType ?? "text/plain",
          content: reply.content,
          timestamp: Date.now(),
          parentId: decoded.signature,
          ensName: cfg.agentEnsName || cfg.agentAddress,
        },
        cfg.agentPrivateKey,
      );
      try {
        await cfg.bee.gsocSend(cfg.postageBatchId, cfg.gsocSigner, cfg.identifier, encodeSigned(signed));
        rememberMessage(cfg.db, {
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
        console.log(`[sub] out: replied to ${decoded.signature.slice(0, 10)}…`);
      } catch (e) {
        console.error(`[sub] gsocSend reply failed:`, (e as Error).message);
      }
    },
    onError: (error) => {
      console.error("[sub] subscription error:", error);
    },
    onClose: () => {
      console.warn("[sub] subscription closed");
    },
  });
}
