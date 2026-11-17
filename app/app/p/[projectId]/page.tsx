import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { can, projectRole, visibleFolderIds } from "@/lib/access";
import { projectAncestors } from "@/lib/queries";
import { Crumbs, Flash, ItemTable } from "@/components/ui";
import { NewFolder } from "@/components/NewFolder";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const { user, workspace } = await requireMember();
  const v = { userId: user.id, workspaceId: workspace.id };
  const role = await projectRole(v, projectId);
  if (!role) notFound();

  const [project, visible, ancestors] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, include: { children: { orderBy: { createdAt: "asc" } }, members: true } }),
    visibleFolderIds(v, projectId),
    projectAncestors(projectId),
  ]);
  if (!project) notFound();

  const folders = await db.folder.findMany({ where: { projectId, parentId: null, id: { in: [...visible] } }, include: { _count: { select: { items: true, children: true } } }, orderBy: { createdAt: "asc" } });
  const hiddenCount = await db.folder.count({ where: { projectId, parentId: null } }) - folders.length;
  const recent = await db.item.findMany({ where: { folderId: { in: [...visible] } }, include: { owner: true, folder: true }, orderBy: { createdAt: "desc" }, take: 8 });
  const itemTotal = await db.item.count({ where: { folderId: { in: [...visible] } } });

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="stack-sm">
        <Crumbs parts={[{ label: workspace.name }, ...ancestors.map((a, i) => (i === ancestors.length - 1 ? { label: a.name } : { label: a.name, href: `/app/p/${a.id}` }))]} />
        <div className="between" style={{ alignItems: "end" }}>
          <div className="stack-sm">
            <h1 className="h1">{project.name}</h1>
            {project.description && <p className="muted" style={{ margin: 0 }}>{project.description}</p>}
          </div>
          <div className="row">
            <span className="pill pill-dark">You · {role.toLowerCase()}</span>
            <Link className="btn btn-ghost" href={`/app/p/${projectId}/team`}>Team · {project.members.length}</Link>
            <Link className="btn btn-ghost" href={`/app/ask?project=${projectId}`}>Ask this project</Link>
          </div>
        </div>
      </div>
      <Flash error={error} />

      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          ["Folders you can see", folders.length, hiddenCount > 0 ? `${hiddenCount} restricted, hidden` : "none hidden"],
          ["Items", itemTotal, "files, docs and links"],
          ["Team", project.members.length, "direct members"],
          ["Sub-projects", project.children.length, project.children.length ? "nested below" : "add one below"],
        ].map(([l, n, d], i) => (
          <div key={String(l)} className="pad stack-sm" style={{ borderLeft: i ? "1px solid var(--line)" : 0 }}>
            <span className="label">{l}</span>
            <span className="big-num" style={{ fontSize: 44 }}>{n}</span>
            <span className="label">{d}</span>
          </div>
        ))}
      </div>

      <section className="stack-sm">
        <div className="between"><h2 className="h2">Folders</h2><span className="label">Click a folder to open it</span></div>
        <div className="tiles">
          {folders.map((f) => (
            <Link key={f.id} href={`/app/p/${projectId}/f/${f.id}`} className={`tile c-${f.color}`}>
              {f.restricted && <span className="tile-lock">Restricted</span>}
              <span className="label">{f.sensitivity.toLowerCase()}</span>
              <div className="stack-sm" style={{ gap: 4 }}>
                <span className="tile-num">{f.name}</span>
                <span className="label">{f._count.items} items{f._count.children ? ` · ${f._count.children} folders` : ""}</span>
              </div>
            </Link>
          ))}
          {can.edit(role) && <NewFolder projectId={projectId} />}
        </div>
      </section>

      <section className="stack-sm">
        <div className="between">
          <h2 className="h2">Sub-projects</h2>
          {can.edit(role) && <Link className="link-mono" href={`/app/projects/new?parent=${projectId}`}>+ Add sub-project</Link>}
        </div>
        {project.children.length ? (
          <div className="grid-3">
            {project.children.map((c, i) => (
              <Link key={c.id} href={`/app/p/${c.id}`} className="card pad stack-sm">
                <div className={`bar c-${["purple", "amber", "red", "blue", "green"][i % 5]}`} style={{ width: 40 }} />
                <span className="h3">{c.name}</span>
                {c.description && <span className="muted">{c.description}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="card empty">No sub-projects. Split big builds by app, surface or squad.</div>
        )}
      </section>

      <section className="stack-sm">
        <h2 className="h2">Recently added</h2>
        <div className="card"><ItemTable items={recent} showFolder /></div>
      </section>
    </div>
  );
}
