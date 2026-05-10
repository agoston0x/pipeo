import { db } from "./db.js";
import type { SignedPipeMessage } from "./types.js";

export type Agent = {
  ens_name: string;
  address: string;
  bio: string | null;
  avatar_url: string | null;
  swarm_profile_hash: string | null;
  first_seen_at: number;
};

export type Channel = {
  name: string;
  owner_ens: string;
  description: string | null;
  created_at: number;
};

export type Post = {
  id: number;
  channel_name: string;
  sender_ens: string;
  content_type: string;
  content: string;
  parent_id: string;
  timestamp: number;
  received_at: number;
  signature: string;
};

export type ChannelRow = Channel & {
  owner_address: string;
  member_count: number;          // distinct senders ever posted
  post_count: number;
  posts_24h: number;
  last_post_at: number | null;
  last_post_content: string | null;
  last_post_sender_ens: string | null;
};

const since24h = () => Math.floor(Date.now() / 1000) - 24 * 3600;

export const Agents = {
  upsert(ensName: string, address: string): void {
    db.prepare(`
      INSERT INTO agents (ens_name, address) VALUES (?, ?)
      ON CONFLICT(ens_name) DO UPDATE SET address=excluded.address
    `).run(ensName, address);
  },
  list(): (Agent & { channel_count: number; post_count: number })[] {
    return db.prepare(`
      SELECT a.*,
        (SELECT COUNT(DISTINCT channel_name) FROM posts p WHERE p.sender_ens = a.ens_name) AS channel_count,
        (SELECT COUNT(*) FROM posts p WHERE p.sender_ens = a.ens_name) AS post_count
      FROM agents a
      ORDER BY post_count DESC, first_seen_at DESC
    `).all() as (Agent & { channel_count: number; post_count: number })[];
  },
  byEns(ens: string): Agent | undefined {
    return db.prepare("SELECT * FROM agents WHERE ens_name = ?").get(ens) as Agent | undefined;
  },
};

export const Channels = {
  ensure(name: string, ownerEns: string): void {
    db.prepare(`
      INSERT INTO channels (name, owner_ens) VALUES (?, ?)
      ON CONFLICT(name) DO NOTHING
    `).run(name, ownerEns);
  },
  list(): ChannelRow[] {
    return db.prepare(`
      SELECT c.*,
        a.address AS owner_address,
        (SELECT COUNT(DISTINCT sender_ens) FROM posts p WHERE p.channel_name = c.name) AS member_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_name = c.name) AS post_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_name = c.name AND p.received_at >= ?) AS posts_24h,
        (SELECT MAX(timestamp) FROM posts p WHERE p.channel_name = c.name) AS last_post_at,
        (SELECT content FROM posts p WHERE p.channel_name = c.name ORDER BY timestamp DESC LIMIT 1) AS last_post_content,
        (SELECT sender_ens FROM posts p WHERE p.channel_name = c.name ORDER BY timestamp DESC LIMIT 1) AS last_post_sender_ens
      FROM channels c JOIN agents a ON a.ens_name = c.owner_ens
      ORDER BY posts_24h DESC, post_count DESC
    `).all(since24h()) as ChannelRow[];
  },
  byName(name: string): ChannelRow | undefined {
    return db.prepare(`
      SELECT c.*,
        a.address AS owner_address,
        (SELECT COUNT(DISTINCT sender_ens) FROM posts p WHERE p.channel_name = c.name) AS member_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_name = c.name) AS post_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_name = c.name AND p.received_at >= ?) AS posts_24h,
        (SELECT MAX(timestamp) FROM posts p WHERE p.channel_name = c.name) AS last_post_at,
        (SELECT content FROM posts p WHERE p.channel_name = c.name ORDER BY timestamp DESC LIMIT 1) AS last_post_content,
        (SELECT sender_ens FROM posts p WHERE p.channel_name = c.name ORDER BY timestamp DESC LIMIT 1) AS last_post_sender_ens
      FROM channels c JOIN agents a ON a.ens_name = c.owner_ens
      WHERE c.name = ?
    `).get(since24h(), name) as ChannelRow | undefined;
  },
};

export const Posts = {
  insertFromMessage(m: SignedPipeMessage): { ok: boolean; duplicate?: boolean } {
    try {
      db.prepare(`
        INSERT INTO posts (channel_name, sender_ens, content_type, content, parent_id, timestamp, signature)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(m.channelName, m.ensName, m.contentType, m.content, m.parentId, m.timestamp, m.signature);
      return { ok: true };
    } catch (e) {
      const msg = String((e as Error).message);
      if (msg.includes("UNIQUE")) return { ok: false, duplicate: true };
      throw e;
    }
  },
  recent(limit = 50): (Post & { channel_name: string })[] {
    return db.prepare(`
      SELECT * FROM posts ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as Post[];
  },
  byChannel(channelName: string, limit = 50): Post[] {
    return db.prepare(`
      SELECT * FROM posts WHERE channel_name = ? ORDER BY timestamp DESC LIMIT ?
    `).all(channelName, limit) as Post[];
  },
  byAgent(ensName: string, limit = 50): Post[] {
    return db.prepare(`
      SELECT * FROM posts WHERE sender_ens = ? ORDER BY timestamp DESC LIMIT ?
    `).all(ensName, limit) as Post[];
  },
};

export const Rejected = {
  log(raw: Uint8Array, reason: string): void {
    db.prepare("INSERT INTO rejected_messages (raw, reason) VALUES (?, ?)").run(Buffer.from(raw), reason);
  },
  recent(limit = 50) {
    return db.prepare("SELECT id, reason, received_at, length(raw) AS bytes FROM rejected_messages ORDER BY id DESC LIMIT ?").all(limit) as Array<{ id: number; reason: string; received_at: number; bytes: number }>;
  },
};
