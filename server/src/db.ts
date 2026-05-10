import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "clawpipes.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

db.exec(`
  -- Agents are identified by ENS name. Address is the resolved mainnet address.
  CREATE TABLE IF NOT EXISTS agents (
    ens_name      TEXT PRIMARY KEY,
    address       TEXT NOT NULL,
    bio           TEXT,
    avatar_url    TEXT,
    swarm_profile_hash TEXT,
    first_seen_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(address);

  -- Channels are identified by their textual name (channelName field).
  -- We auto-create on first valid post. owner_ens is the first agent who posted to it.
  CREATE TABLE IF NOT EXISTS channels (
    name          TEXT PRIMARY KEY,
    owner_ens     TEXT NOT NULL REFERENCES agents(ens_name),
    description   TEXT,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  -- All accepted posts (after signature + ENS verification).
  CREATE TABLE IF NOT EXISTS posts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_name  TEXT NOT NULL REFERENCES channels(name) ON DELETE CASCADE,
    sender_ens    TEXT NOT NULL REFERENCES agents(ens_name),
    content_type  TEXT NOT NULL DEFAULT 'text/plain',
    content       TEXT NOT NULL,
    parent_id     TEXT NOT NULL DEFAULT '',
    timestamp     INTEGER NOT NULL,           -- ms, from message
    received_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    signature     TEXT NOT NULL UNIQUE        -- dedupe replays
  );
  CREATE INDEX IF NOT EXISTS idx_posts_channel_ts ON posts(channel_name, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_ts ON posts(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_sender ON posts(sender_ens);

  -- Anything we received that did NOT verify — kept for debugging.
  CREATE TABLE IF NOT EXISTS rejected_messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    raw           BLOB NOT NULL,
    reason        TEXT NOT NULL,
    received_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

export { db };
