# Estimator — One-Time Database Setup

The Calc tab's new Estimator needs three tables. Run this whole block once in
**Supabase → SQL Editor**. It is additive — nothing existing is touched. The
policies assume you completed the auth lockdown (signed-in users only).

```sql
-- Shared material catalog (costs sync across devices)
CREATE TABLE IF NOT EXISTS materials (
  id              text PRIMARY KEY,
  name            text NOT NULL DEFAULT '',
  category        text NOT NULL DEFAULT 'Other',
  unit            text NOT NULL DEFAULT 'each',
  cost_per_unit   numeric NOT NULL DEFAULT 0,
  prior_cost      numeric,
  cost_updated_at timestamptz,
  sqft_per_tank   numeric,
  bales_per_tank  numeric,
  lbs_per_bale    numeric,
  lbs_per_ksqft   numeric,
  lbs_per_tank    numeric,
  bags_per_tank   numeric,
  jugs_per_acre   numeric,
  active          boolean NOT NULL DEFAULT true,
  notes           text DEFAULT '',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- App-wide settings (estimator rates live under key 'estimator')
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Estimates — each row snapshots every rate it was built with (in data JSONB),
-- so later catalog/rate changes never alter an existing estimate.
CREATE TABLE IF NOT EXISTS estimates (
  id         text PRIMARY KEY,
  job_id     text,
  title      text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'draft',   -- draft | sent | approved | declined
  total_cost numeric NOT NULL DEFAULT 0,
  price      numeric NOT NULL DEFAULT 0,
  data       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON estimates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_estimates_job ON estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_updated ON estimates(updated_at);
```

After running it: open the app → Calc tab → the Estimator seeds its starting
material catalog automatically. Then:
1. **Rates** — replace the $0 assumption values with your real labor/equipment/
   mobilization numbers and preferred margin.
2. **Materials** — enter your real supplier costs per bale/bag/lb.
3. Build your first estimate, link it to a job, and use **Apply Price to Job**.
