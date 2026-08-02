"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Real login via Supabase Auth. Rendered instead of the PIN screen when
// NEXT_PUBLIC_USE_AUTH=true. Setup steps: docs/SECURITY_UPGRADE.md.
export default function AuthGate({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) onAuthed();
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onAuthed();
    });
    return () => sub?.subscription?.unsubscribe();
  }, [onAuthed]);

  const signIn = async () => {
    if (!supabase) { setError("Database not configured"); return; }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message === "Invalid login credentials" ? "Wrong email or password" : err.message);
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              inputMode="email"
              autoComplete="username"
              aria-label="Email"
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
              disabled={busy || !email || !password}
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
