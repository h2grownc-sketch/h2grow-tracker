# H2 Grow Tracker — Change Log

## 2026-08-02 — Audit + reliability/UX hardening (this branch)
**Docs:** CURRENT_APP_MAP, UX_WORKFLOW_AUDIT (25 findings), IMPLEMENTATION_PLAN,
QUICKBOOKS_READINESS, SECURITY_UPGRADE, this changelog.

**Reliability (P0-1):** database failures now show a red banner instead of an
empty app; failed saves alert and keep typed data (jobs + production log);
failed deletes restore the row; success toasts. `fetchJobs` no longer swallows
errors (lib/supabase.js).

**Security (P0-2, flag off by default):** components/AuthGate.js — Supabase Auth
email/password login, enabled via NEXT_PUBLIC_USE_AUTH=true. RLS lockdown steps
in SECURITY_UPGRADE.md. PIN flow unchanged until enabled.

**Fixes:** migration script SQL rewritten to real snake_case schema (P1-2);
land-management 3-day follow-up + missing-completion-date alerts (P1-3);
"$"/comma-tolerant money parsing, completed jobs excluded from Pipeline $ (P1-5);
Sunday week-start bug in Schedule (P2-5); Map service-type filter synced to
SERVICE_TYPES (P2-4); Leaflet popup HTML escaped (XSS); Leaflet CDN failure now
shows an error instead of loading forever.

**Field usability:** photos compressed to ≤1280px JPEG before save (P1-1 interim);
Calc materials + Ops checklists persist per device, Ops shows cycle-start date,
Reset All confirms (P1-4); quick-advance ✓ 40px with undo toast (P1-6); delete
confirm names the customer (P1-7); tab-strip right-edge fade (P2-1); tel/email/
decimal keyboards + new Email field on the job form (P2-7); pinch-zoom
re-enabled, focus outlines, aria-labels (P2-6 partial); "Copied ✓" feedback on
Supercast order (P2-9); phone/county added to Jobs search; editable SqFt-per-tank
per mulch in Calc; clean Next 14 viewport metadata.

## Earlier (same session, already on main)
- Pay rates zeroed pending compensation package (rates in lib/payUtils.js).
- Merge: operator-readiness — Ref library grown to 14 sections (site visit,
  measuring, soil sampling+mailing, grass selection ×3, spray day, care &
  warranty), Hydroseeding Type field, service types refocused (dropped Forestry
  Mulching; added Fertilization, Weed Control), pay $250/wk + $150/tank +
  $15/soil sample, operator renamed "Project Manager".
- docs/integrations-plan.md — Settings tab + push notifications + QuickBooks
  laptop-day spec.
- Loading chart: Standard Residential Grass Mix (6 wood fiber + 2 Verdyol).

## Pre-session history (git log)
Supabase migration; command-center dashboard; Phase 1/2 merges (Map, Calc, Ref,
Ops); consultation/soil-toggle pipeline changes; Pay & Production tracking.
