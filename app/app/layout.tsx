import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { requireMember } from "@/lib/session";
import { visibleProjects } from "@/lib/access";
import { logout } from "../auth-actions";

type P = { id: string; name: string; parentId: string | null };

function Tree({ all, parentId, depth }: { all: P[]; parentId: string | null; depth: number }) {
  const ids = new Set(all.map((p) => p.id));
  const kids = all.filter((p) => (depth === 0 ? !p.parentId || !ids.has(p.parentId) : p.parentId === parentId));
  return (
    <>
      {kids.map((p, i) => (
        <div key={p.id}>
          <NavLink href={`/app/p/${p.id}`}>
            <span style={{ width: depth * 12 }} />
            <span className={`sq c-${["green", "purple", "amber", "red", "blue"][(i + depth) % 5]}`} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
          </NavLink>
          {depth < 3 && <Tree all={all} parentId={p.id} depth={depth + 1} />}
        </div>
      ))}
    </>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, membership } = await requireMember();
  const projects = await visibleProjects({ userId: user.id, workspaceId: workspace.id });
  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <>
      <header className="topbar">
        <div className="row" style={{ gap: 28 }}>
          <Link href="/app"><Logo /></Link>
          <nav>
            <NavLink href="/app/p" className="">Projects</NavLink>
            <NavLink href="/app/connectors" className="">Connectors</NavLink>
            <NavLink href="/app/ask" className="">Ask AI</NavLink>
            {isAdmin && <NavLink href="/app/audit" className="">Audit log</NavLink>}
          </nav>
        </div>
        <div className="row">
          <form action="/app/search"><input className="search" name="q" placeholder="Search docs, links, files…" /></form>
          <form action={logout}><button className="btn btn-light">Sign out</button></form>
        </div>
      </header>
      <div className="colorline"><i /><i /><i /><i /><i /></div>
      <div className="shell">
        <aside className="side">
          <div className="stack-sm" style={{ padding: "0 8px" }}>
            <span className="h3">{workspace.name}</span>
            <span className="label">{user.name} · {membership.role.toLowerCase()}{membership.department ? ` · ${membership.department}` : ""}</span>
          </div>
          <div className="side-title between"><span>Projects</span><Link href="/app/projects/new" className="u">+ New</Link></div>
          {projects.length ? <Tree all={projects} parentId={null} depth={0} /> : <span className="label" style={{ padding: 8 }}>No projects yet</span>}
          <div className="side-title">Workspace</div>
          <NavLink href="/app/connectors"><span className="sq c-purple" /> Connectors</NavLink>
          <NavLink href="/app/ask"><span className="sq c-green" /> Ask the project</NavLink>
          {isAdmin && <NavLink href="/app/audit"><span className="sq c-ink" /> Audit log</NavLink>}
        </aside>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
