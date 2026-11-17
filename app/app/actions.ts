"use server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { can, folderAccess, projectRole } from "@/lib/access";
import { audit } from "@/lib/audit";
import { COLORS, DEPARTMENTS, PROVIDERS, detectProvider } from "@/lib/catalog";
import { createProjectWithStarterFolders } from "@/lib/projects";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_UPLOAD = 20 * 1024 * 1024;
const PROJECT_ROLES = ["OWNER", "EDITOR", "CONTRIBUTOR", "VIEWER"];

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (to: string, msg: string): never => redirect(`${to}${to.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

async function ctx() {
  const { user, membership, workspace } = await requireMember();
  return { user, membership, workspace, v: { userId: user.id, workspaceId: workspace.id } };
}

/* ---------------- projects ---------------- */

export async function createProject(form: FormData) {
  const { user, membership, workspace, v } = await ctx();
  const name = s(form, "name");
  const parentId = s(form, "parentId") || null;
  if (!name) back("/app/projects/new", "Name the project");
  if (parentId) {
    if (!can.edit(await projectRole(v, parentId))) back("/app/projects/new", "You need Editor access on the parent project");
  } else if (membership.role === "GUEST") back("/app/projects/new", "Guests can't create projects");
  const p = await createProjectWithStarterFolders({ workspaceId: workspace.id, userId: user.id, userType: user.userType, name, description: s(form, "description"), parentId });
  redirect(`/app/p/${p.id}`);
}

/* ---------------- team ---------------- */

export async function inviteMember(form: FormData) {
  const { user, workspace, v } = await ctx();
  const projectId = s(form, "projectId");
  const to = `/app/p/${projectId}/team`;
  if (!can.manage(await projectRole(v, projectId))) back(to, "Only project owners can invite people");
  const email = s(form, "email").toLowerCase();
  const role = s(form, "role");
  const department = s(form, "department") || null;
  if (!/^\S+@\S+\.\S+$/.test(email)) back(to, "Enter a valid email");
  if (!PROJECT_ROLES.includes(role)) back(to, "Pick a role");
  if (department && !DEPARTMENTS.includes(department)) back(to, "Pick a department");

  const invitee = (await db.user.findUnique({ where: { email } })) ?? (await db.user.create({ data: { email, name: s(form, "name") || email.split("@")[0] } }));
  await db.membership.upsert({
    where: { userId_workspaceId: { userId: invitee.id, workspaceId: workspace.id } },
    create: { userId: invitee.id, workspaceId: workspace.id, role: s(form, "guest") ? "GUEST" : "MEMBER", department },
    update: department ? { department } : {},
  });
  await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: invitee.id } },
    create: { projectId, userId: invitee.id, role },
    update: { role },
  });
  await audit(workspace.id, user.id, `invited as ${role.toLowerCase()}`, email);
  revalidatePath(to);
  redirect(`${to}?ok=${encodeURIComponent(`${email} added as ${role.toLowerCase()}`)}`);
}

export async function updateMember(form: FormData) {
  const { user, workspace, v } = await ctx();
  const projectId = s(form, "projectId");
  const userId = s(form, "userId");
  const to = `/app/p/${projectId}/team`;
  if (!can.manage(await projectRole(v, projectId))) back(to, "Only project owners can change roles");
  if (userId === user.id) back(to, "You can't change your own role");
  const role = s(form, "role");
  const department = s(form, "department");
  if (role === "REMOVE") {
    await db.projectMember.deleteMany({ where: { projectId, userId } });
    await audit(workspace.id, user.id, "removed from project", userId);
  } else if (PROJECT_ROLES.includes(role)) {
    await db.projectMember.upsert({ where: { projectId_userId: { projectId, userId } }, create: { projectId, userId, role }, update: { role } });
    await audit(workspace.id, user.id, `set role ${role.toLowerCase()}`, userId);
  }
  if (department && DEPARTMENTS.includes(department)) {
    await db.membership.updateMany({ where: { userId, workspaceId: workspace.id }, data: { department } });
  }
  revalidatePath(to);
  redirect(to);
}

/* ---------------- folders ---------------- */

export async function createFolder(form: FormData) {
  const { user, workspace, v } = await ctx();
  const projectId = s(form, "projectId");
  const parentId = s(form, "parentId") || null;
  const to = parentId ? `/app/p/${projectId}/f/${parentId}` : `/app/p/${projectId}`;
  const role = parentId ? await folderAccess(v, parentId) : await projectRole(v, projectId);
  if (!can.edit(role)) back(to, "You need Editor access to add folders");
  const name = s(form, "name");
  if (!name) back(to, "Name the folder");
  const color = (COLORS as readonly string[]).includes(s(form, "color")) ? s(form, "color") : "green";
  const restricted = !!form.get("restricted");
  const f = await db.folder.create({
    data: { projectId, parentId, name, color, restricted, sensitivity: restricted ? "RESTRICTED" : "INTERNAL", createdById: user.id },
  });
  await audit(workspace.id, user.id, restricted ? "created restricted folder" : "created folder", name);
  redirect(`/app/p/${projectId}/f/${f.id}`);
}

export async function updateFolderAccess(form: FormData) {
  const { user, workspace, v } = await ctx();
  const folderId = s(form, "folderId");
  const folder = await db.folder.findUnique({ where: { id: folderId } });
  if (!folder) redirect("/app");
  const to = `/app/p/${folder.projectId}/f/${folderId}`;
  const role = await folderAccess(v, folderId);
  if (!(can.manage(role) || (role && folder.createdById === user.id))) back(to, "Only the folder creator or a project owner can change access");

  const restricted = !!form.get("restricted");
  const sensitivity = ["INTERNAL", "CONFIDENTIAL", "RESTRICTED"].includes(s(form, "sensitivity")) ? s(form, "sensitivity") : "INTERNAL";
  const departments = form.getAll("departments").map(String).filter((d) => DEPARTMENTS.includes(d));
  const userIds = form.getAll("userIds").map(String);
  // Only people who are on the project can be put on the allow list.
  const valid = await db.projectMember.findMany({ where: { projectId: folder.projectId, userId: { in: userIds } }, select: { userId: true } });

  await db.$transaction([
    db.folder.update({ where: { id: folderId }, data: { restricted, sensitivity: restricted && sensitivity === "INTERNAL" ? "RESTRICTED" : sensitivity } }),
    db.folderAccess.deleteMany({ where: { folderId } }),
    db.folderAccess.createMany({
      data: [
        ...departments.map((department) => ({ folderId, department })),
        ...valid.map((x) => ({ folderId, userId: x.userId })),
      ],
    }),
  ]);
  await audit(workspace.id, user.id, restricted ? `restricted folder to ${[...departments, `${valid.length} people`].join(", ")}` : "opened folder to project", folder.name);
  revalidatePath(to);
  redirect(`${to}?ok=Access+saved`);
}

export async function deleteFolder(form: FormData) {
  const { user, workspace, v } = await ctx();
  const folder = await db.folder.findUnique({ where: { id: s(form, "folderId") } });
  if (!folder) redirect("/app");
  if (!can.manage(await folderAccess(v, folder.id))) back(`/app/p/${folder.projectId}/f/${folder.id}`, "Only project owners can delete folders");
  await db.folder.delete({ where: { id: folder.id } });
  await audit(workspace.id, user.id, "deleted folder", folder.name);
  redirect(`/app/p/${folder.projectId}`);
}

/* ---------------- items ---------------- */

async function folderForUpload(folderId: string) {
  const c = await ctx();
  const folder = await db.folder.findUnique({ where: { id: folderId } });
  if (!folder) redirect("/app");
  const to = `/app/p/${folder.projectId}/f/${folderId}`;
  if (!can.upload(await folderAccess(c.v, folderId))) back(to, "You need Contributor access to add items here");
  return { ...c, folder, to };
}

export async function addLink(form: FormData) {
  const { user, workspace, folder, to } = await folderForUpload(s(form, "folderId"));
  let url = s(form, "url");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try { new URL(url); } catch { back(to, "That doesn't look like a link"); }
  const provider = detectProvider(url);
  const fallback = `${PROVIDERS[provider]?.name ?? new URL(url).hostname} · ${decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "link").replace(/[-_]/g, " ")}`;
  await db.item.create({ data: { folderId: folder.id, type: "LINK", url, provider, title: s(form, "title") || fallback, content: s(form, "note") || null, ownerId: user.id } });
  await audit(workspace.id, user.id, `linked ${PROVIDERS[provider]?.name ?? "web page"}`, folder.name);
  revalidatePath(to);
  redirect(to);
}

export async function addNote(form: FormData) {
  const { user, workspace, folder, to } = await folderForUpload(s(form, "folderId"));
  const title = s(form, "title");
  if (!title) back(to, "Give the note a title");
  const item = await db.item.create({ data: { folderId: folder.id, type: "NOTE", title, content: String(form.get("content") ?? ""), ownerId: user.id } });
  await audit(workspace.id, user.id, "wrote note", title);
  redirect(`/app/i/${item.id}`);
}

export async function uploadFile(form: FormData) {
  const { user, workspace, folder, to } = await folderForUpload(s(form, "folderId"));
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) back(to, "Choose a file");
  const f = file as File;
  if (f.size > MAX_UPLOAD) back(to, "Files can be up to 20 MB");
  const safe = f.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const stored = `${randomUUID()}-${safe}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, stored), Buffer.from(await f.arrayBuffer()));
  await db.item.create({ data: { folderId: folder.id, type: "FILE", title: s(form, "title") || f.name, filePath: stored, mimeType: f.type || "application/octet-stream", size: f.size, ownerId: user.id } });
  await audit(workspace.id, user.id, "uploaded file", f.name);
  revalidatePath(to);
  redirect(to);
}

