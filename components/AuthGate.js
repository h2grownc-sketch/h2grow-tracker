"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { usernameToEmail } from "../lib/auth";

// Real login via Supabase Auth, keyed by username (mapped to a synthetic
// email internally). Rendered instead of the PIN screen when
// NEXT_PUBLIC_USE_AUTH=true. Setup steps: docs/SECURITY_UPGRADE.md.
// onAuthed receives the session so the app can read the user's role.
export default function AuthGate({ onAuthed }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) onAuthed(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onAuthed(session);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [onAuthed]);

  const signIn = async () => {
    if (!supabase) { setError("Database not configured"); return; }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (err) setError(err.message === "Invalid login credentials" ? "Wrong username or password" : err.message);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--light-bg)", gap: 16, padding: 20 }}>
      <img src="/logo.jpg" alt="H2 Grow" style={{ height: 64 }} />
      {checking ? (
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>Checking session...</div>
      ) : (
        <>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", fontFamily: "var(--body-font)" }}>
            Sign in to continue
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              aria-label="Username"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") signIn(); }}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              aria-label="Password"
              style={error ? { border: "2px solid var(--danger)" } : undefined}
            />
            {error && (
              <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600 }} role="alert">{error}</div>
            )}
            <button
              onClick={signIn}
              disabled={busy || !username || !password}
              style={{
                padding: "13px 0",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg,#4CAF50,#5CBF2A)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                opacity: busy ? 0.6 : 1,
                minHeight: 46,
              }}
            >
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
