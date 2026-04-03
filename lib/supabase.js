import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Map between app camelCase field names and Postgres snake_case column names
const toSnake = {
  customerName: "customer_name",
  serviceType: "service_type",
  dateCreated: "date_created",
  quoteSentDate: "quote_sent_date",
  scheduledDate: "scheduled_date",
  sprayDate: "spray_date",
  sampleMailedDate: "sample_mailed_date",
  quoteAmount: "quote_amount",
  soilTestNumber: "soil_test_number",
  assignedTo: "assigned_to",
  estimateStatus: "estimate_status",
};

const toCamel = Object.fromEntries(
  Object.entries(toSnake).map(([k, v]) => [v, k])
);

// Convert an app-format job to a DB row
function jobToRow(job) {
  const row = {};
  for (const [key, val] of Object.entries(job)) {
    const dbKey = toSnake[key] || key;
    row[dbKey] = key === "checks" && typeof val === "object" ? val : val;
  }
  return row;
}

// Convert a DB row to an app-format job
function rowToJob(row) {
  const job = {};
  for (const [key, val] of Object.entries(row)) {
    const appKey = toCamel[key] || key;
    if (appKey === "checks") {
      job[appKey] = typeof val === "string" ? JSON.parse(val) : val || {};
    } else if (appKey === "created_at" || appKey === "updated_at") {
      // Skip DB-only timestamps
    } else {
      job[appKey] = val ?? "";
    }
  }
  return job;
}

export async function fetchJobs() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("date_created", { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToJob);
  } catch (e) {
    console.error("fetchJobs error:", e);
    return [];
  }
}

export async function saveJob(job) {
  if (!supabase) return false;
  try {
    const row = jobToRow(job);
    const { error } = await supabase.from("jobs").upsert(row, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("saveJob error:", e);
    return false;
  }
}

export async function deleteJob(jobId) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("deleteJob error:", e);
    return false;
  }
}
