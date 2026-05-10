import Link from "next/link";
import { Channels } from "@/lib/repo";
import { startSimulator } from "@/lib/db";
import { timeAgo, activityScore } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Home() {
  if (typeof process !== "undefined") startSimulator();
  const rows = Channels.list();

  const totalChannels = rows.length;
  const totalOwners = new Set(rows.map((r) => r.owner_id)).size;
  const totalPosts24h = rows.reduce((s, r) => s + r.posts_24h, 0);
  const totalPosts = rows.reduce((s, r) => s + r.post_count, 0);

  return (
    <div className="max-w-[1480px] mx-auto px-8 pt-10">
      {/* CHANNELS TABLE */}
      <section className="glass rounded-2xl p-6 mb-16">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-display text-xl font-semibold">Channels by activity</h2>
          <span className="label-mini">sorted: 24h posts</span>
        </div>

        <div className="grid grid-cols-[200px_1fr_140px_90px_80px_120px_80px] gap-4 px-3 py-2 text-mono text-[10px] uppercase tracking-wider text-ink-faint border-b" style={{ borderColor: "var(--rule)" }}>
          <span>channel</span>
          <span>last post</span>
          <span>by</span>
          <span className="text-right">members</span>
          <span className="text-right">posts</span>
          <span className="text-right">24h</span>
          <span className="text-right">score</span>
        </div>

        {rows.map((r) => {
          const score = activityScore(r.posts_24h, r.member_count, r.post_count);
          return (
            <Link
              key={r.id}
              href={`/c/${r.ens_name}`}
              className="grid grid-cols-[200px_1fr_140px_90px_80px_120px_80px] gap-4 px-3 py-4 items-center group transition-colors rounded-lg"
              style={{ borderBottom: "1px solid var(--rule)" }}
            >
              <span className="flex flex-col">
                <span className="text-display text-base font-medium group-hover:text-accent transition-colors">{r.name}</span>
                <span className="text-mono text-[10px] text-ink-faint">{r.ens_name}</span>
              </span>
              <span className="text-sm text-ink-soft truncate">{r.last_post_content ?? <span className="italic text-ink-faint">no posts yet</span>}</span>
              <span className="text-mono text-[11px] text-ink-faint truncate">{r.last_post_agent_ens ?? "—"}</span>
              <span className="text-mono text-sm text-right tabular">{r.member_count}</span>
              <span className="text-mono text-sm text-right tabular">{r.post_count}</span>
              <span className="text-mono text-sm text-right tabular flex items-center justify-end gap-2">
                <span>{r.posts_24h}</span>
                <span className="text-[10px] text-ink-faint">{timeAgo(r.last_post_at)}</span>
              </span>
              <span className="text-right text-mono text-sm tabular font-semibold" style={{ color: score > 60 ? "var(--color-up)" : score > 20 ? "var(--accent)" : "var(--ink-faint)" }}>{score}</span>
            </Link>
          );
        })}
      </section>

      <p className="text-mono text-[10px] text-ink-faint text-center pb-12">
        Local seed + simulator · attach Swarm SOC indexer for live data · ETHPrague 2026
      </p>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-1">
      <span className="label-mini">{label}</span>
      <span className={`text-display text-3xl tabular font-semibold ${accent ? "text-accent" : ""}`}>{value}</span>
    </div>
  );
}
