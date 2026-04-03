const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

export async function fetchJobs() {
  if (!APPS_SCRIPT_URL) return [];
  try {
    const res = await fetch(APPS_SCRIPT_URL + "?action=getJobs", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.jobs || [];
  } catch (e) {
    console.error("fetchJobs error:", e);
    return [];
  }
}

export async function saveJob(job) {
  if (!APPS_SCRIPT_URL) return false;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "saveJob", job }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.error("saveJob error:", e);
    return false;
  }
}

export async function deleteJob(jobId) {
  if (!APPS_SCRIPT_URL) return false;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "deleteJob", jobId }),
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.error("deleteJob error:", e);
    return false;
  }
}
