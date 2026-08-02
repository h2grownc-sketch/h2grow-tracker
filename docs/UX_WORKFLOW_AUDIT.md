# H2 Grow Tracker — UX & Workflow Audit

Audit date: 2026-08-02. Companion to `docs/CURRENT_APP_MAP.md`. Every finding was verified in the code; file and line references point at the current source.

Severity scale:
- **P0** — can lose data or lock the business out; fix first
- **P1** — actively hurts daily use or trust in the data
- **P2** — friction, confusion, or quality risk
- **P3** — polish / housekeeping

---

## P0 — Critical

### P0-1. Backend failures are silent and look like total data loss
`fetchJobs` catches every error and returns an empty array (`lib/supabase.js:80-83`), and returns `[]` immediately when Supabase env vars are missing (`lib/supabase.js:72`). `saveJob` and `deleteJob` do the same with `false` (`lib/supabase.js:87, 100`). Because `fetchJobs` never throws, the `catch` in `loadData` that sets the OFFLINE flag can never run (`app/page.js:76-81`) — the OFFLINE badge (`app/page.js:351-353`) is dead code. Consequences:

- If the Supabase project is **paused, unreachable, or misconfigured**, the first load sets `jobs = []` and the app shows a friendly "No active jobs — Tap + New to add a lead" empty state. To the owner this looks like every job was deleted. **This already happened in production** when the free-tier Supabase project auto-paused.
- Saves fail silently: `handleSave` optimistically inserts the job locally, closes the modal, ignores `saveJob`'s `false`, then re-fetches (`app/page.js:89-102`). If the save failed but the fetch succeeds, the job the user just typed **vanishes from the list with no message** and the typed data is gone.
- The `if (data.length > 0 || !loaded) setJobs(data)` guard (`app/page.js:77`) protects against later polls wiping state, but not against the first load, and it also means a genuinely emptied table never reflects locally.

Fix direction: make the API layer return `{ ok, data, error }` (or rethrow), show a persistent error banner distinguishing "can't reach database" from "no jobs yet", keep the form open (or re-openable) on failed save, and surface save success/failure.

