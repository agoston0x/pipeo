import { db } from "./db";

export type Agent = { id: string; ens_name: string; pubkey: string | null; bio: string | null; avatar_url: string | null; swarm_profile_hash: string | null; created_at: number };
export type Channel = { id: string; name: string; ens_name: string; owner_id: string; description: string | null; created_at: number };
export type Post = { id: string; channel_id: string; agent_id: string; content: string; swarm_soc_hash: string | null; signed_delta: string | null; created_at: number };

export type ChannelRow = Channel & {
  owner_ens: string;
  member_count: number;
  post_count: number;
  posts_24h: number;
  last_post_at: number | null;
  last_post_content: string | null;
  last_post_agent_ens: string | null;
};

export const Channels = {
  list(): ChannelRow[] {
    const since24h = Math.floor(Date.now() / 1000) - 24 * 3600;
    return db.prepare(`
      SELECT c.*,
        a.ens_name AS owner_ens,
        (SELECT COUNT(*) FROM memberships m WHERE m.channel_id = c.id) AS member_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id) AS post_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id AND p.created_at >= ?) AS posts_24h,
        (SELECT MAX(p.created_at) FROM posts p WHERE p.channel_id = c.id) AS last_post_at,
        (SELECT p.content FROM posts p WHERE p.channel_id = c.id ORDER BY p.created_at DESC LIMIT 1) AS last_post_content,
        (SELECT a2.ens_name FROM posts p JOIN agents a2 ON p.agent_id = a2.id WHERE p.channel_id = c.id ORDER BY p.created_at DESC LIMIT 1) AS last_post_agent_ens
      FROM channels c JOIN agents a ON a.id = c.owner_id
      ORDER BY posts_24h DESC, post_count DESC
    `).all(since24h) as ChannelRow[];
  },
  byEns(ens: string): ChannelRow | undefined {
    const since24h = Math.floor(Date.now() / 1000) - 24 * 3600;
    return db.prepare(`
      SELECT c.*,
        a.ens_name AS owner_ens,
        (SELECT COUNT(*) FROM memberships m WHERE m.channel_id = c.id) AS member_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id) AS post_count,
        (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id AND p.created_at >= ?) AS posts_24h,
        (SELECT MAX(p.created_at) FROM posts p WHERE p.channel_id = c.id) AS last_post_at,
        (SELECT p.content FROM posts p WHERE p.channel_id = c.id ORDER BY p.created_at DESC LIMIT 1) AS last_post_content,
        (SELECT a2.ens_name FROM posts p JOIN agents a2 ON p.agent_id = a2.id WHERE p.channel_id = c.id ORDER BY p.created_at DESC LIMIT 1) AS last_post_agent_ens
      FROM channels c JOIN agents a ON a.id = c.owner_id
      WHERE c.ens_name = ? OR c.id = ?
    `).get(since24h, ens, ens) as ChannelRow | undefined;
  },
};

export const Agents = {
  list(): (Agent & { channel_count: number; post_count: number })[] {
    return db.prepare(`
      SELECT a.*,
        (SELECT COUNT(*) FROM memberships m WHERE m.agent_id = a.id) AS channel_count,
        (SELECT COUNT(*) FROM posts p WHERE p.agent_id = a.id) AS post_count
      FROM agents a
      ORDER BY post_count DESC
    `).all() as (Agent & { channel_count: number; post_count: number })[];
  },
  byEns(ens: string): Agent | undefined {
    return db.prepare("SELECT * FROM agents WHERE ens_name = ? OR id = ?").get(ens, ens) as Agent | undefined;
  },
};

export const Posts = {
  recent(limit = 50): (Post & { agent_ens: string; channel_ens: string; channel_name: string; avatar_url: string | null })[] {
    return db.prepare(`
      SELECT p.*, a.ens_name AS agent_ens, a.avatar_url, c.ens_name AS channel_ens, c.name AS channel_name
      FROM posts p JOIN agents a ON a.id = p.agent_id JOIN channels c ON c.id = p.channel_id
      ORDER BY p.created_at DESC LIMIT ?
    `).all(limit) as (Post & { agent_ens: string; channel_ens: string; channel_name: string; avatar_url: string | null })[];
  },
  byChannel(channelId: string, limit = 50) {
    return db.prepare(`
      SELECT p.*, a.ens_name AS agent_ens, a.avatar_url
      FROM posts p JOIN agents a ON a.id = p.agent_id
      WHERE p.channel_id = ? ORDER BY p.created_at DESC LIMIT ?
    `).all(channelId, limit) as (Post & { agent_ens: string; avatar_url: string | null })[];
  },
};
