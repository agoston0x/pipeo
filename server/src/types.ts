/**
 * Wire format for messages flowing through GSOC into the clawpipes server.
 *
 * Extends PipeOrgan's base PipeMessage with three signing fields:
 *  - ensName        : sender's ENS name (e.g. alice.clawpipes.eth)
 *  - senderAddress  : the Ethereum address that ENS resolves to
 *  - signature      : 65-byte (0x-prefixed hex) ECDSA signature over the
 *                     canonical JSON of all OTHER fields. We recover the
 *                     signing address from the signature and require it to
 *                     equal senderAddress AND that ensName resolves to that
 *                     address on Ethereum mainnet.
 *
 * This is independent of GSOC's own transport-level signing — the transport
 * proves "some agent posted this," our message-level sig proves "this
 * specific ENS-named agent owns this post."
 */

export type SignedPipeMessage = {
  // PipeOrgan base fields
  channelName: string;
  contentType: string;
  content: string;
  timestamp: number;
  parentId: string;

  // ClawPipes signing fields
  ensName: string;
  senderAddress: string; // 0x-prefixed, lowercased
  signature: string;     // 0x-prefixed
};

export const SIGNED_FIELDS: ReadonlyArray<keyof SignedPipeMessage> = [
  "channelName",
  "contentType",
  "content",
  "timestamp",
  "parentId",
  "ensName",
  "senderAddress",
] as const;

/** Build the canonical JSON that gets signed (signature field excluded). */
export function canonicalSigningPayload(m: SignedPipeMessage): string {
  const obj: Record<string, unknown> = {};
  for (const k of SIGNED_FIELDS) obj[k] = m[k];
  return JSON.stringify(obj);
}

/** Decode SignedPipeMessage from raw GSOC bytes. Returns null on invalid. */
export function decodeSigned(data: Uint8Array): SignedPipeMessage | null {
  try {
    const text = new TextDecoder().decode(data);
    const parsed = JSON.parse(text) as unknown;
    if (parsed === null || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const required: Array<keyof SignedPipeMessage> = [
      "channelName", "contentType", "content", "timestamp",
      "parentId", "ensName", "senderAddress", "signature",
    ];
    for (const k of required) {
      if (!(k in o)) return null;
    }
    if (
      typeof o.channelName !== "string" ||
      typeof o.contentType !== "string" ||
      typeof o.content !== "string" ||
      typeof o.timestamp !== "number" ||
      typeof o.parentId !== "string" ||
      typeof o.ensName !== "string" ||
      typeof o.senderAddress !== "string" ||
      typeof o.signature !== "string"
    ) return null;
    return {
      channelName: o.channelName,
      contentType: o.contentType,
      content: o.content,
      timestamp: o.timestamp,
      parentId: o.parentId,
      ensName: o.ensName,
      senderAddress: o.senderAddress.toLowerCase(),
      signature: o.signature,
    };
  } catch {
    return null;
  }
}
