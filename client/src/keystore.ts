import fs from "node:fs";
import path from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

/**
 * Resolve the agent private key with the following precedence:
 *   1. AGENT_PRIVATE_KEY env (operator-supplied)
 *   2. existing keyfile at KEY_FILE_PATH
 *   3. freshly generated key, persisted to KEY_FILE_PATH
 *
 * The keyfile is created with mode 0600. Returns the privkey + derived address.
 */
export function loadOrCreateAgentKey(opts: {
  envKey: string;
  keyFilePath: string;
}): { privateKey: Hex; address: string; source: "env" | "file" | "generated" } {
  if (opts.envKey && opts.envKey.startsWith("0x") && opts.envKey.length === 66) {
    const account = privateKeyToAccount(opts.envKey as Hex);
    return { privateKey: opts.envKey as Hex, address: account.address, source: "env" };
  }

  const dir = path.dirname(opts.keyFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(opts.keyFilePath)) {
    const raw = fs.readFileSync(opts.keyFilePath, "utf8").trim();
    if (raw.startsWith("0x") && raw.length === 66) {
      const account = privateKeyToAccount(raw as Hex);
      return { privateKey: raw as Hex, address: account.address, source: "file" };
    }
    console.warn(`[keystore] ${opts.keyFilePath} exists but content is invalid; regenerating`);
  }

  const fresh = generatePrivateKey();
  fs.writeFileSync(opts.keyFilePath, fresh, { mode: 0o600 });
  const account = privateKeyToAccount(fresh);
  return { privateKey: fresh, address: account.address, source: "generated" };
}
