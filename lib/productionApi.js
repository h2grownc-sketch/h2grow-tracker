// ============================================
// H2 GROW — Production Log & Pay Period API
// ============================================

import { supabase } from "./supabase";
import { getWeekStart, getWeekEnd, calculatePay } from "./payUtils";

// ── Production Logs ──

export async function fetchProductionLogs(daysBack = 14) {
  if (!supabase) return [];
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const { data, error } = await supabase
      .from("production_logs")
      .select("*")
      .gte("log_date", since.toISOString().split("T")[0])
      .order("log_date", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchProductionLogs error:", e);
    return [];
  }
}

export async function fetchLogsForWeek(weekStart) {
  if (!supabase) return [];
  try {
    const weekEnd = getWeekEnd(weekStart);
    const { data, error } = await supabase
      .from("production_logs")
      .select("*")
      .gte("log_date", weekStart)
      .lte("log_date", weekEnd)
      .order("log_date", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchLogsForWeek error:", e);
    return [];
  }
}

export async function saveProductionLog(log) {
  if (!supabase) return false;
  try {
    if (log.id) {
      const { error } = await supabase.from("production_logs").update(log).eq("id", log.id);
      if (error) throw error;
    } else {
      const { id, ...rest } = log;
      const { error } = await supabase.from("production_logs").insert(rest);
      if (error) throw error;
    }
    // Recalculate pay period for the affected week
    await recalcPayPeriod(log.log_date);
    return true;
  } catch (e) {
    console.error("saveProductionLog error:", e);
    return false;
  }
}

export async function deleteProductionLog(log) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("production_logs").delete().eq("id", log.id);
    if (error) throw error;
    await recalcPayPeriod(log.log_date);
    return true;
  } catch (e) {
    console.error("deleteProductionLog error:", e);
    return false;
  }
}

export async function toggleQuality(log) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("production_logs")
      .update({ quality_approved: !log.quality_approved })
      .eq("id", log.id);
    if (error) throw error;
    await recalcPayPeriod(log.log_date);
    return true;
  } catch (e) {
    console.error("toggleQuality error:", e);
    return false;
  }
}

// ── Pay Periods ──

async function recalcPayPeriod(dateStr) {
  if (!supabase) return;
  const weekStart = getWeekStart(dateStr);
  const weekEnd = getWeekEnd(weekStart);
  const logs = await fetchLogsForWeek(weekStart);
  const pay = calculatePay(logs);

  const record = {
    week_start: weekStart,
    week_end: weekEnd,
    base_pay: pay.basePay,
    total_tanks: pay.totalTanks,
    total_skid_hours: pay.totalSkidHours,
    hydroseed_pay: pay.hydroseedPay,
    skid_steer_pay: pay.skidSteerPay,
    total_pay: pay.totalPay,
  };

  try {
    const { error } = await supabase
      .from("pay_periods")
      .upsert(record, { onConflict: "week_start" });
    if (error) throw error;
  } catch (e) {
    console.error("recalcPayPeriod error:", e);
  }
}

export async function fetchPayPeriods(limit = 12) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("pay_periods")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("fetchPayPeriods error:", e);
    return [];
  }
}

export async function updatePayPeriodStatus(weekStart, status, paidDate) {
  if (!supabase) return false;
  try {
    const update = { status };
    if (paidDate) update.paid_date = paidDate;
    const { error } = await supabase
      .from("pay_periods")
      .update(update)
      .eq("week_start", weekStart);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("updatePayPeriodStatus error:", e);
    return false;
  }
}

// ── Season Totals ──

export async function fetchSeasonTotals(year) {
  if (!supabase) return null;
  try {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const { data, error } = await supabase
      .from("pay_periods")
      .select("*")
      .gte("week_start", yearStart)
      .lte("week_start", yearEnd);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const totals = {
      weeks: data.length,
      totalTanks: data.reduce((s, p) => s + (parseInt(p.total_tanks) || 0), 0),
      totalSkidHours: data.reduce((s, p) => s + (parseFloat(p.total_skid_hours) || 0), 0),
      totalBasePay: data.reduce((s, p) => s + (parseFloat(p.base_pay) || 0), 0),
      totalHydroseedPay: data.reduce((s, p) => s + (parseFloat(p.hydroseed_pay) || 0), 0),
      totalSkidSteerPay: data.reduce((s, p) => s + (parseFloat(p.skid_steer_pay) || 0), 0),
      totalPay: data.reduce((s, p) => s + (parseFloat(p.total_pay) || 0), 0),
    };
    totals.avgWeeklyPay = totals.weeks > 0 ? totals.totalPay / totals.weeks : 0;
    return totals;
  } catch (e) {
    console.error("fetchSeasonTotals error:", e);
    return null;
  }
}
