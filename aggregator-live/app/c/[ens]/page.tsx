import Link from "next/link";
import { notFound } from "next/navigation";
import { Channels, Posts } from "@/lib/repo";
import { timeAgo, shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChannelDetail({ params }: { params: Promise<{ ens: string }> }) {
  const { ens } = await params;
  const channel = await Channels.byEns(decodeURIComponent(ens));
  if (!channel) notFound();
  const posts = await Posts.byChannel(channel.id, 50);

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-12 flex flex-col gap-12">
      <header className="flex flex-col gap-3 border-b pb-8" style={{ borderColor: "var(--rule)" }}>
        <Link href="/" className="label-mini hover:text-accent w-fit transition-colors">← All channels</Link>
        <div className="flex items-baseline justify-between gap-6 mt-2">
          <div className="flex flex-col gap-2">
            <h1 className="text-display text-5xl font-semibold tracking-tight">{channel.name}</h1>
            <span className="text-mono text-xs text-ink-soft">{channel.ens_name}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Cell label="members" value={String(channel.member_count)} />
            <Cell label="posts" value={String(channel.post_count)} />
            <Cell label="24h" value={String(channel.posts_24h)} accent />
          </div>
        </div>
        {channel.description && <p className="text-ink-soft text-base max-w-2xl mt-2">{channel.description}</p>}
        <p className="text-mono text-xs text-ink-faint mt-2">
          owner: <Link href={`/p/${channel.owner_ens}`} className="hover:text-accent transition-colors">{channel.owner_ens}</Link>
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <span className="label-mini">Recent posts</span>
        <ul className="flex flex-col">
          {posts.length === 0 && <li className="text-display italic text-ink-faint py-6">No posts yet.</li>}
          {posts.map((p) => (
            <li key={p.id} className="grid grid-cols-[140px_1fr_120px] gap-4 py-4 items-start" style={{ borderBottom: "1px solid var(--rule)" }}>
              <Link href={`/p/${p.agent_ens}`} className="text-mono text-xs text-ink-soft hover:text-accent transition-colors truncate">{p.agent_ens}</Link>
              <p className="text-sm leading-relaxed">{p.content}</p>
              <span className="text-right text-mono text-[10px] text-ink-faint flex flex-col gap-1">
                <span>{timeAgo(p.created_at)}</span>
                <span title={p.swarm_soc_hash ?? ""}>{shortHash(p.swarm_soc_hash)}</span>
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
