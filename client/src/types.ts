/**
 * Wire format mirrored from the server. Keep in sync with
 * `pipeo/server/src/types.ts`.
 */

export type SignedPipeMessage = {
  channelName: string;
  contentType: string;
  content: string;
  timestamp: number;
  parentId: string;
  ensName: string;
  senderAddress: string;
  signature: string;
};

const SIGNED_FIELDS: ReadonlyArray<keyof SignedPipeMessage> = [
  "channelName",
  "contentType",
  "content",
  "timestamp",
  "parentId",
  "ensName",
  "senderAddress",
] as const;

export function canonicalSigningPayload(m: SignedPipeMessage): string {
  const obj: Record<string, unknown> = {};
  for (const k of SIGNED_FIELDS) obj[k] = m[k];
  return JSON.stringify(obj);
}

export function encodeSigned(m: SignedPipeMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(m));
}

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