async function itemForEdit(itemId: string) {
  const c = await ctx();
  const item = await db.item.findUnique({ where: { id: itemId }, include: { folder: true } });
  if (!item) redirect("/app");
  const role = await folderAccess(c.v, item.folderId);
  if (!(can.edit(role) || (role && item.ownerId === c.user.id))) back(`/app/i/${itemId}`, "Only the owner or an editor can change this");
  return { ...c, item };
}

export async function updateNote(form: FormData) {
  const { item } = await itemForEdit(s(form, "itemId"));
  await db.item.update({ where: { id: item.id }, data: { title: s(form, "title") || item.title, content: String(form.get("content") ?? "") } });
  revalidatePath(`/app/i/${item.id}`);
  redirect(`/app/i/${item.id}?ok=Saved`);
}

export async function deleteItem(form: FormData) {
  const { user, workspace, item } = await itemForEdit(s(form, "itemId"));
  await db.item.delete({ where: { id: item.id } });
  if (item.filePath) await unlink(path.join(UPLOAD_DIR, item.filePath)).catch(() => {});
  await audit(workspace.id, user.id, "deleted item", item.title);
  redirect(`/app/p/${item.folder.projectId}/f/${item.folderId}`);
}

/* ---------------- connectors ---------------- */

export async function toggleConnection(form: FormData) {
  const { user, membership, workspace } = await ctx();
  if (!["OWNER", "ADMIN"].includes(membership.role)) back("/app/connectors", "Only workspace owners and admins manage connectors");
  const provider = s(form, "provider");
  if (!PROVIDERS[provider]) back("/app/connectors", "Unknown connector");
  const existing = await db.connection.findUnique({ where: { workspaceId_provider: { workspaceId: workspace.id, provider } } });
  if (existing) await db.connection.delete({ where: { id: existing.id } });
  else await db.connection.create({ data: { workspaceId: workspace.id, provider } });
  await audit(workspace.id, user.id, existing ? "disconnected" : "connected", PROVIDERS[provider].name);
  revalidatePath("/app/connectors");
  redirect("/app/connectors");
}
