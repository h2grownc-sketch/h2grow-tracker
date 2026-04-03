// ============================================
// H2 GROW — Job Business Logic
// Extracted from app/page.js — same logic, no modifications
// ============================================

export const CHECKLIST = [
  { key: "contacted", label: "Initial contact made" },
  { key: "siteVisit", label: "Site visit / measurement" },
  { key: "soilCollected", label: "Soil samples collected" },
  { key: "soilMailed", label: "Samples mailed to lab" },
  { key: "resultsReceived", label: "Results received" },
  { key: "quoteSent", label: "Quote built & sent" },
  { key: "approved", label: "Customer approved" },
  { key: "depositReceived", label: "50% deposit received" },
  { key: "materialsOrdered", label: "Materials ordered" },
  { key: "scheduled", label: "Job scheduled" },
  { key: "jobComplete", label: "Job complete" },
  { key: "careSent", label: "Care instructions sent" },
  { key: "followUp14", label: "14-day follow-up" },
  { key: "followUp30", label: "30-day follow-up" },
  { key: "followUp90", label: "90-day follow-up" },
];

export const SERVICE_TYPES = [
  "Hydroseeding",
  "Forestry Mulching",
  "Site Prep / Grading",
  "Drainage",
  "Erosion Control",
  "Food Plot",
  "Skid Steer Work",
  "Other",
];

export const LEAD_SOURCES = [
  "RingCentral",
  "Website",
  "Referral",
  "Repeat",
  "Facebook",
  "Google",
  "Other",
];

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export function emptyChecks() {
  const c = {};
  CHECKLIST.forEach((i) => (c[i.key] = false));
  return c;
}

export const ESTIMATE_STATUSES = ["Pending", "Approved", "Denied"];

export function emptyJob() {
  return {
    id: "NEW",
    customerName: "",
    phone: "",
    email: "",
    address: "",
    serviceType: "",
    sqft: "",
    source: "",
    notes: "",
    quoteAmount: "",
    soilTestNumber: "",
    sampleMailedDate: "",
    quoteSentDate: "",
    scheduledDate: "",
    sprayDate: "",
    dateCreated: new Date().toISOString(),
    checks: emptyChecks(),
    county: "",
    assignedTo: "",
    estimateStatus: "",
  };
}

export function getStage(ch) {
  if (ch.followUp90) return { label: "Done", color: "#555", icon: "🏁" };
  if (ch.jobComplete) return { label: "Follow-Up", color: "#3DD68C", icon: "🌱" };
  if (ch.scheduled) return { label: "Job Day", color: "#5CBF2A", icon: "🚜" };
  if (ch.approved) return { label: "Approved", color: "#4CAF50", icon: "✅" };
  if (ch.quoteSent) return { label: "Quote Sent", color: "#E87C4C", icon: "📋" };
  if (ch.resultsReceived) return { label: "Quoting", color: "#E87C4C", icon: "📋" };
  if (ch.soilMailed) return { label: "Awaiting Results", color: "#F5A623", icon: "🔬" };
  if (ch.siteVisit) return { label: "Sampling", color: "#A07CE8", icon: "📐" };
  if (ch.contacted) return { label: "Contacted", color: "#6BB8E8", icon: "📞" };
  return { label: "New Lead", color: "#6BB8E8", icon: "📞" };
}

export function getProgress(ch) {
  return Math.round(
    (CHECKLIST.filter((c) => ch[c.key]).length / CHECKLIST.length) * 100
  );
}

export function getNextAction(ch) {
  for (const c of CHECKLIST) {
    if (!ch[c.key]) return c;
  }
  return null;
}

export function getUrgency(job) {
  const now = Date.now(),
    created = new Date(job.dateCreated).getTime(),
    next = getNextAction(job.checks);
  if (!next || job.checks.followUp90) return 9999;
  const hrs = (now - created) / (1000 * 60 * 60);
  if (!job.checks.contacted && hrs > 48) return -1000;
  if (job.checks.quoteSent && !job.checks.approved && job.quoteSentDate) {
    const d =
      (now - new Date(job.quoteSentDate).getTime()) / (1000 * 60 * 60 * 24);
    if (d > 14) return -500;
    if (d > 7) return -200;
  }
  if (job.checks.jobComplete && job.sprayDate) {
    const d =
      (now - new Date(job.sprayDate).getTime()) / (1000 * 60 * 60 * 24);
    if ((d > 16 && !job.checks.followUp14) || (d > 32 && !job.checks.followUp30) || (d > 92 && !job.checks.followUp90))
      return -300;
  }
  return CHECKLIST.findIndex((c) => c.key === next.key);
}

export function getAlertMsg(job) {
  const now = Date.now(),
    hrs = (now - new Date(job.dateCreated).getTime()) / (1000 * 60 * 60);
  if (!job.checks.contacted && hrs > 48)
    return "Lead not contacted — " + Math.floor(hrs / 24) + " days";
  if (job.checks.quoteSent && !job.checks.approved && job.quoteSentDate) {
    const d = Math.floor(
      (now - new Date(job.quoteSentDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (d > 14) return "Quote stale — " + d + " days";
    if (d > 7) return "No response — " + d + " days";
  }
  if (job.checks.jobComplete && job.sprayDate) {
    const d = Math.floor(
      (now - new Date(job.sprayDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (d > 92 && !job.checks.followUp90) return "90-day follow-up overdue";
    if (d > 32 && !job.checks.followUp30) return "30-day follow-up overdue";
    if (d > 16 && !job.checks.followUp14) return "14-day follow-up overdue";
    if (d >= 12 && !job.checks.followUp14) return "14-day check-in due";
    if (d >= 28 && !job.checks.followUp30) return "30-day check-in due";
    if (d >= 88 && !job.checks.followUp90) return "90-day check-in due";
  }
  if (
    job.checks.soilMailed &&
    !job.checks.resultsReceived &&
    job.sampleMailedDate
  ) {
    const d = Math.floor(
      (now - new Date(job.sampleMailedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (d > 8) return "Soil results slow — " + d + " days";
  }
  return null;
}

// All possible stage labels for filtering
export const STAGE_LABELS = [
  "New Lead",
  "Contacted",
  "Sampling",
  "Awaiting Results",
  "Quoting",
  "Quote Sent",
  "Approved",
  "Job Day",
  "Follow-Up",
  "Done",
];

// Helper: days since a date string
export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(d);
}

// Helper: days in current stage (based on dateCreated as fallback)
export function daysInStage(job) {
  const ch = job.checks;
  // Find the most recent date that corresponds to the current stage
  if (ch.jobComplete && job.sprayDate) return daysSince(job.sprayDate);
  if (ch.scheduled && job.scheduledDate) return daysSince(job.scheduledDate);
  if (ch.quoteSent && job.quoteSentDate) return daysSince(job.quoteSentDate);
  if (ch.soilMailed && job.sampleMailedDate) return daysSince(job.sampleMailedDate);
  return daysSince(job.dateCreated);
}