### P0-2. No real security: client-side PIN + allow-all database policy
- The PIN is compared in the browser against `NEXT_PUBLIC_PIN_CODE` (`app/page.js:28, 39-48`); any `NEXT_PUBLIC_` value ships in the public JS bundle, and the default is `2024` (documented in `.env.local.example:6`).
- The Supabase anon key is also in the bundle, and the `jobs` table policy is `FOR ALL USING (true) WITH CHECK (true)` (`scripts/migrate-to-supabase.mjs:104-107` — "PIN auth is app-level").
- Result: anyone who obtains the URL + anon key (both extractable from the site's JS) can read, modify, or delete **all customer PII (names, phones, emails, addresses), quotes, and pay data** without ever seeing the PIN screen. There are no per-user accounts and no audit trail of who changed what.

Fix direction: Supabase Auth (even a single shared email login) with RLS restricted to authenticated users is the minimum; per-user accounts would also give the "assigned to" field real meaning.

---

## P1 — High

### P1-1. Photos are base64 blobs concatenated into a text column
`components/JobDetail.js:75-89` reads each photo as a data-URL and joins them with `|||` into `job.photos`. No resizing or compression, so a modern phone photo is 3–10 MB, inflated ~33% by base64. Effects: job rows balloon; every save uploads **all** photos again (`upsert` of the whole row, `lib/supabase.js:90`); and because `fetchJobs` selects `*` on a 30-second poll (`app/page.js:87`, `lib/supabase.js:74-77`), every photo on every job is re-downloaded twice a minute on a field crew's mobile data. Saves will get noticeably slow after a handful of photos. Fix direction: Supabase Storage bucket + store URLs; at minimum, downscale/compress client-side before saving and exclude `photos` from the polling query.

### P1-2. Migration script's SQL does not match the live schema
`getCreateTableSQL()` in `scripts/migrate-to-supabase.mjs:75-123` generates a `jobs` table with **quoted camelCase columns** (`"customerName"`, `"dateCreated"`, …) while the app reads/writes **snake_case** (`customer_name`, `date_created` — `lib/supabase.js:11-29`), and the same script's own insert code maps to snake_case (`scripts/migrate-to-supabase.mjs:159-180`). The SQL is also missing columns the app now uses (`city`, `state`, `hydro_type`, `site_prep_amount`, `require_site_prep`, `soil_samples_required`, `is_dead`, `dead_reason`, `photos`). `SETUP-GUIDE.md` step 1.3 points new setups at this script. If anyone recreates the table from it — for example after the Supabase pause incident — the app will load an empty list and every save will fail (silently, per P0-1). Fix: replace with the real schema or delete the function.

### P1-3. Land-management follow-ups never alert
`getAlertMsg` only checks follow-up overdues for hydro jobs (`isHydro(job.serviceType)` gate at `lib/jobUtils.js:210`) and only 14/30/90-day keys. The simple pipeline's final step, `followUp3` ("3-day follow-up", `lib/jobUtils.js:35`), has **no overdue alert at all**, and `careSent` never alerts either. A completed forestry-mulching job just sits in the list; nothing nags. This directly undercuts the "reduce missed follow-ups" business goal. Also note the hydro follow-up alerts require `sprayDate` to be set (`lib/jobUtils.js:210`) — if the crew checks *Job complete* but forgets the date, follow-up alerts silently never fire.

### P1-4. Calc tab edits and Ops checklists are not saved anywhere
- `MaterialsCalc` keeps materials, costs, and custom products in `useState` only (`components/MaterialsCalc.js:24`). The owner can spend twenty minutes entering supplier costs, switch tabs (state survives) — but a refresh, PWA relaunch, or accidental back-swipe wipes everything with no warning.
- `OpsChecklistTab` checkboxes are `useState` only (`components/OpsChecklistTab.js:15`) and there is a single unconfirmed "Reset All". CLAUDE.md calls Ops business-critical, but a checked "Daily — T120" list evaporates on refresh, and there is no record of *when* maintenance was last done, which is the actual point of hour-based service intervals.

Fix direction: `localStorage` is a one-line improvement; a small Supabase table (with a completion date per checklist run) is the real fix for Ops.

### P1-5. Quote amounts are free text and silently break the Pipeline number
`quoteAmount`/`sitePrepAmount` are plain text inputs with placeholder "$0" (`components/JobDetail.js:332, 337`). Pipeline value uses `parseFloat` (`app/page.js:203-212`):
- `"$3,500"` → `NaN` → the KPI renders **"$NaN"** across the Dashboard and bottom bar;
- `"3,500"` → parses as **3** — a silently wrong pipeline total.
Also, "Pipeline" includes completed (Done) jobs since it only excludes dead ones (`app/page.js:206`), so the number overstates open work. Fix: numeric parsing/validation on entry (`inputMode="decimal"`, strip `$`/commas), and exclude done jobs from pipeline.

### P1-6. One-tap quick-advance has no confirmation and no undo
The "✓" button on every card/row marks the job's next step done and saves immediately (`app/page.js:115-118`, `components/JobCard.js:100-108`, `components/JobRow.js:41-51`). The targets are 26–28 px (`app/globals.css:163-177, 404-417`), well under the ~44 px touch minimum, sitting right next to the tap-to-open area — easy to hit by accident from a truck. A mistaken tap on "50% deposit received" or "Job complete" corrupts the workflow state with no toast, no undo; the user must notice, open the job, find the checkbox, and untick it. Fix: brief undo toast, and larger hit areas.

### P1-7. Deleting a job is permanent with only a generic confirm
`Delete` → `confirm("Delete permanently?")` → row removed from Supabase (`components/JobDetail.js:632-634`, `lib/supabase.js:99-109`). No soft-delete, no archive, no export, and per P0-2 no backup discipline is implied anywhere. One misread dialog destroys a customer history. The "Mark as dead / lost" flow already exists and is the right pattern — deletion should be rare, buried, or removed.

---

## P2 — Medium

### P2-1. Tab bar overflows with no visual affordance
8 tabs render in a `display:flex; overflowX:auto` strip (`app/page.js:392-415`). On a phone, "Ops" and "Pay" (and often "Ref") sit off-screen with no scroll hint, fade, chevron, or wrapping — the bar looks complete. **The owner personally missed the Ref tab because of this.** Fix: gradient fade/chevron at the edge, tighter padding so all 8 fit, or a bottom "More" grouping.

### P2-2. Loading / empty / error states are inconsistent across tabs
CLAUDE.md requires all three per view. Current reality:

| Tab | Loading | Empty | Error |
|---|---|---|---|
| App shell | Full-screen "Loading jobs..." (`app/page.js:288-306`) | — | **None** (P0-1) |
| Dashboard | none (sections just absent) | Yes (`components/CommandCenter.js:224-232`) | None |
| Jobs | none | Yes, two variants (`app/page.js:459-471`) | None |
| Schedule | none | Per-day "No jobs" (`components/WeekCalendar.js:116-120`) | None |
| Map | "Loading map..." (`components/MapView.js:259-263`) | Yes (`components/MapView.js:354-358`) | **None — if the unpkg CDN fails, "Loading map..." shows forever** (`components/MapView.js:84-99` has no `onerror`) |
| Calc | n/a | n/a | None |
| Ref | n/a | n/a | n/a |
| Ops | n/a | n/a | None |
| Pay | "Loading pay data..." (`components/PayTab.js:146-152`) | Sections silently hidden when empty (`components/PayTab.js:293, 370, 486`) — a brand-new week shows no history and no explanation | None (fetches swallow errors, `lib/productionApi.js:22-25`) |

### P2-3. Duplicate/parallel data entry with no synchronization
Several facts are recorded twice and nothing keeps them consistent:
- `estimateStatus` dropdown (Pending/Approved/Denied, `components/JobDetail.js:412-422`) vs `checks.approved` vs `isDead` — three unlinked ways to say "approved/denied".
- `checks.quoteSent` vs `quoteSentDate`, `checks.soilMailed` vs `sampleMailedDate`, `checks.scheduled` vs `scheduledDate`, `checks.jobComplete` vs `sprayDate`. Alerts and views require **both** halves: a job with `scheduled` checked but no date never appears on the Schedule tab or This Week (`components/WeekCalendar.js:18-20`, `components/CommandCenter.js:107-116`); a quote with no `quoteSentDate` never goes stale (`lib/jobUtils.js:188, 203`). These are quiet dead ends — the data looks fine but the safety nets are off. Fix: auto-stamp the date when the box is checked (and vice versa), or derive one from the other.
- Customer contact details are re-entered per job (no customer record); the autocomplete (`components/JobDetail.js:46-71`) helps but edits don't propagate to past jobs, and county/city must be retyped every time.

### P2-4. Service-type lists disagree between the form and the Map/CLAUDE.md
`SERVICE_TYPES` used by the job form has "Fertilization" and "Weed Control" and **no "Forestry Mulching"** (`lib/jobUtils.js:43-53`), while the Map filter list has "Forestry Mulching" and lacks the other two (`components/MapView.js:103`), matching the (also outdated) CLAUDE.md list. Net effect: the Map's "Forestry Mulching" filter can never match a job created in this app, and Fertilization/Weed Control jobs cannot be filtered on the map. Any legacy rows with "Forestry Mulching" can't be recreated via the form. One shared constant should feed both (Engineering Rules: reuse components).

### P2-5. Schedule week starts on the wrong week every Sunday
`WeekCalendar` computes Monday as `today.getDate() - today.getDay() + 1` (`components/WeekCalendar.js:9`); on Sundays (`getDay() === 0`) that yields **tomorrow**, so the "current" week shown is next week and today's jobs are hidden behind "Prev". `CommandCenter` (`components/CommandCenter.js:100-102`) and `payUtils.getWeekStart` (`lib/payUtils.js:19-20`) both handle Sunday correctly — three hand-rolled copies of the same logic, one wrong. Consolidate into `payUtils.getWeekStart`.

### P2-6. Accessibility gaps
- **Zoom is disabled**: `maximum-scale=1, user-scalable=no` (`app/layout.js:8`) — blocks pinch-zoom for low-vision users and is ignored-but-flagged by iOS; also the deprecated metadata viewport pattern for Next 14.
- No `<label htmlFor>`/`id` association anywhere (e.g. `components/JobDetail.js:179-186`), so screen readers announce bare inputs and tapping a label doesn't focus its field.
- Icon-only buttons with no accessible name: quick-advance "✓", photo-remove "×" (`components/JobDetail.js:485-503`), log-delete "x" (`components/PayTab.js:350-362`).
- Muted text `#999` on white (`--text-muted`, `app/globals.css:15`) is ~2.8:1 contrast — fails WCAG AA for the 10–12 px labels it is used on; the `--warning` amber on white is also borderline at small sizes.
- Custom buttons have no visible focus style (only inputs do, `app/globals.css:52-55`); keyboard/switch users can't see where they are. Modal has no focus trap or Escape handling; the map's double-tap-to-open gesture (`components/MapView.js:299`) has no accessible or discoverable equivalent (only a hint line at `components/MapView.js:360-362`).
- Job data is injected into Leaflet popup HTML with only quotes escaped (`components/MapView.js:174-184`); a job field containing HTML will render/execute in the popup — combined with P0-2 (anyone can write rows), this is a stored-XSS vector.

### P2-7. Inputs missing the right mobile keyboards
The PIN field does it right (`inputMode="numeric"`, `app/page.js:250`); nothing else does:
- Phone (`components/JobDetail.js:225-229`): no `type="tel"`/`inputMode="tel"`, no format hint enforcement.
- Quote $ / Site prep $ (`components/JobDetail.js:332, 337`): plain text, no `inputMode="decimal"` (see P1-5).
- Email: plain text, no `type="email"` and no validation despite CLAUDE.md's "types checked" rule.
- Soil test #, sq ft in the filter-free JobDetail (`type="number"` is set for sqft, good), Calc sqft ok; Assigned To/County fine as text.
Field crews get the full QWERTY keyboard for number entry.

### P2-8. No tests, no linting, no type checking
`package.json` has only `dev/build/start` scripts; there is no ESLint config (Next's default lint was never set up), no TypeScript, no test runner, and no CI. Given that stage/urgency/pay math is business-critical and CLAUDE.md demands identical checklist results after changes, even a handful of unit tests around `lib/jobUtils.js` and `lib/payUtils.js` plus `next lint` would materially de-risk future edits. The Sunday bug (P2-5) and list drift (P2-4) are exactly the kind of thing a test/lint pass catches.

### P2-9. No feedback on success anywhere
Saving a job just closes the sheet (`app/page.js:98`); logging production resets the form; "Copy Order to Clipboard" (`components/MaterialsCalc.js:165-173`) gives no confirmation and `navigator.clipboard` can be unavailable (non-HTTPS/older WebView) — the button then does nothing at all, silently. Pay status changes (Approve/Mark Paid) give no toast. Users on flaky field connections cannot distinguish "saved", "saving", and "failed" (see P0-1).

---

## P3 — Low / housekeeping

- **P3-1. Unfinished/disconnected pieces**: `docs/integrations-plan.md` describes a Settings tab, push notifications, and QuickBooks — explicitly "nothing built yet". `archive/sheets.js` and `archive/google-apps-script.js` are dead code. The `siteVisit` checklist key exists in CLAUDE.md but not in code (`lib/jobUtils.js:6-41`) — old rows may carry a bit nothing reads. CLAUDE.md also still says 7 tabs and omits Pay, `hydro_type`, and `photos`-format details; it should be refreshed so future AI/dev sessions don't work from a stale spec.
- **P3-2. PWA is nominal**: manifest icon is a JPEG with `sizes: "any"` (`public/manifest.json:9`) — Android install prompts want 192/512 px PNGs; there is no service worker, so the "installable" app is fully non-functional offline (and Leaflet comes from a CDN, `components/MapView.js:88-97`).
- **P3-3. Search doesn't cover phone, county, notes, or soil test #** (`app/page.js:128-133`) — looking a customer up by phone number when they call back fails.
- **P3-4. Pay tab job dropdown lists all non-dead jobs** including long-finished ones, alphabetically (`components/PayTab.js:55-58`) — scheduled/in-progress jobs should float to the top. `jobName` falls back to a truncated raw id for logs pointing at deleted jobs (`components/PayTab.js:140-144`).
- **P3-5. Date handling relies on `toISOString()` of local-midnight dates** (`components/WeekCalendar.js:88-89`, `components/CommandCenter.js:105-106`, `lib/payUtils.js:21`) — correct in US timezones, wrong east of UTC; fragile if ever reused.
- **P3-6. Tank coverage rates are hardcoded inline** (`components/MaterialsCalc.js:48` — 10,000/5,500/9,000 sq ft) and not editable in the material editor, so a new mulch product silently gets the 9,000 default; dye/lime quantities likewise hardcode per-tank amounts in the line items (`components/MaterialsCalc.js:62-63`) rather than reading the material's own fields.
- **P3-7. Terminology nits**: the "Consultation needed" checkbox is *checked to mark completion* of a step named as a need — checking it reads like "yes, still needed" (`lib/jobUtils.js:8`). "Recently Added" uses `dateCreated` but the variable is `recentlyUpdated` (`components/CommandCenter.js:119-125`). Simple-pipeline jobs show the header "Job Checklist" but the label "Quoted" while hydro says "Hydroseed quote sent" — fine, but the stage chip for both is "Quote Sent". The `--h2-blue`/"Approved"/"Job Day" color language is close between several stages on the map legend.
- **P3-8. Bottom stat bar duplicates the Dashboard KPI strip** (`app/page.js:537-585`) — same four numbers permanently on screen; costs 60 px of phone viewport on every tab. Consider removing or making it navigation.
- **P3-9. Session-only login** (`sessionStorage`, `app/page.js:36`) — the PIN must be re-entered every time the PWA is relaunched, which nudges users toward resenting the (already non-protective) PIN. If real auth arrives (P0-2), use persistent sessions.

---

## Suggested order of attack

1. **P0-1 + P0-2 together**: error/offline banner + save failure handling, then Supabase Auth with locked-down RLS (this also mitigates the XSS in P2-6).
2. **P1-2**: fix or delete the migration SQL before anyone runs it.
3. **P1-1**: move photos to Storage; stop polling them.
4. **P1-5 / P2-3**: numeric quote fields, auto-stamp dates from checkboxes.
5. **P1-3, P1-6, P2-1, P2-5**: alert coverage, undo for quick-advance, tab-bar affordance, Sunday fix.
6. Then the P2 accessibility/keyboard items and P2-8 test/lint baseline, which protect everything after.
