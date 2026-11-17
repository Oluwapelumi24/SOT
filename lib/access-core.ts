// Pure permission rules. No database access here, so the rules are easy to test.

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
export type ProjectRole = "OWNER" | "EDITOR" | "CONTRIBUTOR" | "VIEWER";

const RANK: Record<ProjectRole, number> = { VIEWER: 1, CONTRIBUTOR: 2, EDITOR: 3, OWNER: 4 };

export type ProjectNode = {
  id: string;
  members: { userId: string; role: string }[];
};

/**
 * Effective role on a project. `chain` is the project followed by its ancestors
 * (nearest first). A direct role on the nearest project wins; otherwise the
 * nearest ancestor's role is inherited. Workspace owners/admins get OWNER,
 * except guests, who never inherit.
 */
export function effectiveProjectRole(
  userId: string,
  workspaceRole: WorkspaceRole | null,
  chain: ProjectNode[],
): ProjectRole | null {
  if (!workspaceRole) return null;
  const own = chain[0]?.members.find((m) => m.userId === userId);
  if (workspaceRole === "GUEST") return (own?.role as ProjectRole) ?? null;
  let best: ProjectRole | null = null;
  for (const p of chain) {
    const m = p.members.find((x) => x.userId === userId);
    if (m) { best = m.role as ProjectRole; break; }
  }
  if (workspaceRole === "OWNER" || workspaceRole === "ADMIN") return "OWNER";
  return best;
}

export type FolderNode = {
  id: string;
  restricted: boolean;
  createdById: string;
  access: { userId: string | null; department: string | null }[];
};

/**
 * Can this user open a folder? `chain` is the folder followed by its ancestors.
 * Every restricted folder on the way down must let the user in: they created it,
 * are on its allow list, or share a department on the list. Being a workspace
 * owner or admin does NOT bypass a restriction.
 */
export function canSeeFolder(
  user: { id: string; department: string | null },
  projectRole: ProjectRole | null,
  chain: FolderNode[],
): boolean {
  if (!projectRole) return false;
  for (const f of chain) {
    if (!f.restricted) continue;
    if (f.createdById === user.id) continue;
    const ok = f.access.some(
      (a) =>
        (a.userId && a.userId === user.id) ||
        (a.department && user.department && a.department.toLowerCase() === user.department.toLowerCase()),
    );
    if (!ok) return false;
  }
  return true;
}

export const can = {
  view: (r: ProjectRole | null) => !!r,
  upload: (r: ProjectRole | null) => !!r && RANK[r] >= RANK.CONTRIBUTOR,
  edit: (r: ProjectRole | null) => !!r && RANK[r] >= RANK.EDITOR,
  manage: (r: ProjectRole | null) => r === "OWNER",
};
