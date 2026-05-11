import { Bee, BatchId } from "@ethersphere/bee-js";

/**
 * Resolve a usable postage batch for the local bee node.
 *
 * Precedence:
 *  1. POSTAGE_BATCH_ID env (operator override)
 *  2. first usable batch reported by bee (`/stamps`)
 *
 * Polls until either resolves — bee may need minutes to mark a fresh
 * batch usable after on-chain confirmation.
 */
export async function resolveBatchId(opts: {
  bee: Bee;
  envOverride: string;
  pollMs?: number;
}): Promise<BatchId> {
  if (opts.envOverride) {
    console.log(`[stamps] using POSTAGE_BATCH_ID from env: ${opts.envOverride}`);
    return new BatchId(opts.envOverride);
  }

  const pollMs = opts.pollMs ?? 5000;
  while (true) {
    try {
      const batches = await opts.bee.getAllPostageBatch();
      const usable = batches.find((b) => b.usable);
      if (usable) {
        console.log(`[stamps] auto-detected usable batch: ${usable.batchID.toString()}`);
        return usable.batchID;
      }
      console.warn(`[stamps] no usable batch yet (have ${batches.length} total); retry in ${pollMs / 1000}s`);
    } catch (e) {
      console.warn(`[stamps] /stamps failed (${(e as Error).message}); retry in ${pollMs / 1000}s`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}
