// ============================================
// H2 GROW — Pay & Commission Utilities
// ============================================

export const PAY_RATES = {
  WEEKLY_BASE: 750,
  PER_TANK: 125,
  PER_SKID_HOUR: 25,
};

// Get Monday of the week for a given date
export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().split("T")[0];
}

// Get Sunday of the week for a given date
export function getWeekEnd(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

// Calculate pay from production logs
export function calculatePay(logs) {
  const approvedLogs = logs.filter((l) => l.quality_approved !== false);
  const totalTanks = approvedLogs.reduce((s, l) => s + (parseInt(l.tanks_sprayed) || 0), 0);
  const totalSkidHours = approvedLogs.reduce((s, l) => s + (parseFloat(l.skid_steer_hours) || 0), 0);
  const hydroseedPay = totalTanks * PAY_RATES.PER_TANK;
  const skidSteerPay = totalSkidHours * PAY_RATES.PER_SKID_HOUR;
  const totalPay = PAY_RATES.WEEKLY_BASE + hydroseedPay + skidSteerPay;

  return {
    totalTanks,
    totalSkidHours,
    basePay: PAY_RATES.WEEKLY_BASE,
    hydroseedPay,
    skidSteerPay,
    totalPay,
    daysWorked: new Set(approvedLogs.filter((l) => (l.tanks_sprayed > 0 || l.skid_steer_hours > 0)).map((l) => l.log_date)).size,
  };
}

// Format currency
export function formatCurrency(amount) {
  return "$" + Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format week label
export function formatWeekLabel(weekStart, weekEnd) {
  const s = new Date(weekStart + "T00:00:00");
  const e = new Date(weekEnd + "T00:00:00");
  return s.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " — " +
    e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
