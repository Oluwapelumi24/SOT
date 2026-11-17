import Link from "next/link";
import { PROVIDERS } from "@/lib/catalog";

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <div className="flash">{error}</div>;
  if (ok) return <div className="flash flash-ok">{ok}</div>;
  return null;
}

export function kindOf(item: { type: string; provider: string | null; mimeType?: string | null }) {
  if (item.type === "LINK") {
    const p = item.provider ? PROVIDERS[item.provider] : undefined;
    return { label: p?.name ?? "Web link", color: p?.color ?? "web" };
  }
  if (item.type === "NOTE") return { label: "SOT doc", color: "green" };
  const m = item.mimeType || "";
  if (m.includes("pdf")) return { label: "PDF", color: "red" };
  if (m.startsWith("image/")) return { label: "Image", color: "purple" };
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv")) return { label: "Sheet", color: "green" };
  if (m.includes("word") || m.includes("document")) return { label: "Doc file", color: "blue" };
  return { label: "File", color: "amber" };
}

export const ago = (d: Date) => {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const bytes = (n?: number | null) => (!n ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

type Row = { id: string; title: string; type: string; provider: string | null; mimeType: string | null; size: number | null; createdAt: Date; owner: { name: string }; folder?: { name: string } };

export function ItemTable({ items, showFolder = false }: { items: Row[]; showFolder?: boolean }) {
  if (!items.length) return <div className="empty">Nothing here yet. Upload a file, write a note or paste a link.</div>;
  return (
    <table className="trace">
      <thead><tr><th style={{ width: 120 }}>Source</th><th>Title</th>{showFolder && <th>Folder</th>}<th>Owner</th><th style={{ textAlign: "right" }}>Added</th></tr></thead>
      <tbody>
        {items.map((it) => {
          const k = kindOf(it);
          return (
            <tr key={it.id} className="clickable">
              <td><span className="row mono" style={{ gap: 8 }}><span className={`sq c-${k.color}`} />{k.label}</span></td>
              <td><Link href={`/app/i/${it.id}`} style={{ fontWeight: 500 }}>{it.title}</Link>{it.size ? <span className="label"> · {bytes(it.size)}</span> : null}</td>
              {showFolder && <td className="label">{it.folder?.name}</td>}
              <td className="muted">{it.owner.name}</td>
              <td className="label" style={{ textAlign: "right" }}>{ago(it.createdAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Crumbs({ parts }: { parts: { href?: string; label: string }[] }) {
  return (
    <div className="crumbs">
      {parts.map((p, i) => (
        <span key={i} className="row" style={{ gap: 6 }}>
          {i > 0 && <span>/</span>}
          {p.href ? <Link href={p.href}>{p.label}</Link> : <span style={{ color: "var(--ink)" }}>{p.label}</span>}
        </span>
      ))}
    </div>
  );
}
