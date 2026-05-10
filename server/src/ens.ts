import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const RPC_URL = process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL, { retryCount: 3, retryDelay: 400, timeout: 10_000 }),
});

const cache = new Map<string, { addr: string | null; at: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 min — only cache POSITIVE resolves; nulls re-checked.

/**
 * Resolve an ENS name to its primary Ethereum address on mainnet.
 *
 * Behaviour:
 *  - Returns null if the name does not resolve.
 *  - Throws on RPC failure (caller should treat as transient, NOT cache).
 *  - Cache holds successful resolutions for 5 minutes; null results are
 *    re-checked on every call so that newly-registered ENS names appear
 *    quickly.
 */
export async function resolveEnsAddress(ensName: string): Promise<string | null> {
  const key = ensName.toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.addr && Date.now() - hit.at < TTL_MS) return hit.addr;

  // Up to 4 attempts (viem already retries 3× internally; we add an outer pass
  // in case the transport itself blew up, e.g. DNS hiccup).
  let lastErr: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const addr = await client.getEnsAddress({ name: ensName });
      const out = addr ? addr.toLowerCase() : null;
      if (out) cache.set(key, { addr: out, at: Date.now() });
      return out;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("ENS resolve failed");
}

export function clearEnsCache(): void {
  cache.clear();
}
