# H2 Grow Tracker — Current App Map

Audit date: 2026-08-02. This document describes the app exactly as it exists in the code today. Its companion, `docs/UX_WORKFLOW_AUDIT.md`, lists problems and risks.

---

## 1. Architecture Summary

| Layer | What it is | Where |
|---|---|---|
| Framework | Next.js 14 (App Router) + React 18, single client page | `app/page.js`, `app/layout.js`, `package.json` |
| Routing | None beyond `/`. All 8 "tabs" are conditional renders inside one component, switched by a `view` string in state (`app/page.js:55`, `app/page.js:420-534`) | `app/page.js` |
| State management | Plain `useState` / `useEffect` / `useMemo` in `page.js`. No Redux/Zustand/Context, no cache library. Job list lives in one `jobs` array; a 30-second polling interval re-fetches it (`app/page.js:87`) | `app/page.js` |
| Backend | Supabase (PostgreSQL) accessed directly from the browser with the public anon key. No API routes, no server code | `lib/supabase.js`, `lib/productionApi.js` |
| Auth | 4-digit PIN checked in the browser against `NEXT_PUBLIC_PIN_CODE` (default `2024`); success stored in `sessionStorage` (`app/page.js:28-48`) | `app/page.js` |
| Hosting | Vercel, deployed from GitHub `h2grownc-sketch/h2grow-tracker` | `SETUP-GUIDE.md` |
| Map | Leaflet 1.9.4 loaded at runtime from the unpkg CDN (no npm package) | `components/MapView.js:79-100` |
| PWA | Installable via `public/manifest.json`; no service worker, so no offline support | `public/manifest.json`, `app/layout.js` |
| Styling | One global stylesheet plus heavy inline styles; Oswald / Barlow Condensed fonts from Google Fonts | `app/globals.css` |
| Legacy | Google Sheets / Apps Script backend archived and unused | `archive/sheets.js`, `archive/google-apps-script.js` |

Data flow: `page.js` loads all jobs on login and every 30 s → passes the array down to tab components as props → edits happen in the `JobDetail` bottom-sheet modal → `handleSave` updates local state optimistically, closes the modal, then upserts to Supabase and re-fetches (`app/page.js:89-102`). The Pay tab manages its own data (`production_logs`, `pay_periods`) independently via `lib/productionApi.js`.

---

## 2. Tabs / Screens

### PIN screen (`app/page.js:226-285`)
Shown until the correct PIN is entered. Collects: 4-digit PIN only.

### 1. Dashboard (`components/CommandCenter.js`)
The PM's daily command center. KPI strip (Active, Scheduled, Overdue, Pipeline $) plus collapsible sections:

- **Needs Attention** — jobs with an active alert (not contacted 48h+, stale quote, overdue follow-up, slow lab results)
- **Your Action** — grouped by next step: Consultation Needed, Mail Soil Samples, Build/Send Quote, Approved — Needs Scheduling
- **Waiting On Others** — soil results out at the lab; quotes awaiting customer approval (shows days waiting)
- **Ready to Move** — approved but not yet scheduled
- **This Week** — jobs scheduled Mon–Sun of the current week, flagged "No deposit" where applicable
- **Recently Added** — 5 newest jobs (collapsed by default)

Quick actions: + New Lead, All Jobs, Schedule. Each row has a one-tap "✓" that checks off the job's next step. Collects no data itself (except via the quick-advance checkmark, which writes to `checks`).

### 2. Jobs (`app/page.js:434-526`, `components/FilterBar.js`, `components/JobCard.js`)
Searchable, filterable list of all jobs, sorted by urgency. Sections: Needs Attention (overdue), Active, Completed (collapsed), Dead Leads (collapsed). Filters: 4 smart filters (Overdue, Ready to Schedule, Waiting on Soil, Waiting on Approval), stage, service type, assigned-to text, county text. Search covers customer name, address, city, service type. Tapping a card opens `JobDetail`.

