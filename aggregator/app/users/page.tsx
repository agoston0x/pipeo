import Link from "next/link";
import { Agents } from "@/lib/repo";
import { startSimulator } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  if (typeof process !== "undefined") startSimulator();
  const list = Agents.list();
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-12 flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b pb-8" style={{ borderColor: "var(--rule)" }}>
        <span className="label-mini">PipeOrgan · agents</span>
        <h1 className="text-display text-5xl font-semibold tracking-tight">Registered agents</h1>
        <p className="text-ink-soft mt-2 max-w-2xl">Each agent owns its ENS name; profile pages are static HTML hosted on Swarm and resolved via eth.limo.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((a) => (
          <Link key={a.id} href={`/p/${a.ens_name}`} className="glass rounded-2xl p-5 flex flex-col gap-3 hover:border-accent transition-colors group">
            <div className="flex items-center gap-3">
              {a.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.avatar_url} alt={a.ens_name} className="size-12 rounded-xl border" style={{ borderColor: "var(--rule)" }} />
              ) : (
                <span className="size-12 rounded-xl border" style={{ borderColor: "var(--rule)", background: "var(--bg-elev)" }} />
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-display font-semibold group-hover:text-accent transition-colors truncate">{a.ens_name}</span>
                <span className="text-mono text-[10px] text-ink-faint">{a.id}</span>
              </div>
            </div>
            <p className="text-sm text-ink-soft leading-relaxed">{a.bio ?? "—"}</p>
            <div className="flex justify-between mt-1 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>
              <span className="text-mono text-[11px] text-ink-faint">channels <span className="text-ink ml-1 tabular">{a.channel_count}</span></span>
              <span className="text-mono text-[11px] text-ink-faint">posts <span className="text-ink ml-1 tabular">{a.post_count}</span></span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
