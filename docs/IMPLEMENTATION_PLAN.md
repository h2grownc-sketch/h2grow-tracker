# Implementation Plan & Status

Companion docs: CURRENT_APP_MAP.md (what exists), UX_WORKFLOW_AUDIT.md (findings,
P0–P3), QUICKBOOKS_READINESS.md, SECURITY_UPGRADE.md, H2GROW_CHANGELOG.md.

## Done this phase (Wave 1 + Wave 2 groundwork)
| Finding | Change |
|---|---|
| P0-1 silent data loss | fetchJobs now surfaces failures; red connection banner; failed saves alert AND keep your typed data (job form + Pay form); failed deletes restore the row; success toasts |
| P0-2 security | Real email/password login built (`AuthGate`), off by default behind `NEXT_PUBLIC_USE_AUTH` — turn-on steps in SECURITY_UPGRADE.md |
| P1-1 photo bloat | Photos now downscaled to ≤1280px JPEG (~10–30× smaller) before saving. Full fix (Supabase Storage) still recommended — next phase |
| P1-2 SQL landmine | Migration script's CREATE TABLE rewritten to the real snake_case schema incl. all current columns |
| P1-3 missed follow-ups | 3-day follow-up alert for land-management jobs; "completion date missing" alert when Job Complete is checked without a date |
| P1-4 lost entries | Calc material list and Ops checklists persist on-device (localStorage); Ops shows cycle start date; Reset All asks first |
| P1-5 $NaN pipeline | parseMoney tolerates "$"/commas everywhere the KPI math runs; money fields get decimal keyboards; completed jobs excluded from Pipeline $ |
| P1-6 mis-tap risk | Quick-advance ✓ enlarged (40px), labeled for screen readers, and every advance shows a toast with UNDO |
| P1-7 rough delete | Delete confirm names the customer and points to "Mark as dead" |
| P2-1 hidden tabs | Right-edge fade on the tab strip + tighter tab padding |
| P2-4 list drift | Map service filter now uses the shared SERVICE_TYPES constant |
| P2-5 Sunday bug | WeekCalendar uses the shared (correct) getWeekStart |
| P2-6 partial | Popup HTML escaped (XSS); pinch-zoom re-enabled; focus-visible outlines; aria-labels on ✓ buttons |
| P2-7 keyboards | tel/email/decimal input modes on job form; Email field added |
| P2-9 feedback | Toasts for save/advance/delete; "Copied ✓" + fallback on the Supercast order button |
| Build warnings | Next 14 viewport/themeColor moved to the viewport export (clean build) |

## Not done yet (needs owner action or decisions)
- **Turn on real login** — 4 steps in SECURITY_UPGRADE.md (your Supabase + Vercel).
- **Photos to Supabase Storage** — needs a Storage bucket; compression shipped as the interim fix.
- **Ops history in the database** — localStorage is per-device; a shared `ops_log` table is the real fix.
- **Estimator/quoting engine (Phase 6–7 of the program)** — the big one. Blocked on business inputs (below).
- Tests/lint baseline; date-stamp auto-sync between checkboxes and date fields (P2-3); dashboard money panel; CLAUDE.md refresh.

## Business decisions needed before the quoting engine
1. Real material costs (or confirm we start at $0 and you fill them in the catalog).
2. Target gross margin % (and whether you think in margin or markup).
3. Labor: crew size + loaded $/hr; equipment $/hr or per-job rates; mobilization/travel policy.
4. Deposit rule (50% everywhere, or varies?).
5. Should estimates live in the database (versioned, snapshotted) — recommended — or per-device?

## Suggested next phase order
1. Turn on auth (SECURITY_UPGRADE.md) — biggest risk closed for ~30 min of work.
2. Estimator v1: DB-backed material catalog + area/tank/margin quoting with per-estimate snapshots (answers above required).
3. Photos → Storage; Ops → shared table.
4. Estimate → QBO estimate/invoice (QUICKBOOKS_READINESS.md + integrations-plan.md).
5. Push notifications (integrations-plan.md).