### 3. Schedule (`components/WeekCalendar.js`)
Week-at-a-glance calendar (Mon–Sun), Prev/Next week navigation. Shows jobs where `scheduledDate` is set **and** the `scheduled` checkbox is ticked. Each entry shows service type, city, and deposit status (green "Deposit received" / red "No deposit"). Tap opens `JobDetail`. Collects no data directly.

### 4. Map (`components/MapView.js`)
Leaflet map of active jobs, geocoded by matching the `city` (or a city name found inside `address`) against a hardcoded table of ~65 eastern-NC towns (`components/MapView.js:7-41`). Markers are colored by stage; popups show stage, next action, assignee, alerts. Filters: service, stage, Overdue-only, Ready-only. Below the map: "On Map", "City Not Recognized", and "No Location" lists. Single-tap focuses the marker; double-tap opens `JobDetail`.

### 5. Calc (`components/MaterialsCalc.js`)
Materials calculator. Enter square feet, choose mulch and seed type → computes tank count (hardcoded coverage: wood fiber 10,000 sq ft/tank, Flexterra 5,500, other 9,000), bales, seed lbs, fertilizer bags, tackifier, dye, lime, soil test, and cost line items. Generates a "Supercast Order" text block with a copy-to-clipboard button. Edit/Add modes let the user change material names, units, costs, and categories. **All of this lives in component state only — nothing is saved anywhere** (see audit).

### 6. Ref (`components/QuickRefTab.js`)
Read-only accordion reference library. The 14 sections:

1. Inquiry Script
2. Site Visit — On Site
3. Measuring Jobs — Plott Carta Wheel
4. Soil Samples — Collect & Bag
5. Grass Selection — Site Eval (NC)
6. Cool-Season Grasses (NC)
7. Warm-Season Grasses (NC)
8. Loading Chart
9. Spray Day — Job Execution
10. Care & Warranty (Customer)
11. T120 Daily Startup
12. T120 End of Day
13. 333G + Attachments
14. Suppliers & Contacts

### 7. Ops (`components/OpsChecklistTab.js`)
Equipment maintenance checklists with progress bars: Daily T120, Daily 333G, Weekly T120, Weekly 333G, Monthly/Seasonal. "Reset All" button. Checkbox state is component state only — **lost on refresh** (see audit).

### 8. Pay (`components/PayTab.js`)
Production logging and weekly pay for the Project Manager role:

- **This Week summary** — tanks, skid hours, days worked, and a pay breakdown (base $250/wk + $150/tank + $25/skid hour + $15/soil sample, from `lib/payUtils.js:5-10`)
- **Log Production form** — date, optional job link, tanks sprayed, skid-steer hours, soil samples, notes
- **Recent Entries** — last 30 days (14 shown), with per-entry Flag/Approve quality toggle (flagged entries are excluded from pay) and delete
- **Pay History** — last 12 weekly pay periods with status workflow: pending → approved → paid (with paid date); expandable daily breakdown
- **Season Totals** — year-to-date tanks, hours, pay by category, average weekly pay

---

## 3. Data Collected Per Screen

| Screen | Data written |
|---|---|
| PIN | none stored (session flag only) |
| Dashboard | `checks[nextKey] = true` via quick-advance ✓ |
| Jobs list | same quick-advance; filters/search are transient |
| JobDetail modal | the entire job record — see field list below |
| Schedule | none (read-only; edits via JobDetail) |
| Map | none (read-only; edits via JobDetail) |
| Calc | nothing persisted (in-memory materials list and sqft) |
| Ref | nothing |
| Ops | nothing persisted (in-memory checkboxes) |
| Pay | `production_logs` rows; `pay_periods` status changes (rest is derived) |

### JobDetail fields (`components/JobDetail.js`)
Customer name (required, with autocomplete from existing customers that fills phone/email/address and sets source = Repeat), phone, street address, city, state (default NC), source, service type, sq ft, county, assigned to, estimate status (Pending/Approved/Denied), scheduled date, spray/completed date, notes, photos (camera/file upload), full checklist, dead/lost flag + reason. Hydroseeding-only extras: hydro type, "Soil samples required" and "Requires site prep" toggles, hydroseed quote $, site prep quote $, soil test #, sample mailed date, quote sent date.

