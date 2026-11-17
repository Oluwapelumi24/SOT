import Link from "next/link";
import { Logo } from "@/components/Logo";
import { currentUserId } from "@/lib/session";

const TRACE = [
  { tool: "Figma", c: "c-purple", label: "Checkout flow v4", start: 4, width: 18, meta: "design" },
  { tool: "Jira", c: "c-blue", label: "CHK-212 · retry payments", start: 26, width: 14, meta: "epic" },
  { tool: "GitHub", c: "c-ink", label: "PR #481 merged", start: 44, width: 10, meta: "code" },
  { tool: "PRD", c: "c-green", label: "Checkout revamp PRD", start: 8, width: 30, meta: "doc" },
  { tool: "Budget", c: "c-red", label: "Restricted · Finance", start: 60, width: 16, meta: "locked" },
  { tool: "Drive", c: "c-amber", label: "Vendor contract.pdf", start: 70, width: 12, meta: "file" },
];

const TOOLS = [
  { name: "Figma", c: "c-purple", what: "Design files" },
  { name: "Jira", c: "c-blue", what: "Issues & epics" },
  { name: "GitHub", c: "c-ink", what: "Repos & PRs" },
  { name: "Notion", c: "c-ink", what: "Pages" },
  { name: "Confluence", c: "c-blue", what: "Spaces" },
  { name: "Google Drive", c: "c-amber", what: "Docs & sheets" },
  { name: "Slack", c: "c-red", what: "Threads" },
  { name: "Claude AI", c: "c-green", what: "Ask & summarise" },
];

