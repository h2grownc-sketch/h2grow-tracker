// ============================================
// H2 GROW — Job Business Logic
// Merged: previous app features + current improvements
// ============================================

export const HYDRO_CHECKLIST = [
  { key: "contacted", label: "Initial contact made", group: "Lead" },
  { key: "consultationNeeded", label: "Consultation needed", group: "Consultation" },
  { key: "consultationComplete", label: "Consultation complete", group: "Consultation" },
  { key: "soilCollected", label: "Soil samples collected", group: "Soil Testing", soilOnly: true },
  { key: "soilMailed", label: "Samples mailed to lab", group: "Soil Testing", soilOnly: true },
  { key: "resultsReceived", label: "Results received", group: "Soil Testing", soilOnly: true },
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
  { key: "consultationNeeded", label: "Consultation needed", group: "Consultation" },
  { key: "consultationComplete", label: "Consultation complete", group: "Consultation" },
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

// getChecklist returns the applicable checklist for a job.
// Pass soilRequired=false to exclude soil-only steps from hydro checklist.
export function getChecklist(serviceType, soilRequired) {
  if (!isHydro(serviceType)) return SIMPLE_CHECKLIST;
  // If soilRequired is explicitly false, filter out soil-only items
  if (soilRequired === false) {
    return HYDRO_CHECKLIST.filter((c) => !c.soilOnly);
  }
  return HYDRO_CHECKLIST;
}

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
    soilSamplesRequired: true,
    isDead: false,
    deadReason: "",
    photos: "",
  };
}

export function getStage(ch, serviceType, soilRequired) {
  if (!ch) return { label: "New Lead", color: "#5BA3D1" };
  const cl = getChecklist(serviceType, soilRequired);
  if (ch[cl[cl.length - 1].key]) return { label: "Done", color: "#999" };
  if (ch.jobComplete) return { label: "Follow-Up", color: "#43A047" };
  if (ch.scheduled) return { label: "Job Day", color: "#2E7D32" };
  if (ch.approved) return { label: "Approved", color: "#4CAF50" };
  if (ch.quoteSent) return { label: "Quote Sent", color: "#D4740A" };
  if (isHydro(serviceType) && soilRequired !== false) {
    if (ch.resultsReceived) return { label: "Quoting", color: "#D4740A" };
    if (ch.soilMailed) return { label: "Awaiting Results", color: "#C48A08" };
    if (ch.soilCollected) return { label: "Sampling", color: "#8B6FC0" };
  }
  if (ch.consultationComplete) return { label: "Consulted", color: "#7B8EC2" };
  if (ch.consultationNeeded) return { label: "Consultation", color: "#B07CC6" };
  if (ch.contacted) return { label: "Contacted", color: "#5BA3D1" };
  return { label: "New Lead", color: "#5BA3D1" };
}

export function getProgress(ch, serviceType, soilRequired) {
  if (!ch) return 0;
  const cl = getChecklist(serviceType, soilRequired);
  return Math.round((cl.filter((c) => ch[c.key]).length / cl.length) * 100);
}

export function getNextAction(ch, serviceType, soilRequired, job) {
  if (!ch) return getChecklist(serviceType, soilRequired)[0];
  for (const c of getChecklist(serviceType, soilRequired)) {
    // Skip sitePrepQuoteSent if job doesn't require site prep
    if (c.key === "sitePrepQuoteSent" && job && !job.requiresSitePrep) continue;
    if (!ch[c.key]) return c;
  }
  return null;
}

export function getUrgency(job) {
  if (job.isDead) return 8888;
  const soil = job.soilSamplesRequired !== false;
  const now = Date.now(),
    created = new Date(job.dateCreated).getTime(),
    next = getNextAction(job.checks, job.serviceType, soil ? undefined : false, job),
    cl = getChecklist(job.serviceType, soil ? undefined : false);
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
    job.soilSamplesRequired !== false &&
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
  const soil = job.soilSamplesRequired !== false;
  const cl = getChecklist(job.serviceType, soil ? undefined : false);
  const lastKey = cl[cl.length - 1]?.key;
  return lastKey ? !!job.checks[lastKey] : false;
}

// Helper: extract soil flag for a job (undefined = default/required, false = not required)
export function soilFlag(job) {
  return isHydro(job.serviceType) && job.soilSamplesRequired === false ? false : undefined;
}

export function jobLocation(job) {
  return [job.address, job.city, job.state].filter(Boolean).join(", ");
}

// All possible stage labels for filtering
export const STAGE_LABELS = [
  "New Lead",
  "Contacted",
  "Consultation",
  "Consulted",
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
