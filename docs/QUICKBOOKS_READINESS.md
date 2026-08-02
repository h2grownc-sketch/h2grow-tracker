# QuickBooks Online Readiness

No live integration is built (per project rules). This documents how the app gets
there without rebuilding the job system. Companion doc: `docs/integrations-plan.md`
(OAuth flow, env vars, Settings-tab home, setup checklist).

## Recommended architecture: adapter, not entanglement
Keep three layers separate:
1. **Operational records** — the `jobs` table (unchanged). The source of truth for work.
2. **Accounting link fields** — additive columns that only *reference* QBO:
   ```sql
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_customer_id text DEFAULT '';
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_estimate_id text DEFAULT '';
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_invoice_id  text DEFAULT '';
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_status  text DEFAULT '';  -- '', draft, sent, paid
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_sync_status text DEFAULT '';  -- '', ok, error
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_synced_at   timestamptz;
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS qbo_sync_error  text DEFAULT '';
   ```
3. **Sync service** — Next.js API routes (`app/api/qbo/*`) that own ALL QuickBooks
   calls: OAuth tokens, item mapping, create/send. UI components never call QBO
   directly; they call these routes. Swap-able if the provider ever changes
   (`external_provider` + `external_id` naming keeps that door open).

## Field mapping (job → QBO)
| App field | QBO Estimate/Invoice |
|---|---|
| customerName/phone/email/address/city/state | Customer (find-or-create; store `qbo_customer_id`) |
| serviceType (+ hydroType) | Line item → QBO Item (service items: Hydroseeding, Site Prep, Fertilization, Weed Control, Soil Test) |
| quoteAmount | Line amount |
| sitePrepAmount | Second line (Site Prep item) |
| sqft | Line description ("~12,000 sq ft") |
| soil test $75 | Optional line (credited per your policy) |
| 50% deposit | QBO payment terms / deposit field |

## Duplicate prevention
- Customers: search by email → phone → name+address before creating; always reuse `qbo_customer_id` once stored.
- Estimates/invoices: never create when the job already has a `qbo_estimate_id`/`qbo_invoice_id` — update instead. Store the ID **in the same transaction flow** that creates it.
- Idempotency: check-then-create on the server route, never from the client.

## Failure handling
- QBO down / token expired → job saves normally; `qbo_sync_status='error'` +
  `qbo_sync_error` recorded; a "Retry sync" action reprocesses. The H2 Grow
  record is NEVER blocked by accounting availability.
- Refresh tokens expire (~100 days idle) → refresh on every call; surface
  "Reconnect QuickBooks" in Settings when refresh fails.
- Webhooks (optional, later): QBO can push invoice-paid events; until then a
  daily poll of open invoices is fine at this volume.

## OAuth requirements
Intuit Developer app, scope `com.intuit.quickbooks.accounting`, redirect URI on
the production domain, tokens in a server-only `qbo_tokens` table (service-role
access, never the anon key). Env vars: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`
(secret), `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT` (sandbox first). No credentials
in the repo.

## Workflow it enables (matches the estimate→invoice lifecycle)
1. Approved H2 Grow job → "Create QBO Estimate" → email from QBO.
2. Completed job (jobComplete ✓) → "Ready to invoice" → "Create QBO Invoice".
3. Paid in QBO → `invoice_status='paid'` on the job (poll or webhook).
4. QBO unavailable → everything above queues; operations continue.
