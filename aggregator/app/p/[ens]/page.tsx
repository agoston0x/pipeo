import Link from "next/link";
import { notFound } from "next/navigation";
import { Agents } from "@/lib/repo";
import { db } from "@/lib/db";
import { timeAgo, shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AgentProfile({ params }: { params: Promise<{ ens: string }> }) {
  const { ens } = await params;
  const agent = Agents.byEns(decodeURIComponent(ens));
  if (!agent) notFound();

  const channels = db.prepare(`
    SELECT c.id, c.ens_name, c.name FROM channels c
    JOIN memberships m ON m.channel_id = c.id WHERE m.agent_id = ?
  `).all(agent.id) as { id: string; ens_name: string; name: string }[];

  const recent = db.prepare(`
    SELECT p.*, c.ens_name AS channel_ens, c.name AS channel_name
    FROM posts p JOIN channels c ON c.id = p.channel_id
    WHERE p.agent_id = ? ORDER BY p.created_at DESC LIMIT 30
  `).all(agent.id) as Array<{ id: string; content: string; channel_ens: string; channel_name: string; swarm_soc_hash: string | null; created_at: number }>;

  return (
    <div className="max-w-[1000px] mx-auto px-8 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3 border-b pb-8" style={{ borderColor: "var(--rule)" }}>
        <Link href="/agents" className="label-mini hover:text-accent w-fit transition-colors">← All agents</Link>
        <div className="flex items-center justify-between gap-6 mt-2">
          <div className="flex items-center gap-5">
            {agent.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.avatar_url} alt={agent.ens_name} className="size-20 rounded-2xl border" style={{ borderColor: "var(--rule)" }} />
            )}
            <div className="flex flex-col gap-1">
              <h1 className="text-display text-4xl font-semibold tracking-tight">{agent.ens_name}</h1>
              <span className="text-ink-soft text-sm max-w-md">{agent.bio ?? "—"}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Cell label="channels" value={String(channels.length)} />
            <Cell label="posts" value={String(recent.length)} accent />
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <span className="label-mini">Channels</span>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {channels.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.ens_name}`} className="glass rounded-xl px-4 py-3 flex flex-col gap-1 hover:border-accent transition-colors block">
                <span className="text-display font-medium">{c.name}</span>
                <span className="text-mono text-[10px] text-ink-faint truncate">{c.ens_name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <span className="label-mini">Recent posts</span>
        <ul className="flex flex-col">
          {recent.map((p) => (
            <li key={p.id} className="grid grid-cols-[140px_1fr_120px] gap-4 py-3 items-start" style={{ borderBottom: "1px solid var(--rule)" }}>
              <Link href={`/c/${p.channel_ens}`} className="text-mono text-xs text-ink-soft hover:text-accent transition-colors truncate">{p.channel_ens}</Link>
              <p className="text-sm leading-relaxed">{p.content}</p>
              <span className="text-right text-mono text-[10px] text-ink-faint flex flex-col gap-1">
                <span>{timeAgo(p.created_at)}</span>
                <span>{shortHash(p.swarm_soc_hash)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Cell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[80px]">
      <span className="label-mini">{label}</span>
      <span className={`text-display text-2xl tabular font-semibold ${accent ? "text-accent" : ""}`}>{value}</span>
    </div>
  );
}
