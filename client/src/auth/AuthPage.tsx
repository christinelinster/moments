import { FormEvent, useState } from "react";
import { useAuth } from "./AuthProvider";

export function AuthPage() {
  const { signIn, register, error, clearError } = useAuth();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    clearError();
    try {
      if (mode === "signin") await signIn(email, password);
      else await register(email, password);
    } catch {
      // AuthProvider exposes the server's safe error copy.
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">A small place for big memories</p>
        <h1 id="auth-title">Your scrapbook, still in progress.</h1>
        <p className="auth-intro">Keep the photographs, captions, and little discoveries in one warm, shareable place.</p>
        <div className="auth-tabs" role="tablist" aria-label="Account action">
          <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => setMode("signin")} role="tab" aria-selected={mode === "signin"}>Sign in</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")} role="tab" aria-selected={mode === "register"}>Create account</button>
        </div>
        <form onSubmit={submit}>
          <label>
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Opening your desk..." : mode === "signin" ? "Open scrapbook" : "Start a scrapbook"}</button>
        </form>
      </section>
    </main>
  );
}
