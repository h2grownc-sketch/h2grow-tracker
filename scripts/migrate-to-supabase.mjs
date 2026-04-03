// ============================================
// H2 GROW — Migrate Google Sheets CSV to Supabase
// Run: node scripts/migrate-to-supabase.mjs
// ============================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Set these before running, or use environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const CSV_PATH = process.argv[2] || "path/to/your/export.csv";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simple CSV parser that handles quoted fields with commas and newlines
function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1 || current[0] !== "") rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows;
}

async function testConnection() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from("jobs").select("id").limit(1);
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.log("Table 'jobs' does not exist yet. You need to create it first.");
      console.log("\nGo to Supabase Dashboard > SQL Editor and run this:\n");
      console.log(getCreateTableSQL());
      return false;
    }
    console.error("Connection error:", error.message);
    return false;
  }
  console.log("Connected! Table exists. Found", data?.length || 0, "existing rows.");
  return true;
}

function getCreateTableSQL() {
  return `
-- H2 Grow Jobs table — camelCase columns to match existing app code
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  "customerName" TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  "serviceType" TEXT DEFAULT '',
  sqft TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  source TEXT DEFAULT '',
  "dateCreated" TEXT DEFAULT '',
  "quoteSentDate" TEXT DEFAULT '',
  "scheduledDate" TEXT DEFAULT '',
  "sprayDate" TEXT DEFAULT '',
  "sampleMailedDate" TEXT DEFAULT '',
  "quoteAmount" TEXT DEFAULT '',
  "soilTestNumber" TEXT DEFAULT '',
  checks JSONB DEFAULT '{}',
  county TEXT DEFAULT '',
  "assignedTo" TEXT DEFAULT '',
  "estimateStatus" TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow all access (PIN auth is app-level)
CREATE POLICY "Allow all access" ON jobs FOR ALL USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_jobs_date_created ON jobs("dateCreated");
CREATE INDEX idx_jobs_scheduled_date ON jobs("scheduledDate");
CREATE INDEX idx_jobs_service_type ON jobs("serviceType");
  `.trim();
}

async function migrateCSV() {
  console.log("\nReading CSV:", CSV_PATH);
  const raw = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(raw);

  if (rows.length < 2) {
    console.log("No data rows found in CSV.");
    return;
  }

  const headers = rows[0];
  console.log("Headers:", headers.join(", "));
  console.log("Data rows:", rows.length - 1);

  const jobs = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue; // skip empty ID rows

    const job = {};
    headers.forEach((h, idx) => {
      job[h.trim()] = row[idx] || "";
    });

    // Parse checks JSON
    if (job.checks && typeof job.checks === "string") {
      try {
        job.checks = JSON.parse(job.checks);
      } catch {
        job.checks = {};
      }
    }

    // Map camelCase CSV headers to snake_case DB columns
    const mapped = {
      id: job.id,
      customer_name: job.customerName || "",
      phone: job.phone || "",
      email: job.email || "",
      address: job.address || "",
      service_type: job.serviceType || "",
      sqft: job.sqft || "",
      notes: job.notes || "",
      source: job.source || "",
      date_created: job.dateCreated || new Date().toISOString(),
      quote_sent_date: job.quoteSentDate || "",
      scheduled_date: job.scheduledDate || "",
      spray_date: job.sprayDate || "",
      sample_mailed_date: job.sampleMailedDate || "",
      quote_amount: job.quoteAmount || "",
      soil_test_number: job.soilTestNumber || "",
      checks: job.checks,
      county: job.county || "",
      assigned_to: job.assignedTo || "",
      estimate_status: job.estimateStatus || "",
    };

    jobs.push(mapped);
  }

  console.log(`\nParsed ${jobs.length} jobs. Inserting into Supabase...`);

  // Insert in batches of 10
  for (let i = 0; i < jobs.length; i += 10) {
    const batch = jobs.slice(i, i + 10);
    const { error } = await supabase.from("jobs").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Error inserting batch ${i / 10 + 1}:`, error.message);
      console.error("First job in failed batch:", JSON.stringify(batch[0], null, 2));
      return;
    }
    console.log(`  Inserted batch ${i / 10 + 1} (${batch.length} jobs)`);
  }

  console.log(`\nMigration complete! ${jobs.length} jobs imported.`);

  // Verify
  const { data, error } = await supabase.from("jobs").select("id, customer_name").order("date_created", { ascending: false });
  if (error) {
    console.error("Verification error:", error.message);
  } else {
    console.log(`\nVerification: ${data.length} jobs in Supabase:`);
    data.forEach((j) => console.log(`  - ${j.customer_name || "(no name)"} (${j.id})`));
  }
}

async function main() {
  const connected = await testConnection();
  if (!connected) {
    console.log("\n\nPlease create the table first, then re-run this script.");
    process.exit(1);
  }
  await migrateCSV();
}

main().catch(console.error);
