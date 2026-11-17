import Link from "next/link";
import { signup } from "../auth-actions";
import { AuthArt } from "@/components/AuthArt";

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="auth">
      <AuthArt title="One source of truth." sub="Specs, designs, tickets and ideas for every build, with access set by role." />
      <div className="auth-form">
        <form action={signup} className="stack">
          <div className="steps"><i className="on" /><i /><i /><i /></div>
          <div className="stack-sm">
            <span className="label">Step 1 of 4 · Account</span>
            <h1 className="h1">Create your account.</h1>
          </div>
          {error && <div className="flash">{error}</div>}
          <label className="field"><span>Full name</span><input className="input" name="name" required autoComplete="name" /></label>
          <label className="field"><span>Work email</span><input className="input" name="email" type="email" required autoComplete="email" /></label>
          <label className="field"><span>Password · 8+ characters</span><input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          <button className="btn" style={{ height: 38, justifyContent: "center" }}>Continue</button>
          <span className="label">Have an account? <Link className="u" href="/login">Sign in</Link></span>
        </form>
      </div>
    </div>
  );
}
