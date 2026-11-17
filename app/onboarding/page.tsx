import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { visibleProjects } from "@/lib/access";
import { USER_TYPES, DEPARTMENTS } from "@/lib/catalog";
import { AuthArt } from "@/components/AuthArt";
import { setUserType, createWorkspace, createFirstProject } from "./actions";

function Steps({ n }: { n: number }) {
  return <div className="steps">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</div>;
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser();
  const membership = await db.membership.findFirst({ where: { userId: user.id }, include: { workspace: true } });

  let step: "role" | "workspace" | "project";
  if (!user.userType) step = "role";
  else if (!membership) step = "workspace";
  else {
    const projects = await visibleProjects({ userId: user.id, workspaceId: membership.workspaceId });
    if (projects.length) redirect("/app");
    step = "project";
  }

  const art = {
    role: ["Hi " + user.name.split(" ")[0] + ".", "Tell us what you do. SOT sets up folders and connectors that fit your work."],
    workspace: ["Your company lives here.", "A workspace holds every project, team and connector. Invite people later."],
    project: ["Start with one build.", "Projects hold folders. Add sub-projects for each app, surface or squad."],
  }[step];

  return (
    <div className="auth">
      <AuthArt title={art[0]} sub={art[1]} />
      <div className="auth-form">
        {step === "role" && (
          <form action={setUserType} className="stack" style={{ maxWidth: 460 }}>
            <Steps n={2} />
            <div className="stack-sm"><span className="label">Step 2 of 4 · User type</span><h1 className="h1">What do you do?</h1></div>
            {error && <div className="flash">{error}</div>}
            <div className="choice">
              {USER_TYPES.map((t, i) => (
                <label key={t.id}>
                  <input type="radio" name="userType" value={t.id} defaultChecked={i === 0} />
                  <span className="stack" style={{ gap: 2 }}>
                    <span>{t.label}</span>
                    <span className="label">{t.folders.slice(0, 2).join(", ")}…</span>
                  </span>
                </label>
              ))}
            </div>
            <button className="btn" style={{ height: 38, justifyContent: "center" }}>Continue</button>
          </form>
        )}
        {step === "workspace" && (
          <form action={createWorkspace} className="stack">
            <Steps n={3} />
            <div className="stack-sm"><span className="label">Step 3 of 4 · Workspace</span><h1 className="h1">Name your workspace.</h1></div>
            {error && <div className="flash">{error}</div>}
            <label className="field"><span>Company or team name</span><input className="input" name="name" placeholder="Acme Inc." required /></label>
            <label className="field"><span>Your department · used for access rules</span>
              <select className="select" name="department" defaultValue="Product">{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
            </label>
            <button className="btn" style={{ height: 38, justifyContent: "center" }}>Create workspace</button>
          </form>
        )}
        {step === "project" && (
          <form action={createFirstProject} className="stack">
            <Steps n={4} />
            <div className="stack-sm"><span className="label">Step 4 of 4 · Project</span><h1 className="h1">Create your first project.</h1></div>
            {error && <div className="flash">{error}</div>}
            <label className="field"><span>Project name</span><input className="input" name="name" placeholder="Checkout revamp" required /></label>
            <label className="field"><span>One line on what it is · optional</span><input className="input" name="description" placeholder="Faster, safer checkout for web and mobile" /></label>
            <p className="label" style={{ margin: 0 }}>We'll add starter folders: {USER_TYPES.find((t) => t.id === user.userType)?.folders.join(", ")}.</p>
            <button className="btn" style={{ height: 38, justifyContent: "center" }}>Create project</button>
            <span className="label">Joined by invite? <Link className="u" href="/app">Go to your workspace</Link></span>
          </form>
        )}
      </div>
    </div>
  );
}
