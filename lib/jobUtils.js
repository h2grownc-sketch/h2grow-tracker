// ============================================
// H2 GROW — Job Business Logic
// Merged: previous app features + current improvements
// ============================================

export const HYDRO_CHECKLIST = [
  { key: "contacted", label: "Initial contact made", group: "Lead" },
  { key: "siteVisit", label: "Site visit / measurement", group: "Site Work" },
  { key: "soilCollected", label: "Soil samples collected", group: "Site Work" },
  { key: "soilMailed", label: "Samples mailed to lab", group: "Soil Testing" },
  { key: "resultsReceived", label: "Results received", group: "Soil Testing" },
  { key: "quoteSent", label: "Hydroseed quote sent", group: "Quote" },
  { key: "sitePrepQuoteSent", label: "Site prep quote sent", group: "Quote" },
  { key: "approved", label: "Customer approved", group: "Quote" },
  { key: "depositReceived", label: "50% deposit received", group: "Quote" },
  { key: "materialsOrdered", label: "Materials ordered", group: "Scheduling" },
  { key: "scheduled", label: "Job scheduled", group: "Scheduling" },
  { key: "jobComplete", label: "Job complete", group: "Execution" },
  { key: "careSent", label: "Care instructions sent", group: "Follow-Up" },
  { key: "followUp14", label: "14-day follow-up", group: "Follow-Up" },
  { key: "followUp30", label: "30-day follow-up", group: "Follow-Up" },
  { key: "followUp90", label: "90-day follow-up", group: "Follow-Up" },
];

export const SIMPLE_CHECKLIST = [
  { key: "contacted", label: "Initial contact made", group: "Lead" },
  { key: "quoteSent", label: "Quoted", group: "Quote" },
  { key: "approved", label: "Customer approved", group: "Quote" },
  { key: "depositReceived", label: "50% deposit received", group: "Quote" },
  { key: "scheduled", label: "Scheduled", group: "Scheduling" },
  { key: "jobComplete", label: "Complete", group: "Execution" },
  { key: "followUp3", label: "3-day follow-up", group: "Follow-Up" },
];