---

## 4. Data Model

Three Supabase tables. All access uses the public anon key with an allow-all RLS policy ("PIN auth is app-level" — `scripts/migrate-to-supabase.mjs:107`).

### `jobs` (snake_case columns; mapped to camelCase in `lib/supabase.js:11-37`)
Identity/contact: `id` (text, generated `Date.now().toString(36)+random` — `lib/jobUtils.js:100`), `customer_name`, `phone`, `email`, `address`, `city`, `state`, `county`.
Classification: `service_type`, `hydro_type`, `sqft`, `source`, `assigned_to`, `estimate_status`.
Money: `quote_amount`, `site_prep_amount` (stored as free text).
Dates (text): `date_created`, `quote_sent_date`, `sample_mailed_date`, `scheduled_date`, `spray_date`.
Flags: `require_site_prep`, `soil_samples_required`, `is_dead` (+ `dead_reason`).
Other: `soil_test_number`, `notes`, `photos` (base64 data-URLs joined with `|||` in one text column — `components/JobDetail.js:75-89`), `checks` (JSONB), `created_at`, `updated_at`.

### `checks` JSONB — the workflow engine
One boolean per checklist step. Keys actually used by the code (18; `lib/jobUtils.js:6-41`):
`contacted, consultationNeeded, consultationComplete, soilCollected, soilMailed, resultsReceived, quoteSent, sitePrepQuoteSent, approved, depositReceived, materialsOrdered, scheduled, jobComplete, careSent, followUp3, followUp14, followUp30, followUp90`.
(`CLAUDE.md` also lists a `siteVisit` key; it may exist in old rows but no code reads or writes it.)

Everything derives from `checks`:
- **Stage** (`getStage`, `lib/jobUtils.js:143`) — New Lead → Contacted → Consultation → Consulted → Sampling → Awaiting Results → Quoting → Quote Sent → Approved → Job Day → Follow-Up → Done
- **Progress %** (`getProgress`), **next action** (`getNextAction`), **urgency sort** (`getUrgency`), **alerts** (`getAlertMsg`), **done test** (`isJobDone` = last checklist key true)

Two pipelines (`lib/jobUtils.js:6-36`):
- **Hydroseeding**: 17 steps with soil testing, 14 when "Soil samples required" is off; "Site prep quote sent" is skipped unless `requiresSitePrep`
- **Simple / land management** (every non-hydro service type): 9 steps ending in a 3-day follow-up

### `production_logs` (`lib/productionApi.js`)
`id, log_date, job_id (optional link to jobs.id, no enforced foreign key), tanks_sprayed, skid_steer_hours, soil_samples, notes, operator ("Project Manager"), quality_approved`.

### `pay_periods` (`lib/productionApi.js:97-125`)
Derived weekly aggregate, keyed by `week_start` (Monday): `week_end, base_pay, total_tanks, total_skid_hours, total_soil_samples, hydroseed_pay, skid_steer_pay, soil_sample_pay, total_pay, status (pending/approved/paid), paid_date`. Recomputed client-side (`recalcPayPeriod`) every time a production log is saved, deleted, or quality-toggled.

### How records relate

```
jobs (1) ──< production_logs (many, via job_id, optional)
production_logs ──rolled up by week──> pay_periods (1 row per Monday week_start)
jobs.checks (JSONB) ──drives──> stage, progress, alerts, dashboard sections, schedule, map
```

---

## 5. Current User Workflows

