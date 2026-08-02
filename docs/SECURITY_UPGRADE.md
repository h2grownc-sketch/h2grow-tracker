# Security Upgrade — Username Logins with Owner & Crew Roles

The app ships with a complete login system that is **OFF until you enable it**.
Until then, the PIN screen works exactly as before.

## What's built
- **Username + password sign-in** (`components/AuthGate.js`). Usernames are mapped
  to synthetic emails (`matt` → `matt@h2grow.app`) — nobody needs a real inbox.
- **Two roles**: `owner` and `crew`, stored server-side in the user's
  `app_metadata` (users cannot change their own role).
  - Owner: everything, plus the Settings → Team Access admin panel, plus job Delete.
  - Crew: the whole app except the admin panel and job Delete.
- **Settings tab → Team Access (owner only)**: list users, add a login
  (username/password/role), reset a password, remove a login. No Supabase
  dashboard needed after initial setup.
- **Admin API** (`app/api/admin/users/route.js`): server-side only, requires a
  signed-in owner, uses the service-role key from a server env var.
- Passwords are set by the owner. There is **no email reset** (usernames have no
  inbox) — the owner resets passwords from the admin panel.

## One-time setup (~15 minutes)

### Step 1 — Supabase: create YOUR owner login
Supabase Dashboard (your H2 Grow project) → **Authentication → Users → Add user**:
- Email: `matt@h2grow.app`  ← this is username `matt` (pick any username you like)
- Password: your choice (8+ chars)
- Check "Auto Confirm User" if offered.

Then make it an owner — **SQL Editor**, run:
```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'
WHERE email = 'matt@h2grow.app';
```
(Adjust the email to the username you chose.)

Also: **Authentication → Sign In / Providers → Email** → turn **Signups OFF**
(only the admin panel should create users).

### Step 2 — Vercel: two environment variables
Project → Settings → Environment Variables:
- `NEXT_PUBLIC_USE_AUTH` = `true`
- `SUPABASE_SERVICE_ROLE_KEY` = (Supabase → Project Settings → API → **service_role** key)
  — this one is SECRET. Server-only (no NEXT_PUBLIC_ prefix), never in the repo.

**Redeploy.**

### Step 3 — Verify login works
Open the app → you should see the username/password screen. Sign in with your
owner account → Settings tab → you should see **Team Access**. Add a crew login
and test it on a second device/incognito window.
If anything is wrong, set `NEXT_PUBLIC_USE_AUTH` to `false` and redeploy — the
PIN screen returns and nothing else has changed yet.

### Step 4 — LAST: lock down the database
This is the step that provides the actual security — but it also blocks the
un-authenticated PIN app, so only run it once Step 3 works.
SQL Editor:
```sql
-- jobs: authenticated users read/write; only owners delete
DROP POLICY IF EXISTS "Allow all access" ON jobs;
CREATE POLICY "auth select" ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update" ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner delete" ON jobs FOR DELETE TO authenticated
  USING (coalesce(auth.jwt()->'app_metadata'->>'role','crew') = 'owner');

-- production_logs + pay_periods: authenticated users, full access
DROP POLICY IF EXISTS "Allow all access" ON production_logs;
CREATE POLICY "auth all" ON production_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all access" ON pay_periods;
CREATE POLICY "auth all" ON pay_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
Note: if a DROP POLICY says the policy doesn't exist, check the actual policy
names in Table Editor → (table) → RLS and drop those instead. The goal: no
policy on any table should apply to the `anon`/`public` role afterward.

## After setup
- Add/remove crew and reset passwords from **Settings → Team Access** in the app.
- The PIN and `NEXT_PUBLIC_PIN_CODE` become unused; remove the env var when comfortable.
- Sessions persist per device — no re-login on every app launch.

## Future options (documented, not built)
- Finer permissions (e.g. hide Pay from crew) — one-line checks now that roles exist.
- Real-email accounts with self-service reset (type a full email as the username
  when creating the user — it works today).
- Activity/audit trail of who changed which job.