// Union of all possible check keys (for empty checks initialization)
export const ALL_CHECK_KEYS = [
  ...new Set([...HYDRO_CHECKLIST, ...SIMPLE_CHECKLIST].map((c) => c.key)),
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

export const DEAD_REASONS = [
  "No contact after multiple attempts",
  "Customer declined the quote",
  "Went with a competitor",
  "Budget / timing issue",
  "Other",
];

export const ESTIMATE_STATUSES = ["Pending", "Approved", "Denied"];

export const isHydro = (serviceType) => serviceType === "Hydroseeding";
export const getChecklist = (serviceType) =>
  isHydro(serviceType) ? HYDRO_CHECKLIST : SIMPLE_CHECKLIST;

export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export function emptyChecks() {
  const c = {};
  ALL_CHECK_KEYS.forEach((k) => (c[k] = false));
  return c;
}

export function emptyJob() {
  return {
    id: "NEW",
    customerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "NC",
    serviceType: "",
    sqft: "",
    source: "",
    notes: "",
    quoteAmount: "",
    sitePrepAmount: "",
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
    requiresSitePrep: false,
    isDead: false,
    deadReason: "",
    photos: "",
  };
}

export function getStage(ch, serviceType) {
  if (!ch) return { label: "New Lead", color: "#5BA3D1" };
  const cl = getChecklist(serviceType);
  if (ch[cl[cl.length - 1].key]) return { label: "Done", color: "#999" };
  if (ch.jobComplete) return { label: "Follow-Up", color: "#43A047" };
  if (ch.scheduled) return { label: "Job Day", color: "#2E7D32" };
  if (ch.approved) return { label: "Approved", color: "#4CAF50" };
  if (ch.quoteSent) return { label: "Quote Sent", color: "#D4740A" };
  if (isHydro(serviceType)) {
    if (ch.resultsReceived) return { label: "Quoting", color: "#D4740A" };
    if (ch.soilMailed) return { label: "Awaiting Results", color: "#C48A08" };
    if (ch.siteVisit) return { label: "Sampling", color: "#8B6FC0" };
  }
  if (ch.contacted) return { label: "Contacted", color: "#5BA3D1" };
  return { label: "New Lead", color: "#5BA3D1" };
}

export function getProgress(ch, serviceType) {
  if (!ch) return 0;
  const cl = getChecklist(serviceType);
  return Math.round((cl.filter((c) => ch[c.key]).length / cl.length) * 100);
}

export function getNextAction(ch, serviceType) {
  if (!ch) return getChecklist(serviceType)[0];
  for (const c of getChecklist(serviceType)) {
    if (!ch[c.key]) return c;
  }
  return null;
}

export function getUrgency(job) {
  if (job.isDead) return 8888;
  const now = Date.now(),
    created = new Date(job.dateCreated).getTime(),
    next = getNextAction(job.checks, job.serviceType),
    cl = getChecklist(job.serviceType);
  if (!next || job.checks?.[cl[cl.length - 1].key]) return 9999;
  const hrs = (now - created) / (1000 * 60 * 60);
  if (!job.checks?.contacted && hrs > 48) return -1000;
  if (job.checks?.quoteSent && !job.checks?.approved && job.quoteSentDate) {
    const d =
      (now - new Date(job.quoteSentDate).getTime()) / (1000 * 60 * 60 * 24);
    if (d > 14) return -500;
    if (d > 7) return -200;
  }
  return cl.findIndex((c) => c.key === next.key);
}

export function getAlertMsg(job) {
  if (job.isDead) return null;
  const now = Date.now(),
    hrs = (now - new Date(job.dateCreated).getTime()) / (1000 * 60 * 60);
  if (!job.checks?.contacted && hrs > 48)
    return "Not contacted — " + Math.floor(hrs / 24) + "d";
  if (job.checks?.quoteSent && !job.checks?.approved && job.quoteSentDate) {
    const d = Math.floor(
      (now - new Date(job.quoteSentDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (d > 14) return "Quote stale — " + d + "d";
    if (d > 7) return "No response — " + d + "d";
  }
  if (job.checks?.jobComplete && job.sprayDate && isHydro(job.serviceType)) {
    const d = Math.floor(
      (now - new Date(job.sprayDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (d > 92 && !job.checks?.followUp90) return "90-day overdue";
    if (d > 32 && !job.checks?.followUp30) return "30-day overdue";
    if (d > 16 && !job.checks?.followUp14) return "14-day overdue";
  }
  if (
    job.checks?.soilMailed &&
    !job.checks?.resultsReceived &&
    job.sampleMailedDate
  ) {
    const d = Math.floor(
      (now - new Date(job.sampleMailedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (d > 8) return "Results slow — " + d + "d";
  }
  return null;
}

export function isJobDone(job) {
  if (!job.checks) return false;
  const cl = getChecklist(job.serviceType);
  const lastKey = cl[cl.length - 1]?.key;
  return lastKey ? !!job.checks[lastKey] : false;
}

export function jobLocation(job) {
  return [job.address, job.city, job.state].filter(Boolean).join(", ");
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

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(d);
}

export function daysInStage(job) {
  const ch = job.checks;
  if (!ch) return daysSince(job.dateCreated);
  if (ch.jobComplete && job.sprayDate) return daysSince(job.sprayDate);
  if (ch.scheduled && job.scheduledDate) return daysSince(job.scheduledDate);
  if (ch.quoteSent && job.quoteSentDate) return daysSince(job.quoteSentDate);
  if (ch.soilMailed && job.sampleMailedDate) return daysSince(job.sampleMailedDate);
  return daysSince(job.dateCreated);
}
