"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { USER_TYPES } from "@/lib/catalog";
import { createProjectWithStarterFolders } from "@/lib/projects";
import { audit } from "@/lib/audit";

export async function setUserType(form: FormData) {
  const user = await requireUser();
  const type = String(form.get("userType") || "");
  if (!USER_TYPES.some((t) => t.id === type)) redirect("/onboarding?error=Pick+one+option");
  await db.user.update({ where: { id: user.id }, data: { userType: type } });
  redirect("/onboarding");
}

export async function createWorkspace(form: FormData) {
  const user = await requireUser();
  const name = String(form.get("name") || "").trim();
  const department = String(form.get("department") || "").trim() || null;
  if (!name) redirect("/onboarding?error=Name+your+workspace");
  const ws = await db.workspace.create({ data: { name, members: { create: { userId: user.id, role: "OWNER", department } } } });
  await audit(ws.id, user.id, "created workspace", name);
  redirect("/onboarding");
}

export async function createFirstProject(form: FormData) {
  const user = await requireUser();
  const m = await db.membership.findFirst({ where: { userId: user.id } });
  if (!m) redirect("/onboarding");
  const name = String(form.get("name") || "").trim();
  if (!name) redirect("/onboarding?error=Name+your+project");
  const p = await createProjectWithStarterFolders({ workspaceId: m.workspaceId, userId: user.id, userType: user.userType, name, description: String(form.get("description") || "") });
  redirect(`/app/p/${p.id}/team?welcome=1`);
}
