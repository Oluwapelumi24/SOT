import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { visibleProjects } from "@/lib/access";

export default async function AppHome() {
  const { user, workspace } = await requireMember();
  const projects = await visibleProjects({ userId: user.id, workspaceId: workspace.id });
  redirect(projects.length ? `/app/p/${projects[0].id}` : "/app/projects/new");
}
