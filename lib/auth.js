// ============================================
// H2 GROW — Auth helpers (username-based login)
// ============================================
// Supabase Auth requires emails, but the team logs in with usernames.
// Usernames map to synthetic emails on a fixed domain; real emails also
// work if someone types a full address.

export const USERNAME_DOMAIN = "h2grow.app";

export function usernameToEmail(input) {
  const v = String(input || "").trim().toLowerCase();
  if (!v) return "";
  return v.includes("@") ? v : `${v.replace(/[^a-z0-9._-]/g, "")}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email) {
  const v = String(email || "");
  return v.endsWith(`@${USERNAME_DOMAIN}`) ? v.split("@")[0] : v;
}

// Role lives in app_metadata (set server-side only — users can't change it).
// Missing role defaults to the least-privileged "crew".
export function roleFromUser(user) {
  return user?.app_metadata?.role === "owner" ? "owner" : "crew";
}
