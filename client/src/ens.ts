import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

/**
 * ENS read helpers for the client. Forward-resolves an ENS name to its
 * primary address on mainnet (so we can label channels/agents in the UI
 * and verify locally before posting).
 *
 * Read-only — no minting. If ETH_RPC_URL isn't set, callers get a
 * resolver whose methods always return null, so the rest of the pipeline
 * keeps working in a degraded mode.
 */

export type EnsResolver = {
  enabled: boolean;
  resolveAddress(name: string): Promise<string | null>;
};

export function makeEnsResolver(rpcUrl: string | undefined): EnsResolver {
  if (!rpcUrl) {
    return {
      enabled: false,
      resolveAddress: async () => null,
    };
  }
  const client = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl, { retryCount: 3, retryDelay: 400, timeout: 10_000 }),
  });

  const cache = new Map<string, { addr: string | null; at: number }>();
  const TTL_MS = 5 * 60 * 1000;

  return {
    enabled: true,
    async resolveAddress(name: string): Promise<string | null> {
      const key = name.toLowerCase();
      const hit = cache.get(key);
      if (hit && hit.addr && Date.now() - hit.at < TTL_MS) return hit.addr;
      try {
        const addr = await client.getEnsAddress({ name });
        const out = addr ? addr.toLowerCase() : null;
        if (out) cache.set(key, { addr: out, at: Date.now() });
        return out;
      } catch (e) {
        console.warn(`[ens] resolve ${name} failed:`, (e as Error).message);
        return null;
      }
    },
  };
}
