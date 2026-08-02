# Security Upgrade — PIN → Real Login

Current state (see UX_WORKFLOW_AUDIT.md P0-2): the PIN is checked in the browser,
and the database policy allows anyone with the app's URL to read/write everything.
The app now ships with a **real login behind a feature flag** — nothing changes
until you flip it on.

## What's built
- `components/AuthGate.js` — email/password sign-in via Supabase Auth.
- `app/page.js` — when `NEXT_PUBLIC_USE_AUTH=true`, the PIN screen is replaced by
  AuthGate. When unset/false, the app behaves exactly as before (PIN).
- Sessions persist (no re-entering a PIN every launch).

## Turn-on steps (do in this order)
1. **Create the user(s)**: Supabase Dashboard → Authentication → Users →
   "Add user" → email + password (e.g. H2GrowNC@gmail.com, and one for the PM).
   Turn OFF public signups: Authentication → Providers → Email → disable "Sign up".
2. **Lock down the database** — SQL Editor, run for EACH table
   (`jobs`, `production_logs`, `pay_periods`):
   ```sql
   -- repeat per table; policy names may differ — check Table Editor → RLS
   DROP POLICY IF EXISTS "Allow all access" ON jobs;
   CREATE POLICY "Authenticated access" ON jobs
     FOR ALL TO authenticated USING (true) WITH CHECK (true);
   ```
3. **Vercel** → Environment Variables → add `NEXT_PUBLIC_USE_AUTH=true` → redeploy.
4. Test login on your phone AND the PM's phone **before** telling anyone the PIN
   is gone. If anything breaks, remove the env var and redeploy — the PIN screen
   returns (but note the RLS change from step 2 will block the un-authed app, so
   only run step 2 when you're ready to commit).

## Order matters
Step 2 (RLS) is the actual security. Step 3 just changes the login screen.
Do 1 → 3 → verify login works → then 2. That way you're never locked out.

## Future (documented, not built)
- Per-user accounts with roles (owner vs crew) via a `user_roles` table + RLS.
- Passwordless email magic links (Supabase supports this natively).
- Activity/audit trail (who changed which job when).
