import Link from "next/link";
import { requireMember } from "@/lib/session";
import { visibleProjects } from "@/lib/access";
import { aiEnabled, askProject } from "@/lib/ai";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string; project?: string }> }) {
  const { q, project } = await searchParams;
  const { user, workspace } = await requireMember();
  const v = { userId: user.id, workspaceId: workspace.id };
  const projects = await visibleProjects(v);
  let result: Awaited<ReturnType<typeof askProject>> | null = null;
  let failure = "";
  if (q && aiEnabled()) {
    try { result = await askProject(v, q, project || undefined); }
    catch (e) { failure = e instanceof Error ? e.message : "The AI request failed."; }
  }

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 860 }}>
      <div className="stack-sm">
        <span className="label">Ask the project</span>
        <h1 className="h1">Ask anything about the build.</h1>
        <p className="muted" style={{ margin: 0 }}>Answers come only from folders you're allowed to see, with links to the source.</p>
      </div>
      {!aiEnabled() && (
        <div className="card pad stack-sm" style={{ borderColor: "var(--amber)" }}>
          <span className="h3">AI isn't switched on yet</span>
          <span className="muted">Add <code className="mono">ANTHROPIC_API_KEY</code> to the <code className="mono">.env</code> file and restart the app. This is where a workspace's own key would go in the pay-for-AI model.</span>
        </div>
      )}
      <form className="card pad stack-sm">
        <div className="row">
          <select className="select" name="project" defaultValue={project ?? ""} style={{ width: 220 }}>
            <option value="">All my projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" name="q" defaultValue={q} placeholder="What did we decide about payment retries?" required />
          <button className="btn" style={{ height: 36 }}>Ask</button>
        </div>
      </form>
      {failure && <div className="flash">{failure}</div>}
      {result && (
        <div className="card">
          <div className="pad stack-sm">
            <span className="label">● Answer · claude-opus-5-5</span>
            <div className="answer">{result.answer}</div>
          </div>
          {result.sources.length > 0 && (
            <>
              <hr className="rule" />
              <div className="pad stack-sm">
                <span className="label">Sources</span>
                {result.sources.map((s) => (
                  <Link key={s.id} href={`/app/i/${s.id}`} className="row"><span className="mono faint">[{s.n}]</span> {s.title} <span className="label">{s.project} / {s.folder}</span></Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
