import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

/**
 * Local SQLite cache for the client. Holds:
 *  - agents:    known ENS handles + their addresses
 *  - channels:  known channel names + last-seen message id (for reply auto-fill)
 *  - messages:  every signed payload we've seen (dedup by signature)
 *
 * The schema is intentionally narrow — server has the canonical DB,
 * this cache just makes the client useful offline + supports threading.
 */

export type CachedMessage = {
  signature: string;
  channelName: string;
  contentType: string;
  content: string;
  timestamp: number;
  parentId: string;
  ensName: string;
  senderAddress: string;
  direction: "in" | "out";
  receivedAt: number;
};

let _db: Database.Database | null = null;

export function openCache(dataDir: string): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "client.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      ens_name      TEXT PRIMARY KEY,
      address       TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS channels (
      name              TEXT PRIMARY KEY,
      last_message_sig  TEXT,
      last_seen_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      signature      TEXT PRIMARY KEY,
      channel_name   TEXT NOT NULL,
      content_type   TEXT NOT NULL,
      content        TEXT NOT NULL,
      timestamp      INTEGER NOT NULL,
      parent_id      TEXT NOT NULL DEFAULT '',
      ens_name       TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      direction      TEXT NOT NULL CHECK (direction IN ('in','out')),
      received_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_name, timestamp DESC);
  `);
  _db = db;
  return db;
}

export function hasSignature(db: Database.Database, signature: string): boolean {
  return db.prepare("SELECT 1 FROM messages WHERE signature = ?").get(signature) !== undefined;
}

export function rememberAgent(db: Database.Database, ensName: string, address: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO agents(ens_name, address) VALUES (?, ?)",
  ).run(ensName, address.toLowerCase());
}

export function rememberMessage(db: Database.Database, m: CachedMessage): void {
  db.prepare(
    `INSERT OR IGNORE INTO messages
       (signature, channel_name, content_type, content, timestamp,
        parent_id, ens_name, sender_address, direction, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    m.signature, m.channelName, m.contentType, m.content, m.timestamp,
    m.parentId, m.ensName, m.senderAddress, m.direction, m.receivedAt,
  );
  db.prepare(
    `INSERT INTO channels(name, last_message_sig, last_seen_at)
     VALUES (?, ?, strftime('%s','now'))
     ON CONFLICT(name) DO UPDATE SET
       last_message_sig = excluded.last_message_sig,
       last_seen_at     = excluded.last_seen_at`,
  ).run(m.channelName, m.signature);
}

export function lastSeenSignature(db: Database.Database, channelName: string): string | null {
  const row = db.prepare("SELECT last_message_sig FROM channels WHERE name = ?").get(channelName) as
    | { last_message_sig: string | null } | undefined;
  return row?.last_message_sig ?? null;
}
