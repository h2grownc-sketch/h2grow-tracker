"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { emailToUsername } from "../lib/auth";

const lbl = { fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: -4, display: "block", fontFamily: "var(--body-font)" };
const card = { background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16, marginBottom: 14 };
const sectionTitle = { fontFamily: "var(--heading-font)", fontSize: 13, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 };

async function authedFetch(method, body) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch("/api/admin/users", {
    method,
    headers: {
      Authorization: `Bearer ${token || ""}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export default function SettingsTab({ useAuth, role, currentUser, onSignOut }) {
  const isOwner = role === "owner";
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "crew" });

  const loadUsers = useCallback(async () => {
    setLoadError("");
    try {
      const { users: u } = await authedFetch("GET");
      setUsers(u);
    } catch (e) {
      setLoadError(e.message);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    if (useAuth && isOwner) loadUsers();
  }, [useAuth, isOwner, loadUsers]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const addUser = async () => {
    if (!newUser.username.trim() || newUser.password.length < 8) return;
    setBusy(true);
    try {
      await authedFetch("POST", newUser);
      flash(`Added ${newUser.username.trim().toLowerCase()} (${newUser.role})`);
      setNewUser({ username: "", password: "", role: "crew" });
      loadUsers();
    } catch (e) {
      alert("Could not add user: " + e.message);
    }
    setBusy(false);
  };

  const removeUser = async (u) => {
    if (!confirm(`Remove ${u.username}'s login? They will no longer be able to sign in. (Job data is not affected.)`)) return;
    setBusy(true);
    try {
      await authedFetch("DELETE", { id: u.id });
      flash(`Removed ${u.username}`);
      loadUsers();
    } catch (e) {
      alert("Could not remove user: " + e.message);
    }
    setBusy(false);
  };

  const resetPassword = async (u) => {
    const pw = prompt(`New password for ${u.username} (at least 8 characters):`);
    if (pw === null) return;
    if (pw.length < 8) { alert("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      await authedFetch("PATCH", { id: u.id, password: pw });
      flash(`Password updated for ${u.username}`);
    } catch (e) {
      alert("Could not reset password: " + e.message);
    }
    setBusy(false);
  };

  return (
    <div>
      <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>
        Settings
      </div>

      {/* Account */}
      <div style={card}>
        <div style={sectionTitle}>Account</div>
        {useAuth ? (
          <>
            <div style={{ fontSize: 14, marginBottom: 12 }}>
              Signed in as <b>{emailToUsername(currentUser?.email) || "—"}</b>
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.5px", background: isOwner ? "#4CAF5018" : "#5BA3D118", color: isOwner ? "var(--success)" : "var(--h2-blue)" }}>
                {role}
              </span>
            </div>
            <button
              onClick={onSignOut}
              style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", minHeight: 40 }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Login is currently PIN-based. To switch to individual username/password
            logins with owner and crew roles, follow <b>docs/SECURITY_UPGRADE.md</b>.
          </div>
        )}
      </div>

      {/* Team Access (owner only) */}
      {useAuth && isOwner && (
        <div style={card}>
          <div style={sectionTitle}>Team Access</div>

          {notice && (
            <div style={{ background: "#4CAF5015", color: "var(--success)", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600, marginBottom: 10 }} role="status">
              {notice}
            </div>
          )}
          {loadError && (
            <div style={{ background: "#D6454510", color: "var(--danger)", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600, marginBottom: 10 }} role="alert">
              {loadError}
              {/missing/i.test(loadError) && (
                <div style={{ fontWeight: 400, marginTop: 4 }}>
                  Add SUPABASE_SERVICE_ROLE_KEY in Vercel (see docs/SECURITY_UPGRADE.md), then redeploy.
                </div>
              )}
            </div>
          )}

          {/* User list */}
          {users === null && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading users...</div>}
          {Array.isArray(users) && users.length > 0 && users.map((u) => (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-light)", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {u.username}
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 3, textTransform: "uppercase", background: u.role === "owner" ? "#4CAF5018" : "#5BA3D118", color: u.role === "owner" ? "var(--success)" : "var(--h2-blue)" }}>
                    {u.role}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {u.lastSignInAt ? "Last sign-in " + new Date(u.lastSignInAt).toLocaleDateString() : "Never signed in"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => resetPassword(u)} disabled={busy} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", minHeight: 36 }}>
                  Reset PW
                </button>
                {u.id !== currentUser?.id && (
                  <button onClick={() => removeUser(u)} disabled={busy} style={{ background: "none", border: "1px solid var(--danger)", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "var(--danger)", textTransform: "uppercase", minHeight: 36 }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add user */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8, fontFamily: "var(--heading-font)" }}>
              Add Login
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Username</label>
                <input value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} placeholder="e.g. crew1" autoCapitalize="none" autoCorrect="off" />
              </div>
              <div>
                <label style={lbl}>Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="crew">Crew</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Password (min 8 characters)</label>
              <input value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Set their password" type="text" autoCapitalize="none" autoCorrect="off" />
            </div>
            <button
              onClick={addUser}
              disabled={busy || !newUser.username.trim() || newUser.password.length < 8}
              style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none", background: (!newUser.username.trim() || newUser.password.length < 8) ? "var(--border)" : "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "1.5px", textTransform: "uppercase", opacity: busy ? 0.6 : 1, minHeight: 44 }}
            >
              {busy ? "Working..." : "Add User"}
            </button>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              You set each person's password. There's no email reset — use "Reset PW" here if someone forgets.
              Owners see this admin panel and can delete jobs; crew can do everything else.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
