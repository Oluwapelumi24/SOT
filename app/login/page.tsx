import Link from "next/link";
import { login } from "../auth-actions";
import { AuthArt } from "@/components/AuthArt";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <AuthArt title="Welcome back." sub="Every project, folder and decision, right where you left it." />
      <div className="auth-form">
        <form action={login} className="stack">
          <div className="stack-sm">
            <span className="label">Sign in</span>
            <h1 className="h1">Open your workspace.</h1>
          </div>
          {error && <div className="flash">{error}</div>}
          <label className="field"><span>Email</span><input className="input" name="email" type="email" required autoComplete="email" /></label>
          <label className="field"><span>Password</span><input className="input" name="password" type="password" required autoComplete="current-password" /></label>
          <button className="btn" style={{ height: 38, justifyContent: "center" }}>Sign in</button>
          <span className="label">New to SOT? <Link className="u" href="/signup">Create an account</Link></span>
        </form>
      </div>
    </div>
  );
}
