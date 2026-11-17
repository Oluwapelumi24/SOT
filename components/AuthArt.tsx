import { Logo } from "./Logo";

export function AuthArt({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="auth-art">
      <Logo />
      <div className="stack" style={{ gap: 12 }}>
        {["c-green", "c-purple", "c-amber", "c-red", "c-blue"].map((c, i) => (
          <div key={c} className={`bar ${c}`} style={{ height: 40, marginLeft: `${[40, 10, 28, 0, 52][i]}%`, marginRight: -40 }} />
        ))}
      </div>
      <div className="stack-sm">
        <h2 className="h1" style={{ fontSize: 40 }}>{title}</h2>
        <p className="muted" style={{ margin: 0, maxWidth: 360 }}>{sub}</p>
      </div>
    </div>
  );
}
