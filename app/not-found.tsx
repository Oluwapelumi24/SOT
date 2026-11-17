import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty" style={{ padding: 80 }}>
      <div className="h1" style={{ color: "var(--ink)", marginBottom: 12 }}>Not here.</div>
      <p>It doesn't exist, or you don't have access to it.</p>
      <Link className="btn" href="/app">Back to SOT</Link>
    </div>
  );
}