export default async function Landing() {
  const signedIn = !!(await currentUserId());
  const cta = signedIn ? "/app" : "/signup";

  return (
    <div className="dark" style={{ minHeight: "100vh" }}>
      <header className="m-nav">
        <Logo />
        <nav>
          <a href="#tools">Connectors</a>
          <a href="#access">Access</a>
          <a href="#flow">How it works</a>
          <Link href="/login">Sign in</Link>
        </nav>
        <Link className="btn btn-light" href={cta}>{signedIn ? "Open SOT" : "Start a workspace"}</Link>
      </header>

      <section className="hero">
        <div className="hero-bars" aria-hidden>
          {["c-green", "c-purple", "c-amber", "c-red", "c-blue"].map((c, i) => (
            <div key={c} className={`bar ${c}`} style={{ marginLeft: `${[22, 0, 14, 4, 30][i]}%`, animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="hero-copy stack">
          <h1 className="h-hero">Every doc, flow and decision, on record.</h1>
          <p className="muted" style={{ maxWidth: 420, margin: 0 }}>
            SOT is the documentation hub for product builds. Keep specs, designs, tickets and ideas in one place per project,
            and decide exactly who sees what.
          </p>
          <div className="row">
            <Link className="btn btn-light" href={cta}>Start a free workspace</Link>
            <a className="link-mono" href="#access">See how access works</a>
          </div>
        </div>

        <div className="window">
          <div className="between pad" style={{ paddingBottom: 12 }}>
            <span className="label">● Live · Checkout revamp / Mobile app</span>
            <span className="label">Folders / 6 · Members / 9</span>
          </div>
          <hr className="rule" />
          <div style={{ padding: "8px 20px 28px" }}>
            <div className="row label" style={{ padding: "6px 0 10px 120px", justifyContent: "space-between" }}>
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
            </div>
            {TRACE.map((t) => (
              <div key={t.label} className="row" style={{ height: 34 }}>
                <span className="row mono" style={{ width: 108, gap: 8 }}>
                  <span className={`sq ${t.c}`} /> {t.tool}
                </span>
                <div style={{ position: "relative", flex: 1, height: 34 }}>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderLeft: "1px solid var(--line)" }} />
                  <div className={`bar ${t.c}`} style={{ position: "absolute", top: 6, left: `${t.start}%`, width: `${t.width}%` }} />
                  <span className="label" style={{ position: "absolute", top: 20, left: `${t.start}%`, whiteSpace: "nowrap" }}>{t.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="section stack" style={{ gap: 40 }}>
          <div className="between" style={{ alignItems: "end" }}>
            <h2 className="h1" style={{ maxWidth: 420 }}>The same question, asked twice.</h2>
            <p className="muted" style={{ maxWidth: 320, margin: 0 }}>
              “Where is the latest checkout spec, and is the design final?” Without SOT you go hunting. With SOT it is one search.
            </p>
          </div>
          <div className="stack-sm">
            <div className="row"><span style={{ width: 160 }}>Hunting by hand</span><div className="compare-bar" style={{ flex: 1, background: "#cfcfcc" }} /><span style={{ width: 90, textAlign: "right" }}>5 tools open</span></div>
            <div className="row"><span style={{ width: 160 }}>SOT</span><div style={{ flex: 1 }}><div className="compare-bar c-green" style={{ width: 6, background: "var(--green)" }} /></div><span style={{ width: 90, textAlign: "right" }}>1 search</span></div>
          </div>
          <hr className="rule" />
          <div id="tools" className="grid-2" style={{ gridTemplateColumns: "300px 1fr" }}>
            <div className="stack-sm">
              <span className="label">Connectors</span>
              <div className="big-num">8+</div>
              <p className="muted" style={{ margin: 0 }}>Link and sync the tools your team already uses. The source tool stays the master copy.</p>
            </div>
            <div className="tiles">
              {TOOLS.map((t) => (
                <div key={t.name} className={`tile ${t.c}`}>
                  <span className="label">{t.what}</span>
                  <span className="tile-num" style={{ fontSize: 20 }}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="access" className="section grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div className="stack">
          <span className="label">Role-based access</span>
          <h2 className="h1">Finance sees the budget. Engineering sees the build.</h2>
          <p className="muted" style={{ margin: 0 }}>
            Mark a folder restricted and only the people or departments you name can open it. It disappears from their
            sidebar, search results and AI answers. Not even admins get in without being added.
          </p>
        </div>
        <div className="stack-sm">
          {[
            { f: "PRDs", c: "c-green", who: ["Product", "Engineering", "Design", "Finance"] },
            { f: "Architecture", c: "c-blue", who: ["Product", "Engineering"] },
            { f: "Designs", c: "c-purple", who: ["Product", "Engineering", "Design"] },
            { f: "Budget · restricted", c: "c-red", who: ["Finance"] },
          ].map((row) => (
            <div key={row.f} className="row" style={{ padding: "12px 14px", border: "1px solid var(--line-dark)", borderRadius: 6 }}>
              <span className={`sq ${row.c}`} />
              <span style={{ width: 150 }}>{row.f}</span>
              <span className="row-wrap">
                {["Product", "Engineering", "Design", "Finance"].map((d) => (
                  <span key={d} className="pill" style={row.who.includes(d) ? { background: "#fff", color: "#111", borderColor: "#fff" } : { background: "transparent", color: "#55555b", borderColor: "#2a2a2e", textDecoration: "line-through" }}>{d}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="flow" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <div className="section stack" style={{ gap: 32 }}>
          <h2 className="h1">Set up in five steps.</h2>
          <div className="feature-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {[
              ["01", "Sign in", "Email and password. SSO comes next."],
              ["02", "Pick your role", "PM, engineer, designer, finance and more. It shapes your starter folders."],
              ["03", "Create a project", "Add sub-projects for each surface or squad."],
              ["04", "Bring your team", "Invite people, give each a role and a department."],
              ["05", "Fill the folders", "Upload files, write notes, paste Figma, Jira or GitHub links."],
            ].map(([n, t, d], i) => (
              <div key={n} className="card pad stack-sm">
                <div className={`bar ${["c-green", "c-purple", "c-amber", "c-red", "c-blue"][i]}`} style={{ width: 28 }} />
                <span className="label">{n}</span>
                <span className="h3">{t}</span>
                <span className="muted" style={{ fontSize: 13 }}>{d}</span>
              </div>
            ))}
          </div>
          <div className="card pad-lg between" style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>
            <h2 className="h2">Start with one project. Bring the whole build in.</h2>
            <Link className="btn btn-light" href={cta}>Start a free workspace</Link>
          </div>
        </div>
      </section>

      <footer className="footer label">
        <span>SOT · Source of Truth</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
