import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { can, folderAccess } from "@/lib/access";
import { folderAncestors, projectAncestors } from "@/lib/queries";
import { PROVIDERS } from "@/lib/catalog";
import { Crumbs, Flash, ago, bytes, kindOf } from "@/components/ui";
import { deleteItem, updateNote } from "@/app/app/actions";

export default async function ItemPage({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { itemId } = await params;
  const { error, ok } = await searchParams;
  const { user, workspace } = await requireMember();
  const item = await db.item.findUnique({ where: { id: itemId }, include: { owner: true, folder: true } });
  if (!item) notFound();
  const role = await folderAccess({ userId: user.id, workspaceId: workspace.id }, item.folderId);
  if (!role) notFound();
  const [pAnc, fAnc] = await Promise.all([projectAncestors(item.folder.projectId), folderAncestors(item.folderId)]);
  const k = kindOf(item);
  const editable = can.edit(role) || item.ownerId === user.id;
  const isImage = item.type === "FILE" && item.mimeType?.startsWith("image/");
  const isPdf = item.type === "FILE" && item.mimeType?.includes("pdf");

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stack-sm">
        <Crumbs parts={[...pAnc.map((a) => ({ label: a.name, href: `/app/p/${a.id}` })), ...fAnc.map((a) => ({ label: a.name, href: `/app/p/${item.folder.projectId}/f/${a.id}` })), { label: item.title }]} />
        <div className="row-wrap"><span className="pill"><span className={`sq c-${k.color}`} /> {k.label}</span><span className="pill">{item.folder.sensitivity.toLowerCase()}</span><span className="label">Added by {item.owner.name} · {ago(item.createdAt)}</span></div>
      </div>
      <Flash error={error} ok={ok} />

      {item.type === "NOTE" && (
        editable ? (
          <form action={updateNote} className="card pad-lg stack">
            <input type="hidden" name="itemId" value={item.id} />
            <input className="input" name="title" defaultValue={item.title} style={{ fontSize: 26, height: 48, border: 0, padding: 0, letterSpacing: "-0.02em" }} />
            <hr className="rule" />
            <textarea className="textarea" name="content" defaultValue={item.content ?? ""} style={{ minHeight: 360, border: 0, padding: 0, fontSize: 15 }} />
            <div className="row"><button className="btn">Save</button><span className="label">Last edited {ago(item.updatedAt)}</span></div>
          </form>
        ) : (
          <div className="card pad-lg stack"><h1 className="h1">{item.title}</h1><div className="answer">{item.content}</div></div>
        )
      )}

      {item.type === "LINK" && (
        <div className="card pad-lg stack">
          <h1 className="h1">{item.title}</h1>
          {item.content && <p className="muted" style={{ margin: 0 }}>{item.content}</p>}
          <div className={`c-${k.color}`} style={{ background: "var(--c)", color: "#fff", borderRadius: 6, padding: 20 }}>
            <div className="label" style={{ color: "rgba(255,255,255,.75)" }}>{PROVIDERS[item.provider ?? ""]?.name ?? "Web link"} · {PROVIDERS[item.provider ?? ""]?.capability ?? "Link"}</div>
            <div className="mono" style={{ marginTop: 8, wordBreak: "break-all" }}>{item.url}</div>
          </div>
          <div className="row"><a className="btn" href={item.url ?? "#"} target="_blank" rel="noopener noreferrer">Open in {PROVIDERS[item.provider ?? ""]?.name ?? "browser"} ↗</a><span className="label">Live previews arrive when this connector is set up with API keys.</span></div>
        </div>
      )}

      {item.type === "FILE" && (
        <div className="card pad-lg stack">
          <div className="between"><h1 className="h1">{item.title}</h1><a className="btn" href={`/api/files/${item.id}?download=1`}>Download · {bytes(item.size)}</a></div>
          {isImage && <img src={`/api/files/${item.id}`} alt={item.title} style={{ maxWidth: "100%", borderRadius: 6, border: "1px solid var(--line)" }} />}
          {isPdf && <iframe src={`/api/files/${item.id}`} title={item.title} style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 6 }} />}
          {!isImage && !isPdf && <div className="empty">No preview for this file type. Download it to open.</div>}
        </div>
      )}

      <div className="row">
        <Link className="link-mono" href={`/app/p/${item.folder.projectId}/f/${item.folderId}`}>← Back to {item.folder.name}</Link>
        {editable && (
          <form action={deleteItem} style={{ marginLeft: "auto" }}>
            <input type="hidden" name="itemId" value={item.id} />
            <button className="btn btn-danger">Delete</button>
          </form>
        )}
      </div>
    </div>
  );
}
