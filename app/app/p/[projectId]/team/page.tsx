import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { can, projectRole } from "@/lib/access";
import { projectAncestors } from "@/lib/queries";
import { DEPARTMENTS, USER_TYPES } from "@/lib/catalog";
import { Crumbs, Flash } from "@/components/ui";
import { inviteMember, updateMember } from "@/app/app/actions";

const ROLES = [
  ["OWNER", "Everything, incl. access and delete"],
  ["EDITOR", "Add and edit content, create folders"],
  ["CONTRIBUTOR", "Upload and add links, edit own items"],
  ["VIEWER", "Read and download only"],
] as const;

export default async function TeamPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string; ok?: string; welcome?: string }> }) {
  const { projectId } = await params;
  const { error, ok, welcome } = await searchParams;
  const { user, workspace } = await requireMember();
  const role = await projectRole({ userId: user.id, workspaceId: workspace.id }, projectId);
  if (!role) notFound();
  const [project, members, anc] = await Promise.all([
    db.project.findUnique({ where: { id: projectId } }),
    db.projectMember.findMany({ where: { projectId }, include: { user: { include: { memberships: { where: { workspaceId: workspace.id } } } } }, orderBy: { id: "asc" } }),
    projectAncestors(projectId),
  ]);
  if (!project) notFound();
  const manage = can.manage(role);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stack-sm">
        <Crumbs parts={[...anc.map((a) => ({ label: a.name, href: `/app/p/${a.id}` })), { label: "Team" }]} />
        <h1 className="h1">{welcome ? "Bring your team in." : `${project.name} team`}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {welcome ? "Your project and starter folders are ready. Invite the people you build with. You can skip this and do it later." : "Roles set what people can do. Departments drive folder restrictions like “Finance only”."}
        </p>
      </div>
      <Flash error={error} ok={ok} />

      <div className="grid-2">
        <div className="card">
          <table className="trace">
            <thead><tr><th>Person</th><th>Type</th><th>Department</th><th>Role</th>{manage && <th />}</tr></thead>
            <tbody>
              {members.map((m) => {
                const dept = m.user.memberships[0]?.department ?? "";
                const pending = !m.user.passwordHash;
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.user.name}{m.userId === user.id && " (you)"}</div>
                      <div className="label">{m.user.email}{pending && " · invite pending"}{m.user.memberships[0]?.role === "GUEST" && " · guest"}</div>
                    </td>
                    <td className="label">{USER_TYPES.find((t) => t.id === m.user.userType)?.label ?? "—"}</td>
                    {manage && m.userId !== user.id ? (
                      <td colSpan={3}>
                        <form action={updateMember} className="row">
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <select className="select" name="department" defaultValue={dept} style={{ height: 30, width: 130 }}>
                            <option value="">—</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                          </select>
                          <select className="select" name="role" defaultValue={m.role} style={{ height: 30, width: 140 }}>
                            {ROLES.map(([r]) => <option key={r} value={r}>{r.toLowerCase()}</option>)}
                            <option value="REMOVE">remove from project</option>
                          </select>
                          <button className="btn btn-ghost" style={{ height: 30 }}>Save</button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="label">{dept || "—"}</td>
                        <td><span className="pill">{m.role.toLowerCase()}</span></td>
                        {manage && <td />}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="stack">
          {manage ? (
            <form action={inviteMember} className="card pad stack-sm">
              <input type="hidden" name="projectId" value={projectId} />
              <span className="h3">Invite someone</span>
              <input className="input" name="email" type="email" placeholder="name@company.com" required />
              <input className="input" name="name" placeholder="Name · optional" />
              <div className="row">
                <select className="select" name="role" defaultValue="EDITOR">{ROLES.map(([r]) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
                <select className="select" name="department" defaultValue="">
                  <option value="">Department</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <label className="row label"><input type="checkbox" name="guest" /> Guest · only sees what is shared directly</label>
              <button className="btn" style={{ justifySelf: "start" }}>Add to project</button>
              <span className="label">They sign up with this email to get in. Email invites arrive once an email provider is set up.</span>
            </form>
          ) : (
            <div className="card pad label">Only project owners can invite people.</div>
          )}
          <div className="card pad stack-sm">
            <span className="label">Roles</span>
            {ROLES.map(([r, d], i) => (
              <div key={r} className="row" style={{ alignItems: "start" }}>
                <span className={`sq c-${["green", "purple", "amber", "blue"][i]}`} style={{ marginTop: 5 }} />
                <span><b>{r.toLowerCase()}</b> <span className="muted">· {d}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
