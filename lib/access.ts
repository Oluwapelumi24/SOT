import { db } from "./db";
import { canSeeFolder, effectiveProjectRole, type ProjectRole, type WorkspaceRole } from "./access-core";

export { can } from "./access-core";
export type { ProjectRole } from "./access-core";

type Viewer = { userId: string; workspaceId: string };

async function membershipOf(v: Viewer) {
  return db.membership.findUnique({ where: { userId_workspaceId: { userId: v.userId, workspaceId: v.workspaceId } } });
}

async function projectChain(projectId: string) {
  const chain = [];
  let id: string | null = projectId;
  for (let i = 0; id && i < 8; i++) {
    const p: { id: string; parentId: string | null; workspaceId: string; members: { userId: string; role: string }[] } | null =
      await db.project.findUnique({ where: { id }, select: { id: true, parentId: true, workspaceId: true, members: true } });
    if (!p) break;
    chain.push(p);
    id = p.parentId;
  }
  return chain;
}

export async function projectRole(v: Viewer, projectId: string): Promise<ProjectRole | null> {
  const [m, chain] = await Promise.all([membershipOf(v), projectChain(projectId)]);
  if (!m || !chain.length || chain[0].workspaceId !== v.workspaceId) return null;
  return effectiveProjectRole(v.userId, m.role as WorkspaceRole, chain);
}

async function folderChain(folderId: string) {
  const chain = [];
  let id: string | null = folderId;
  for (let i = 0; id && i < 12; i++) {
    const f: { id: string; parentId: string | null; projectId: string; restricted: boolean; createdById: string; access: { userId: string | null; department: string | null }[] } | null =
      await db.folder.findUnique({ where: { id }, select: { id: true, parentId: true, projectId: true, restricted: true, createdById: true, access: { select: { userId: true, department: true } } } });
    if (!f) break;
    chain.push(f);
    id = f.parentId;
  }
  return chain;
}

/** Returns the folder's project role if the viewer may open it, else null. */
export async function folderAccess(v: Viewer, folderId: string) {
  const chain = await folderChain(folderId);
  if (!chain.length) return null;
  const [role, m] = await Promise.all([projectRole(v, chain[0].projectId), membershipOf(v)]);
  if (!role || !m) return null;
  return canSeeFolder({ id: v.userId, department: m.department }, role, chain) ? role : null;
}

/** All folder ids in a project the viewer may open. */
export async function visibleFolderIds(v: Viewer, projectId: string) {
  const [role, m, folders] = await Promise.all([
    projectRole(v, projectId),
    membershipOf(v),
    db.folder.findMany({ where: { projectId }, select: { id: true, parentId: true, restricted: true, createdById: true, access: { select: { userId: true, department: true } } } }),
  ]);
  if (!role || !m) return new Set<string>();
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out = new Set<string>();
  for (const f of folders) {
    const chain = [];
    let cur: typeof f | undefined = f;
    while (cur) { chain.push(cur); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
    if (canSeeFolder({ id: v.userId, department: m.department }, role, chain)) out.add(f.id);
  }
  return out;
}

/** Projects in the workspace the viewer has any role on. */
export async function visibleProjects(v: Viewer) {
  const all = await db.project.findMany({ where: { workspaceId: v.workspaceId }, orderBy: { createdAt: "asc" } });
  const roles = await Promise.all(all.map((p) => projectRole(v, p.id)));
  return all.filter((_, i) => roles[i]);
}
