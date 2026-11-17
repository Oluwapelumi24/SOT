import { db } from "./db";
import { USER_TYPES, COLORS } from "./catalog";
import { audit } from "./audit";

/** Creates a project (or sub-project) with starter folders and the creator as owner. */
export async function createProjectWithStarterFolders(opts: { workspaceId: string; userId: string; userType: string | null; name: string; description?: string | null; parentId?: string | null }) {
  const starter = USER_TYPES.find((t) => t.id === opts.userType)?.folders ?? ["Docs", "Ideas", "Links"];
  const project = await db.project.create({
    data: {
      workspaceId: opts.workspaceId,
      name: opts.name,
      description: opts.description || null,
      parentId: opts.parentId || null,
      createdById: opts.userId,
      members: { create: { userId: opts.userId, role: "OWNER" } },
      folders: { create: starter.map((f, i) => ({ name: f, color: COLORS[i % 5], createdById: opts.userId })) },
    },
  });
  await audit(opts.workspaceId, opts.userId, opts.parentId ? "created sub-project" : "created project", opts.name);
  return project;
}

