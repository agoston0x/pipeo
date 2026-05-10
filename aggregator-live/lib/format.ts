export function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "—";
  const ms = Date.now() - ts * 1000;
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function shortHash(s: string | null | undefined, len = 6): string {
  if (!s) return "—";
  if (s.length <= len * 2 + 2) return s;
  return `${s.slice(0, len + 2)}…${s.slice(-len)}`;
}

export function activityScore(posts24h: number, members: number, totalPosts: number): number {
  const recent = posts24h * 6;
  const base = totalPosts * 0.2;
  const social = Math.log10(Math.max(members, 1)) * 8;
  return Math.min(99, Math.round(recent + base + social));
}
