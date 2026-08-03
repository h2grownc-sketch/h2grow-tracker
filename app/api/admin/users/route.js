// ============================================
// H2 GROW — Owner-only user management API
// ============================================
// Creating/deleting logins requires the Supabase SERVICE ROLE key, which must
// never reach the browser. This server route holds it (Vercel env var
// SUPABASE_SERVICE_ROLE_KEY) and only responds to a signed-in OWNER.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { usernameToEmail, emailToUsername } from "../../../../lib/auth";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function adminClient() {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Turn raw Supabase admin errors into actionable messages. A wrong/typo'd
// service key surfaces as "invalid api key" / "not allowed" here.
function adminErrMsg(e) {
  const m = e?.message || "Unknown error";
  if (/api key|apikey|not allowed|not_admin|jwt/i.test(m))
    return "SUPABASE_SERVICE_ROLE_KEY appears invalid — re-copy the service_role key (Supabase → Project Settings → API) into Vercel and redeploy.";
  return m;
}

// Validate the caller's session token and require the owner role.
// The token is verified with the ANON key so a bad service key can't
// masquerade as a session problem.
async function requireOwner(req) {
  if (!url || !serviceKey) return { error: "Server not configured: SUPABASE_SERVICE_ROLE_KEY missing in Vercel env", status: 500 };
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Not signed in", status: 401 };
  const verifier = createClient(url, anonKey || serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data?.user)
    return { error: "Session expired or invalid — sign out (Settings) and sign back in, then try again", status: 401 };
  if (data.user.app_metadata?.role !== "owner") return { error: "Owner access required", status: 403 };
  return { admin: adminClient(), caller: data.user };
}

function publicUser(u) {
  return {
    id: u.id,
    username: emailToUsername(u.email),
    email: u.email,
    role: u.app_metadata?.role === "owner" ? "owner" : "crew",
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at || null,
  };
}

export async function GET(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return NextResponse.json({ error: adminErrMsg(error) }, { status: 500 });
  return NextResponse.json({ users: (data?.users || []).map(publicUser) });
}

export async function POST(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const role = body.role === "owner" ? "owner" : "crew";
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const email = usernameToEmail(username);
  const { data, error } = await auth.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) {
    const msg = /already/i.test(error.message) ? "That username is already taken" : adminErrMsg(error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ user: publicUser(data.user) });
}

// Reset a user's password (owner sets a new one — synthetic usernames have no
// email inbox, so self-service reset links are not possible).
export async function PATCH(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const id = String(body.id || "");
  const password = String(body.password || "");
  if (!id) return NextResponse.json({ error: "User id required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const { data, error } = await auth.admin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: adminErrMsg(error) }, { status: 400 });
  return NextResponse.json({ user: publicUser(data.user) });
}

export async function DELETE(req) {
  const auth = await requireOwner(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "User id required" }, { status: 400 });
  if (id === auth.caller.id) return NextResponse.json({ error: "You can't remove your own login" }, { status: 400 });
  const { error } = await auth.admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: adminErrMsg(error) }, { status: 400 });
  return NextResponse.json({ ok: true });
}
