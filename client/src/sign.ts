import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { canonicalSigningPayload, type SignedPipeMessage } from "./types.js";

/**
 * Sign a SignedPipeMessage with the agent's private key.
 * Sets `senderAddress` from the privkey-derived account, and `signature`
 * to a 65-byte ECDSA signature over the canonical payload.
 */
export async function signMessage(
  partial: Omit<SignedPipeMessage, "senderAddress" | "signature">,
  privateKey: Hex,
): Promise<SignedPipeMessage> {
  const account = privateKeyToAccount(privateKey);
  const senderAddress = account.address.toLowerCase();
  const messageWithoutSig: SignedPipeMessage = {
    ...partial,
    senderAddress,
    signature: "",
  };
  const payload = canonicalSigningPayload(messageWithoutSig);
  const signature = await account.signMessage({ message: payload });
  return { ...messageWithoutSig, signature };
}
