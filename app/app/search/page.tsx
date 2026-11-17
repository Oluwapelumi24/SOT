import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { visibleFolderIds, visibleProjects } from "@/lib/access";
import { ItemTable } from "@/components/ui";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { user, workspace } = await requireMember();
  const v = { userId: user.id, workspaceId: workspace.id };
  const projects = await visibleProjects(v);
  const folderIds: string[] = [];
  for (const p of projects) folderIds.push(...(await visibleFolderIds(v, p.id)));
  const term = q.trim();
  const [items, folders] = term
    ? await Promise.all([
        db.item.findMany({ where: { folderId: { in: folderIds }, OR: [{ title: { contains: term } }, { content: { contains: term } }, { url: { contains: term } }] }, include: { owner: true, folder: true }, take: 50, orderBy: { updatedAt: "desc" } }),
        db.folder.findMany({ where: { id: { in: folderIds }, name: { contains: term } }, take: 20 }),
      ])
    : [[], []];
  const matchedProjects = term ? projects.filter((p) => p.name.toLowerCase().includes(term.toLowerCase())) : [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <span className="label">Search · only what you can access</span>
      <form><input className="input" name="q" defaultValue={q} placeholder="Search titles, notes and links" style={{ height: 44, fontSize: 18 }} autoFocus /></form>
      {term && (
        <>
          <span className="label">{items.length + folders.length + matchedProjects.length} results for “{term}”</span>
          {(matchedProjects.length > 0 || folders.length > 0) && (
            <div className="row-wrap">
              {matchedProjects.map((p) => <Link key={p.id} className="pill pill-dark" href={`/app/p/${p.id}`}>Project · {p.name}</Link>)}
              {folders.map((f) => <Link key={f.id} className="pill" href={`/app/p/${f.projectId}/f/${f.id}`}><span className={`sq c-${f.color}`} /> {f.name}</Link>)}
            </div>
          )}
          <div className="card"><ItemTable items={items} showFolder /></div>
        </>
      )}
    </div>
  );
}
