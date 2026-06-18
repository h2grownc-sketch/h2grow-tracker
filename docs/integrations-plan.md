# H2 Grow — Integrations Plan (Laptop Day)

Scope for a future build session (needs a laptop): a **Settings tab** that hosts
two integrations — **Push Notifications** and **QuickBooks estimates/invoices**.
Both are backend integrations with OAuth/secrets/cron, so they can't be finished
from a phone.

Status: **planning only — nothing built yet.** This doc is the spec to execute from.

---

## 0. New Settings tab (shared home for both)

- Add a tab to `app/page.js` → `TABS`: `{ id: "settings", label: "Settings" }`
  and render `{view === "settings" && <SettingsTab .../>}`.
- New component `components/SettingsTab.js` with sections:
  - **Notifications** — master enable + a checkbox per notification type (saved as
    preferences, NOT a main-page toggle). *(Per the owner's request.)*
  - **QuickBooks** — Connect / Disconnect button + connection status.
  - (Later, optional) operator name, app info.
- Tab bar already scrolls horizontally, so a 9th tab is fine.

---

## 1. Push Notifications

### Goal / triggers (all four requested)
1. **New lead added** — instant
2. **Today's schedule** — daily morning summary
3. **Deposit / approval changes** — instant
4. **Overdue follow-ups** — daily morning summary

### Why it's two halves
- **Scheduled** (today's schedule + overdue) = a daily **Vercel Cron** that reads
  jobs and sends one summary. Simplest — no extra wiring.
- **Instant** (new lead + deposit/approval) = a **Supabase Database Webhook** on the
  `jobs` table that calls the app, because the push must fire from the server, not
  the phone that made the change.

### Foundation (shared)
- **Service worker** `public/sw.js` with `push` + `notificationclick` handlers.
  (App currently has **no** service worker — this adds the first one.)
- **VAPID keys** (generate once with `npx web-push generate-vapid-keys`).
- **`web-push`** npm dependency.
- **`push_subscriptions`** table in Supabase (one row per opted-in device), storing
  the per-device preferences (which of the 4 types they want).
- Client helper `lib/push.js`: register SW, request permission, subscribe, save
  subscription + prefs to Supabase, unsubscribe.
- Settings tab UI: "Enable Notifications" + 4 checkboxes → saved to the subscription.

### Senders (Next.js API routes on Vercel)
- `app/api/push/send/route.js` — core: load subscriptions (filtered by pref), send
  via `web-push`. Internal only; protected by a secret header.
- `app/api/push/cron/route.js` — Vercel Cron (daily AM): build *today's schedule* +
  *overdue follow-ups* from jobs, send to opted-in devices.
- `app/api/push/notify/route.js` — called by the **Supabase DB webhook** on
  jobs INSERT/UPDATE: detect new lead / approval / deposit, send to opted-in devices.
- `vercel.json` → add a daily `crons` entry hitting `/api/push/cron`.

### Setup checklist (the human steps)
- [ ] `npx web-push generate-vapid-keys`
- [ ] Vercel env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
      `VAPID_SUBJECT` (mailto:H2GrowNC@gmail.com), `PUSH_WEBHOOK_SECRET`, `CRON_SECRET`
- [ ] Run the `push_subscriptions` migration (see §3)
- [ ] Add `vercel.json` cron (in repo) + redeploy
- [ ] Supabase → Database Webhooks: on `jobs` insert/update → POST
      `/api/push/notify` with the secret header
- [ ] Each phone: **install the PWA to the home screen**, then allow notifications

### iOS caveat (important)
Web push on iPhone works **only** for an **installed** PWA (Add to Home Screen) on
**iOS 16.4+** — not in a Safari tab. Android/desktop Chrome work normally.

### Suggested order
1. Settings tab + foundation + **daily summary** (fastest to a working win)
2. Add **instant** new-lead / deposit-approval pushes (adds the Supabase webhook)

---

## 2. QuickBooks — estimates & invoices

### Goal
Build and send **estimates/invoices** from job data, with **QuickBooks Online as the
system of record** (it owns the PDF, email, payment links, and the books). The app
drives QBO; no re-keying customers or amounts.

### Architecture
- **Intuit Developer app** (developer.intuit.com) → Client ID/Secret,
  scope `com.intuit.quickbooks.accounting`.
- **OAuth 2.0 connect flow** (lives in the Settings tab):
  - `app/api/qbo/connect/route.js` → redirect to Intuit authorize.
  - `app/api/qbo/callback/route.js` → exchange code, store tokens.
- **Token storage**: `qbo_tokens` table in Supabase (realm/company id, access token,
  refresh token, expiry). Refresh helper (refresh tokens expire ~100 days).
- **Mapping (one-time)**:
  - **Customers** — find-or-create a QBO customer from job name/email/address;
    save `qbo_customer_id` on the job.
  - **Service items** — create QBO items: Hydroseeding, Site Prep, Fertilization,
    Weed Control, Soil Test → so line items hit the right income accounts.
- **Create + send** (buttons on the job detail):
  - `app/api/qbo/estimate/route.js` — build a QBO Estimate from the job
    (`quote_amount`, `site_prep_amount`, `sqft`, service type) → optionally email it.
  - `app/api/qbo/invoice/route.js` — invoice directly or convert an accepted estimate.
- **Status sync (optional)** — pull back sent/accepted/paid → update `estimate_status`
  and deposit/approval on the job.

### Fits the existing app
Jobs already store customer info, `quote_amount`, `site_prep_amount`, `sqft`,
`service_type`, `estimate_status` — most of an estimate is already there. Mostly
wiring, not new data entry.

### Setup checklist
- [ ] Create Intuit Developer app; get Client ID/Secret
- [ ] Decide **sandbox** first, then production
- [ ] Vercel env: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`,
      `QBO_ENVIRONMENT` (sandbox|production)
- [ ] Run the `qbo_tokens` + job column migration (see §3)
- [ ] Set up QBO service items and confirm income accounts
- [ ] Connect QBO from the Settings tab; test an estimate in sandbox

### Caveats
- OAuth + token refresh required; secrets in Vercel env.
- **Verify the connected QBO company is actually H2 Grow** — other accounts wired
  into the assistant session were "Performance East," not H2 Grow.
- The assistant also has live QBO tools (create/send estimate & invoice, search
  customers/items, reports) — usable as a **stopgap** to create invoices on request
  before the full app integration is built. *(Token currently expired — needs re-auth.)*

---

## 3. Database migrations (run in Supabase SQL Editor when we build)

```sql
-- Push subscriptions (one row per opted-in device)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    text UNIQUE NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  prefs       jsonb NOT NULL DEFAULT '{"newLead":true,"todaySchedule":true,"depositApproval":true,"overdue":true}',
  label       text DEFAULT '',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- QuickBooks tokens (single connected company)
CREATE TABLE IF NOT EXISTS qbo_tokens (
  realm_id      text PRIMARY KEY,
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE qbo_tokens ENABLE ROW LEVEL SECURITY;
-- NOTE: tokens are sensitive — restrict this table (service role only),
-- do NOT use a blanket allow-all policy here.

-- Link jobs to QBO records (additive, safe defaults)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_customer_id text DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_estimate_id text DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_invoice_id  text DEFAULT '';
```

If `jobs` columns are added, also map them in `lib/supabase.js` `toSnake`
(`qboCustomerId → qbo_customer_id`, etc.) and add to `emptyJob()` in `lib/jobUtils.js`.

---

## 4. Consolidated env vars (Vercel)

| Var | For | Secret? |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push | no |
| `VAPID_PRIVATE_KEY` | Push | **yes** |
| `VAPID_SUBJECT` | Push | no |
| `PUSH_WEBHOOK_SECRET` | Push (Supabase webhook → /notify) | **yes** |
| `CRON_SECRET` | Push (Vercel cron → /cron) | **yes** |
| `QBO_CLIENT_ID` | QuickBooks | no |
| `QBO_CLIENT_SECRET` | QuickBooks | **yes** |
| `QBO_REDIRECT_URI` | QuickBooks | no |
| `QBO_ENVIRONMENT` | QuickBooks (sandbox/production) | no |

(Existing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`NEXT_PUBLIC_PIN_CODE` stay as-is.)

---

## 5. Suggested build order (laptop day)

1. **Settings tab** shell.
2. **Push: foundation + daily summary** (today's schedule + overdue).
3. **Push: instant** (new lead + deposit/approval) via Supabase webhook.
4. **QuickBooks: OAuth connect** in Settings.
5. **QuickBooks: create/send estimate** from a job (sandbox first).
6. **QuickBooks: invoice + optional status sync.**

## 6. Open items to confirm before building
- [ ] Verify the QBO company connected is H2 Grow (not Performance East).
- [ ] Decide notification send time (e.g., 6:00 AM ET) for the daily summary.
- [ ] Confirm the QBO service-item list and their income accounts.
- [ ] Decide whether estimates auto-email the customer or just create as draft.
