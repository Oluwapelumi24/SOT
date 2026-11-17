import { db } from "./db";

export async function projectAncestors(projectId: string) {
  const out: { id: string; name: string }[] = [];
  let cur = await db.project.findUnique({ where: { id: projectId }, select: { id: true, name: true, parentId: true } });
  while (cur && out.length < 8) {
    out.unshift({ id: cur.id, name: cur.name });
    cur = cur.parentId ? await db.project.findUnique({ where: { id: cur.parentId }, select: { id: true, name: true, parentId: true } }) : null;
  }
  return out;
}

export async function folderAncestors(folderId: string) {
  const out: { id: string; name: string }[] = [];
  let cur = await db.folder.findUnique({ where: { id: folderId }, select: { id: true, name: true, parentId: true } });
  while (cur && out.length < 12) {
    out.unshift({ id: cur.id, name: cur.name });
    cur = cur.parentId ? await db.folder.findUnique({ where: { id: cur.parentId }, select: { id: true, name: true, parentId: true } }) : null;
  }
  return out;
}
