import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { can, folderAccess, visibleFolderIds } from "@/lib/access";
import { folderAncestors, projectAncestors } from "@/lib/queries";
import { DEPARTMENTS } from "@/lib/catalog";
import { Crumbs, Flash, ItemTable } from "@/components/ui";
import { NewFolder } from "@/components/NewFolder";
import { addLink, addNote, uploadFile, updateFolderAccess, deleteFolder } from "@/app/app/actions";

export default async function FolderPage({ params, searchParams }: { params: Promise<{ projectId: string; folderId: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { projectId, folderId } = await params;
  const { error, ok } = await searchParams;
  const { user, workspace } = await requireMember();
  const v = { userId: user.id, workspaceId: workspace.id };
  const role = await folderAccess(v, folderId);
  if (!role) notFound(); // restricted folders look like they don't exist

  const [folder, visible, pAnc, fAnc, members] = await Promise.all([
    db.folder.findUnique({ where: { id: folderId }, include: { access: { include: { user: true } }, createdBy: true } }),
    visibleFolderIds(v, projectId),
    projectAncestors(projectId),
    folderAncestors(folderId),
    db.projectMember.findMany({ where: { projectId }, include: { user: { include: { memberships: { where: { workspaceId: workspace.id } } } } } }),
  ]);
  if (!folder || folder.projectId !== projectId) notFound();
  const [subfolders, items] = await Promise.all([
    db.folder.findMany({ where: { parentId: folderId, id: { in: [...visible] } }, include: { _count: { select: { items: true } } } }),
    db.item.findMany({ where: { folderId }, include: { owner: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const mayManageAccess = can.manage(role) || folder.createdById === user.id;
  const allowedDepts = new Set(folder.access.map((a) => a.department).filter(Boolean));
  const allowedUsers = new Set(folder.access.map((a) => a.userId).filter(Boolean));
  const whoCanSee = folder.restricted
    ? members.filter((m) => m.userId === folder.createdById || allowedUsers.has(m.userId) || (m.user.memberships[0]?.department && allowedDepts.has(m.user.memberships[0].department)))
    : members;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stack-sm">
        <Crumbs parts={[...pAnc.map((a) => ({ label: a.name, href: `/app/p/${a.id}` })), ...fAnc.map((a, i) => (i === fAnc.length - 1 ? { label: a.name } : { label: a.name, href: `/app/p/${projectId}/f/${a.id}` }))]} />
        <div className="between" style={{ alignItems: "end" }}>
          <div className="row" style={{ gap: 14 }}>
            <div className={`c-${folder.color}`} style={{ width: 10, height: 44, background: "var(--c)", borderRadius: 2 }} />
            <div className="stack-sm" style={{ gap: 4 }}>
              <h1 className="h1">{folder.name}</h1>
              <div className="row-wrap">
                {folder.restricted ? <span className="pill tag-restricted">Restricted</span> : <span className="pill">Open to project</span>}
                <span className={`pill ${folder.sensitivity === "CONFIDENTIAL" ? "tag-confidential" : folder.sensitivity === "RESTRICTED" ? "tag-restricted" : ""}`}>{folder.sensitivity.toLowerCase()}</span>
                <span className="pill">You · {role.toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Flash error={error} ok={ok} />

      <div className="grid-2">
        <div className="stack">
          {can.upload(role) && (
            <div className="card">
              <div className="row pad" style={{ paddingBottom: 0, gap: 6 }}><span className="label">Add to {folder.name}</span></div>
              <div className="grid-3 pad" style={{ gap: 10 }}>
                <details className="drawer card pad stack-sm" style={{ background: "var(--paper)" }}>
                  <summary className="row"><span className="sq c-amber" /> <b>Upload a file</b></summary>
                  <form action={uploadFile} className="stack-sm" style={{ marginTop: 10 }}>
                    <input type="hidden" name="folderId" value={folderId} />
                    <input type="file" name="file" required />
                    <input className="input" name="title" placeholder="Title · optional" />
                    <button className="btn">Upload · 20 MB max</button>
                  </form>
                </details>
                <details className="drawer card pad stack-sm" style={{ background: "var(--paper)" }}>
                  <summary className="row"><span className="sq c-purple" /> <b>Paste a link</b></summary>
                  <form action={addLink} className="stack-sm" style={{ marginTop: 10 }}>
                    <input type="hidden" name="folderId" value={folderId} />
                    <input className="input" name="url" placeholder="figma.com/…, github.com/…, jira…" required />
                    <input className="input" name="title" placeholder="Title · optional" />
                    <input className="input" name="note" placeholder="Why it matters · optional" />
                    <button className="btn">Add link</button>
                  </form>
                </details>
                <details className="drawer card pad stack-sm" style={{ background: "var(--paper)" }}>
                  <summary className="row"><span className="sq c-green" /> <b>Write a note</b></summary>
                  <form action={addNote} className="stack-sm" style={{ marginTop: 10 }}>
                    <input type="hidden" name="folderId" value={folderId} />
                    <input className="input" name="title" placeholder="Decision: retry payments 3×" required />
                    <textarea className="textarea" name="content" placeholder="Write the idea, decision or spec…" />
                    <button className="btn">Save note</button>
                  </form>
                </details>
              </div>
            </div>
          )}

          {(subfolders.length > 0 || can.edit(role)) && (
            <div className="tiles">
              {subfolders.map((f) => (
                <Link key={f.id} href={`/app/p/${projectId}/f/${f.id}`} className={`tile c-${f.color}`} style={{ minHeight: 110 }}>
                  {f.restricted && <span className="tile-lock">Restricted</span>}
                  <span className="label">Folder</span>
                  <div><div className="tile-num" style={{ fontSize: 20 }}>{f.name}</div><span className="label">{f._count.items} items</span></div>
                </Link>
              ))}
              {can.edit(role) && <NewFolder projectId={projectId} parentId={folderId} />}
            </div>
          )}

          <div className="card"><ItemTable items={items} /></div>
        </div>

        <aside className="stack">
          <div className="card pad stack-sm">
            <span className="label">Who can see this folder</span>
            <div className="big-num" style={{ fontSize: 44 }}>{whoCanSee.length}<span className="faint" style={{ fontSize: 20 }}> / {members.length}</span></div>
            <div className="stack-sm" style={{ gap: 6 }}>
              {whoCanSee.map((m) => (
                <div key={m.id} className="between">
                  <span>{m.user.name}{m.userId === user.id ? " (you)" : ""}</span>
                  <span className="label">{m.user.memberships[0]?.department ?? "—"}</span>
                </div>
              ))}
            </div>
            {folder.restricted && <p className="label" style={{ margin: 0 }}>Hidden from everyone else on the project: sidebar, search and AI answers. Workspace admins included.</p>}
          </div>

          {mayManageAccess && (
            <form action={updateFolderAccess} className="card pad stack-sm">
              <input type="hidden" name="folderId" value={folderId} />
              <span className="h3">Access</span>
              <label className="row"><input type="checkbox" name="restricted" defaultChecked={folder.restricted} /> Restrict this folder</label>
              <label className="field"><span>Sensitivity</span>
                <select className="select" name="sensitivity" defaultValue={folder.sensitivity}>
                  <option value="INTERNAL">Internal</option><option value="CONFIDENTIAL">Confidential</option><option value="RESTRICTED">Restricted</option>
                </select>
              </label>
              <span className="label">Allow departments</span>
              <div className="row-wrap">
                {DEPARTMENTS.map((d) => (
                  <label key={d} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="departments" value={d} defaultChecked={allowedDepts.has(d)} /> {d}</label>
                ))}
              </div>
              <span className="label">Allow people</span>
              <div className="stack-sm" style={{ gap: 4 }}>
                {members.filter((m) => m.userId !== folder.createdById).map((m) => (
                  <label key={m.id} className="row"><input type="checkbox" name="userIds" value={m.userId} defaultChecked={allowedUsers.has(m.userId)} /> {m.user.name} <span className="label">{m.role.toLowerCase()}</span></label>
                ))}
              </div>
              <span className="label">{folder.createdBy.name} created this folder and always has access.</span>
              <button className="btn" style={{ justifySelf: "start" }}>Save access</button>
            </form>
          )}

          {can.manage(role) && (
            <form action={deleteFolder} className="card pad between">
              <input type="hidden" name="folderId" value={folderId} />
              <span className="label">Delete folder and everything in it</span>
              <button className="btn btn-danger">Delete</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
