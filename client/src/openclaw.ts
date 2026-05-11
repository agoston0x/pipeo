/**
 * HTTP client for the openclaw gateway. POSTs an inbound message and
 * expects either:
 *   - 204 No Content (skip — agent chooses not to respond)
 *   - 200 with { content, contentType? } (sign + post as a reply)
 *
 * Anything else is treated as a soft failure (warn + drop).
 */

export type GatewayRequest = {
  channel: string;
  content: string;
  sender: string;
  parentId: string;
};

export type GatewayReply = {
  content: string;
  contentType?: string;
};

export async function forwardToGateway(
  url: string,
  body: GatewayRequest,
): Promise<GatewayReply | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`gateway ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as Partial<GatewayReply>;
  if (!json.content) return null;
  return { content: json.content, contentType: json.contentType };
}
