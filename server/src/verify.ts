import { recoverMessageAddress, type Hex } from "viem";
import { canonicalSigningPayload, type SignedPipeMessage } from "./types.js";
import { resolveEnsAddress } from "./ens.js";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

const SKIP_ENS = process.env.SKIP_ENS === "1" || process.env.SKIP_ENS === "true";

/** Allow up to 5 min clock skew + future-dated. Reject older than 24h. */
const MAX_FUTURE_MS = 5 * 60_000;
const MAX_AGE_MS = 24 * 60 * 60_000;

/**
 * Verify message in four steps:
 *  1. Timestamp window (replay protection).
 *  2. Recover address from signature over canonical payload.
 *  3. Recovered address must equal senderAddress.
 *  4. ensName must resolve on mainnet to senderAddress.
 *
 * Returns either { ok: true } or { ok: false, reason }.
 */
export async function verifyMessage(
  msg: SignedPipeMessage,
  ensSuffix: string,
): Promise<VerifyResult> {
  // 0. timestamp sanity (replay window)
  const now = Date.now();
  if (typeof msg.timestamp !== "number" || !Number.isFinite(msg.timestamp)) {
    return { ok: false, reason: "timestamp invalid" };
  }
  if (msg.timestamp > now + MAX_FUTURE_MS) {
    return { ok: false, reason: `timestamp ${msg.timestamp} is in the future (>${MAX_FUTURE_MS}ms)` };
  }
  if (now - msg.timestamp > MAX_AGE_MS) {
    return { ok: false, reason: `timestamp older than ${MAX_AGE_MS}ms (replay window)` };
  }

  const claimed = msg.senderAddress.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(claimed)) {
    return { ok: false, reason: "senderAddress not a 20-byte hex string" };
  }
  if (ensSuffix && !msg.ensName.toLowerCase().endsWith(ensSuffix.toLowerCase())) {
    return { ok: false, reason: `ensName must end with ${ensSuffix}` };
  }
  if (!/^0x[0-9a-fA-F]+$/.test(msg.signature) || msg.signature.length !== 132) {
    return { ok: false, reason: "signature not 65-byte hex" };
  }

  // 1. Recover address from signature
  let recovered: string;
  try {
    recovered = (
      await recoverMessageAddress({
        message: canonicalSigningPayload(msg),
        signature: msg.signature as Hex,
      })
    ).toLowerCase();
  } catch (e) {
    return { ok: false, reason: `signature recovery failed: ${(e as Error).message}` };
  }
  if (recovered !== claimed) {
    return { ok: false, reason: `signature recovers ${recovered} but claims ${claimed}` };
  }

  // 2. ENS name must resolve to the same address (skipped in demo mode)
  if (!SKIP_ENS) {
    let resolved: string | null;
    try {
      resolved = await resolveEnsAddress(msg.ensName);
    } catch (e) {
      return { ok: false, reason: `ENS resolution error: ${(e as Error).message}` };
    }
    if (!resolved) {
      return { ok: false, reason: `ENS name ${msg.ensName} did not resolve` };
    }
    if (resolved.toLowerCase() !== claimed) {
      return { ok: false, reason: `ENS resolves to ${resolved} but message claims ${claimed}` };
    }
  }

  return { ok: true };
}
