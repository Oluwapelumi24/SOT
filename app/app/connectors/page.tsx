import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { PROVIDERS } from "@/lib/catalog";
import { Flash } from "@/components/ui";
import { toggleConnection } from "../actions";

export default async function Connectors({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { membership, workspace } = await requireMember();
  const connections = await db.connection.findMany({ where: { workspaceId: workspace.id } });
  const on = new Set(connections.map((c) => c.provider));
  const linkCounts = await db.item.groupBy({ by: ["provider"], where: { type: "LINK", folder: { project: { workspaceId: workspace.id } } }, _count: true });
  const count = (p: string) => linkCounts.find((x) => x.provider === p)?._count ?? 0;
  const admin = ["OWNER", "ADMIN"].includes(membership.role);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="between" style={{ alignItems: "end" }}>
        <div className="stack-sm">
          <span className="label">Connectors</span>
          <h1 className="h1">Bring every tool into one place.</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 560 }}>
            Links from these tools already work: paste one into any folder and SOT tags it. Full sync (live previews and mirrored
            pages) switches on per tool once its OAuth app keys are added on the server.
          </p>
        </div>
        <div className="stack-sm" style={{ textAlign: "right" }}>
          <span className="label">Connected</span>
          <span className="big-num">{on.size}<span className="faint" style={{ fontSize: 24 }}>/{Object.keys(PROVIDERS).length}</span></span>
        </div>
      </div>
      <Flash error={error} />
      <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <div key={id} className={`tile c-${p.color}`} style={{ minHeight: 190, opacity: on.has(id) ? 1 : 0.92 }}>
            <div className="between">
              <span className="label">{p.capability}</span>
              {on.has(id) && <span className="tile-lock" style={{ position: "static" }}>● Connected</span>}
            </div>
            <div className="stack-sm" style={{ gap: 6 }}>
              <span className="tile-num" style={{ fontSize: 22 }}>{p.name}</span>
              <span className="label">{p.hint} · {count(id)} linked</span>
              {admin && (
                <form action={toggleConnection}>
                  <input type="hidden" name="provider" value={id} />
                  <button className="btn btn-light" style={{ height: 28 }}>{on.has(id) ? "Disconnect" : "Connect"}</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
      {!admin && <p className="label">Only workspace owners and admins can connect tools.</p>}
    </div>
  );
}
