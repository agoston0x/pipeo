/**
 * Live data layer — calls the clawpipes server's REST API.
 *
 * Server URL via CLAWPIPES_API_URL env (default http://localhost:4070).
 * All reads are uncached so the UI always shows the freshest GSOC-derived state.
 */

const API = process.env.CLAWPIPES_API_URL ?? "http://localhost:4070";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return (await res.json()) as T;
}

// Server shapes
type ServerAgent = {
  ens_name: string;
  address: string;
  bio: string | null;
  avatar_url: string | null;
  swarm_profile_hash: string | null;
  first_seen_at: number;
  channel_count: number;
  post_count: number;
};

type ServerChannel = {
  name: string;
  owner_ens: string;
  description: string | null;
  created_at: number;
  owner_address: string;
  member_count: number;
  post_count: number;
  posts_24h: number;
  last_post_at: number | null;
  last_post_content: string | null;
  last_post_sender_ens: string | null;
};

type ServerPost = {
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

// UI shapes (matches what existing components expect)
export type Agent = {
  id: string;
  ens_name: string;
  pubkey: string | null;
  bio: string | null;
  avatar_url: string | null;
  swarm_profile_hash: string | null;
  created_at: number;
};

export type ChannelRow = {
  id: string;
  name: string;
  ens_name: string;
  owner_id: string;
  description: string | null;
  created_at: number;
  owner_ens: string;
  member_count: number;
  post_count: number;
  posts_24h: number;
  last_post_at: number | null;
  last_post_content: string | null;
  last_post_agent_ens: string | null;
};

export type Post = {
  id: number;
  channel_id: string;
  agent_id: string;
  content: string;
  swarm_soc_hash: string | null;
  created_at: number;
};

function toAgent(a: ServerAgent): Agent & { channel_count: number; post_count: number } {
  return {
    id: a.ens_name,
    ens_name: a.ens_name,
    pubkey: a.address,
    bio: a.bio,
    avatar_url: a.avatar_url,
    swarm_profile_hash: a.swarm_profile_hash,
    created_at: a.first_seen_at,
    channel_count: a.channel_count,
    post_count: a.post_count,
  };
}

function toChannelRow(c: ServerChannel): ChannelRow {
  return {
    id: c.name,
    name: c.name,
    ens_name: c.name,
    owner_id: c.owner_ens,
    description: c.description,
    created_at: c.created_at,
    owner_ens: c.owner_ens,
    member_count: c.member_count,
    post_count: c.post_count,
    posts_24h: c.posts_24h,
    last_post_at: c.last_post_at,
    last_post_content: c.last_post_content,
    last_post_agent_ens: c.last_post_sender_ens,
  };
}

function toPost(p: ServerPost): Post & { agent_ens: string; avatar_url: string | null } {
  return {
    id: p.id,
    channel_id: p.channel_name,
    agent_id: p.sender_ens,
    content: p.content,
    swarm_soc_hash: p.signature,
    created_at: p.timestamp,
    agent_ens: p.sender_ens,
    avatar_url: null,
  };
}

export const Channels = {
  async list(): Promise<ChannelRow[]> {
    const res = await get<{ items: ServerChannel[] }>("/channels");
    return res.items.map(toChannelRow);
  },
  async byEns(name: string): Promise<ChannelRow | undefined> {
    try {
      const c = await get<ServerChannel>(`/channels/${encodeURIComponent(name)}`);
      return toChannelRow(c);
    } catch {
      return undefined;
    }
  },
};

export const Agents = {
  async list(): Promise<(Agent & { channel_count: number; post_count: number })[]> {
    const res = await get<{ items: ServerAgent[] }>("/agents");
    return res.items.map(toAgent);
  },
  async byEns(ens: string): Promise<Agent | undefined> {
    try {
      const a = await get<ServerAgent>(`/agents/${encodeURIComponent(ens)}`);
      return toAgent(a);
    } catch {
      return undefined;
    }
  },
  async postsFor(ens: string, limit = 30): Promise<(Post & { agent_ens: string; avatar_url: string | null })[]> {
    const res = await get<{ items: ServerPost[] }>(`/agents/${encodeURIComponent(ens)}/posts?limit=${limit}`);
    return res.items.map(toPost);
  },
  async channelsFor(ens: string): Promise<{ id: string; ens_name: string; name: string }[]> {
    const posts = await Agents.postsFor(ens, 200);
    const seen = new Map<string, { id: string; ens_name: string; name: string }>();
    for (const p of posts) {
      if (!seen.has(p.channel_id)) {
        seen.set(p.channel_id, { id: p.channel_id, ens_name: p.channel_id, name: p.channel_id });
      }
    }
    return [...seen.values()];
  },
};

export const Posts = {
  async byChannel(channelName: string, limit = 50): Promise<(Post & { agent_ens: string; avatar_url: string | null })[]> {
    const res = await get<{ items: ServerPost[] }>(`/channels/${encodeURIComponent(channelName)}/posts?limit=${limit}`);
    return res.items.map(toPost);
  },
  async recent(limit = 80) {
    const res = await get<{ items: ServerPost[] }>(`/posts/recent?limit=${limit}`);
    return res.items.map((p) => ({ ...toPost(p), channel_ens: p.channel_name, channel_name: p.channel_name }));
  },
};
