import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { createProject } from "../../actions";
import { Flash } from "@/components/ui";
import { USER_TYPES } from "@/lib/catalog";

export default async function NewProject({ searchParams }: { searchParams: Promise<{ parent?: string; error?: string }> }) {
  const { parent, error } = await searchParams;
  const { user, workspace } = await requireMember();
  const parentProject = parent ? await db.project.findFirst({ where: { id: parent, workspaceId: workspace.id } }) : null;
  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <span className="label">{parentProject ? `Sub-project of ${parentProject.name}` : "New project"}</span>
      <h1 className="h1">{parentProject ? "Add a sub-project." : "Start a project."}</h1>
      <Flash error={error} />
      <form action={createProject} className="card pad-lg stack">
        {parentProject && <input type="hidden" name="parentId" value={parentProject.id} />}
        <label className="field"><span>Name</span><input className="input" name="name" required placeholder={parentProject ? "Mobile app" : "Checkout revamp"} /></label>
        <label className="field"><span>Description · optional</span><input className="input" name="description" /></label>
        <p className="label" style={{ margin: 0 }}>Starter folders: {USER_TYPES.find((t) => t.id === user.userType)?.folders.join(", ")}. Team members of the parent project keep their access.</p>
        <button className="btn" style={{ justifySelf: "start" }}>Create</button>
      </form>
    </div>
  );
}