**Hydroseeding lead-to-cash:**
1. Call comes in (RingCentral etc.) → **+ New** → enter customer, city, service = Hydroseeding → check *Initial contact made*
2. Consultation/site visit → photos, sq ft, notes → check consultation steps
3. Soil samples collected → mailed (enter soil test # and mailed date) → *Results slow* alert nags after 8 days → results received
4. Build quote (Calc tab for materials/tanks) → send → enter quote $ + quote-sent date → check *Hydroseed quote sent* (+ site prep quote if toggled) → *No response / Quote stale* alerts at 7/14 days
5. Customer approves → check *Approved* → job appears in Ready to Move → *50% deposit received* → *Materials ordered* (Supercast order text from Calc) → set scheduled date + check *Job scheduled* → appears on Schedule tab with deposit status
6. Spray day (Ref tab procedures; Ops tab equipment checks) → check *Job complete*, set spray date → operator logs tanks on Pay tab
7. Care instructions sent → 14/30/90-day follow-ups (overdue alerts keyed off spray date) → job is Done

**Land management / simple:** contact → consult → quote → approve → deposit → schedule → complete → 3-day follow-up.

**Lost lead:** open job → *Mark as dead / lost* → pick reason → job drops to Dead Leads.

**Weekly pay:** operator logs daily production → app auto-builds the weekly pay period → owner reviews breakdown → Approve → Mark Paid.

---

## 6. Component Inventory

| File | Lines | Purpose |
|---|---|---|
| `app/page.js` | 599 | Root: PIN gate, data load/poll/save, all shared state, tab bar, bottom KPI bar, renders every tab |
| `app/layout.js` | 21 | Root layout, metadata, PWA/viewport meta |
| `app/globals.css` | 591 | Theme variables, base input/button styles, all shared class styles |
| `components/CommandCenter.js` | 235 | Dashboard tab: KPI strip + operational sections |
| `components/JobDetail.js` | 654 | Bottom-sheet modal: full job form, photos, checklist, dead-lead, save/delete |
| `components/JobCard.js` | 128 | Compact job card for the Jobs list (stage, days-in-stage, next action, quick-advance) |
| `components/JobRow.js` | 77 | Even more compact row used inside Dashboard sections |
| `components/FilterBar.js` | 198 | Jobs search box + collapsible filter panel (smart/stage/service/assigned/county) |
| `components/WeekCalendar.js` | 169 | Schedule tab: Mon–Sun week view with deposit status |
| `components/MapView.js` | 365 | Map tab: Leaflet CDN loader, city geocoding table, markers, filters, job lists |
| `components/MaterialsCalc.js` | 181 | Calc tab: tank/materials math, cost line items, Supercast order generator, material editor |
| `components/QuickRefTab.js` | 75 | Ref tab: 14 hardcoded reference accordions |
| `components/OpsChecklistTab.js` | 58 | Ops tab: 5 equipment checklists with progress bars (not persisted) |
| `components/PayTab.js` | 532 | Pay tab: production log form, entries, pay history, season totals |
| `components/CheckItem.js` | 40 | Single checklist row (checkbox + strikethrough label) |
| `components/ProgressBar.js` | 25 | Thin colored progress bar |
| `lib/jobUtils.js` | 279 | Business logic: checklists, stages, progress, urgency, alerts, constants |
| `lib/supabase.js` | 109 | Supabase client + jobs CRUD with camelCase↔snake_case mapping |
| `lib/payUtils.js` | 67 | Pay rates, week math, pay calculation, formatting |
| `lib/productionApi.js` | 192 | CRUD for production_logs and pay_periods, weekly recalc, season totals |
| `scripts/migrate-to-supabase.mjs` | 220 | One-time Google Sheets CSV → Supabase import (contains outdated SQL — see audit) |
| `archive/*` | — | Retired Google Sheets/Apps Script backend (unused) |

---

## 7. Environment Variables

| Variable | Used in | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.js:3`, migrate script | Required. If missing, the client is `null` and the app silently runs with no data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.js:4`, migrate script | Required. Public in the JS bundle by design (`NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_PIN_CODE` | `app/page.js:28` | Optional, defaults to `2024`. Also public in the bundle |
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | `.env.local.example:9` | Legacy, commented out, unused |
