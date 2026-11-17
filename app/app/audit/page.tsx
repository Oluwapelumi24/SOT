import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { ago } from "@/components/ui";

export default async function AuditPage() {
  const { membership, workspace } = await requireMember();
  if (!["OWNER", "ADMIN"].includes(membership.role)) notFound();
  const events = await db.auditEvent.findMany({ where: { workspaceId: workspace.id }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack-sm"><span className="label">Audit log · last 200 events</span><h1 className="h1">Every change, on record.</h1></div>
      <div className="card">
        <table className="trace">
          <thead><tr><th>When</th><th>Who</th><th>Did</th><th>What</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="label" style={{ width: 120 }}>{ago(e.createdAt)}</td>
                <td>{e.actor.name}</td>
                <td className="mono">{e.action}</td>
                <td className="muted">{e.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && <div className="empty">No events yet.</div>}
      </div>
    </div>
  );
}
