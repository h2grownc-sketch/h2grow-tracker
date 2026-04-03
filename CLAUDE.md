# H2 Grow Tracker — Project Guidelines

## Product Context

This app is the internal operating system for H2 Grow LLC, a hydroseeding and land management business. It tracks jobs from first contact through completion and follow-up.

## Primary Users

- **Owner / Estimator** — creates leads, builds quotes, reviews pipeline
- **Project Manager / Scheduler** — assigns work, manages the weekly schedule, monitors overdue items
- **Field Crew / Operator** — checks off completed steps from the field on mobile
- **Office Admin** — data entry, follow-up tracking, reporting

## Business Goals

- Track leads from first contact to completed work
- Manage hydroseeding and land management workflows separately
- Track soil sampling and lab result status
- Move approved work into scheduling quickly
- Give the PM clear visibility into what is waiting, ready, scheduled, in progress, and overdue
- Reduce missed follow-ups
- Improve quoting, scheduling, and operational visibility

## Critical Preservation Rule

**The Ops tab (My Jobs / Pipeline view) is business-critical.**

- Preserve ALL existing Ops tab data, fields, calculations, filters, reports, historical records, and dependencies
- Do NOT casually rename, delete, or restructure Ops-related data
- Any schema changes MUST preserve backward compatibility and include a safe migration path
- Back up the Google Sheet before any schema-touching work
- All 17 existing job fields and all 15 existing checklist keys must remain intact
- `getStage()`, `getProgress()`, `getUrgency()`, `getAlertMsg()`, and Pipeline $ calculations must produce identical results for existing data after any change

## Core Workflows

### Hydroseeding Pipeline
1. Initial Contact
2. Needs Soil Sampling / Measuring
3. Soil Samples Obtained
4. Soil Samples Mailed
5. Firm Estimate with Soil Results
6. Estimate Approved / Denied
7. Materials Ordered
8. Ready to Spray / Scheduled
9. 10-Day Follow-Up
10. 30-Day Follow-Up

### Land Management Pipeline
1. Initial Contact
2. Measured / Evaluated
3. Scheduled
4. Complete
5. 3-Day Follow-Up

## UX Priorities

- Mobile-friendly (field use is primary)
- Minimal clicks to complete common actions
- Simple, clean navigation
- High-signal dashboard (no clutter)
- Strong filtering (by stage, service type, PM)
- Next-action clarity on every job
- Clear overdue / alert indicators
- Easy attachment and photo handling
- Fast data entry with smart defaults

## Engineering Rules

- **Analyze before coding** — read existing code and understand dependencies before making changes
- **Protect existing workflows** — never break what's working
- **Preserve Ops tab data** — schema changes are additive only unless explicitly approved
- **Reuse components** — prefer extending existing code over creating parallel implementations
- **Avoid breaking changes** — new fields default to safe empty values for existing records
- **Add loading, empty, and error states** — every view should handle all three
- **Validate forms** — required fields enforced, types checked
- **Prefer maintainable code over hacks** — clean component structure, extracted utilities
- **Test after every phase** — verify all calculations, views, and data integrity

## Tech Stack

- **Frontend**: Next.js 14 + React 18
- **Backend**: Google Apps Script
- **Database**: Google Sheets (single "Jobs" sheet)
- **Deployment**: Vercel
- **Auth**: PIN code (2024)
- **PWA**: Installable on mobile via manifest.json

## Data Schema (Google Sheets — 17 columns)

```
id | customerName | phone | email | address | serviceType | sqft | notes |
source | dateCreated | quoteSentDate | scheduledDate | sprayDate |
sampleMailedDate | quoteAmount | soilTestNumber | checks (JSON)
```

### Checklist Keys (inside `checks` JSON)
```
contacted, siteVisit, soilCollected, soilMailed, resultsReceived,
quoteSent, approved, depositReceived, materialsOrdered, scheduled,
jobComplete, careSent, followUp14, followUp30, followUp90
```

## Service Types
Hydroseeding, Forestry Mulching, Site Prep / Grading, Drainage, Erosion Control, Food Plot, Skid Steer Work, Other

## Lead Sources
RingCentral, Website, Referral, Repeat, Facebook, Google, Other
