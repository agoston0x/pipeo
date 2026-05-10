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
