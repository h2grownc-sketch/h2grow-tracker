"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import ProgressBar from "./ProgressBar";
import {
  PAY_RATES,
  calculatePay,
  formatCurrency,
  formatWeekLabel,
  getWeekStart,
  getWeekEnd,
} from "../lib/payUtils";
import {
  fetchProductionLogs,
  fetchLogsForWeek,
  saveProductionLog,
  deleteProductionLog,
  toggleQuality,
  fetchPayPeriods,
  updatePayPeriodStatus,
  fetchSeasonTotals,
} from "../lib/productionApi";

const lbl = {
  fontSize: 11,
  fontWeight: 600,
  color: "#999",
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  marginBottom: -4,
  display: "block",
  fontFamily: "var(--body-font)",
};

export default function PayTab({ jobs }) {
  const [logs, setLogs] = useState([]);
  const [payPeriods, setPayPeriods] = useState([]);
  const [seasonTotals, setSeasonTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState([]);

  // Form state
  const today = new Date().toISOString().split("T")[0];
  const [formDate, setFormDate] = useState(today);
  const [formJobId, setFormJobId] = useState("");
  const [formTanks, setFormTanks] = useState(0);
  const [formSkidHours, setFormSkidHours] = useState(0);
  const [formNotes, setFormNotes] = useState("");

  // Active jobs for the dropdown
  const activeJobs = useMemo(
    () => (jobs || []).filter((j) => !j.isDead).sort((a, b) => (a.customerName || "").localeCompare(b.customerName || "")),
    [jobs]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [l, p, s] = await Promise.all([
      fetchProductionLogs(30),
      fetchPayPeriods(12),
      fetchSeasonTotals(new Date().getFullYear()),
    ]);
    setLogs(l);
    setPayPeriods(p);
    setSeasonTotals(s);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Current week calculation
  const currentWeekStart = getWeekStart(today);
  const currentWeekEnd = getWeekEnd(currentWeekStart);
  const currentWeekLogs = useMemo(
    () => logs.filter((l) => l.log_date >= currentWeekStart && l.log_date <= currentWeekEnd),
    [logs, currentWeekStart, currentWeekEnd]
  );
  const currentPay = useMemo(() => calculatePay(currentWeekLogs), [currentWeekLogs]);

  // Save log
  const handleSave = async () => {
    if (formTanks === 0 && formSkidHours === 0) return;
    setSaving(true);
    await saveProductionLog({
      log_date: formDate,
      job_id: formJobId || null,
      tanks_sprayed: formTanks,
      skid_steer_hours: formSkidHours,
      notes: formNotes,
      operator: "Tate Anderson",
      quality_approved: true,
    });
    setFormTanks(0);
    setFormSkidHours(0);
    setFormNotes("");
    setFormJobId("");
    await loadData();
    setSaving(false);
  };

  // Delete log
  const handleDelete = async (log) => {
    if (!confirm("Delete this production entry?")) return;
    await deleteProductionLog(log);
    await loadData();
  };

  // Toggle quality
  const handleToggleQuality = async (log) => {
    await toggleQuality(log);
    await loadData();
  };

  // Expand a past week to see daily breakdown
  const handleExpandWeek = async (weekStart) => {
    if (expandedWeek === weekStart) {
      setExpandedWeek(null);
      setExpandedLogs([]);
      return;
    }
    const wl = await fetchLogsForWeek(weekStart);
    setExpandedLogs(wl);
    setExpandedWeek(weekStart);
  };

  // Mark pay period status
  const handleStatusChange = async (weekStart, newStatus) => {
    const paidDate = newStatus === "paid" ? today : null;
    await updatePayPeriodStatus(weekStart, newStatus, paidDate);
    await loadData();
  };

  // Find job name by id
  const jobName = (jobId) => {
    if (!jobId) return "—";
    const j = (jobs || []).find((x) => x.id === jobId);
    return j ? j.customerName : jobId.substring(0, 8);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
        Loading pay data...
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>
        Pay & Production
      </div>

      {/* ── Current Week Summary ── */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 13, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
          This Week — {formatWeekLabel(currentWeekStart, currentWeekEnd)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--heading-font)", color: "var(--accent)" }}>{currentPay.totalTanks}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Tanks</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--heading-font)", color: "var(--h2-blue)" }}>{currentPay.totalSkidHours}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Skid Hrs</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--heading-font)", color: "var(--text-primary)" }}>{currentPay.daysWorked}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Days</div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 10, fontSize: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text-secondary)" }}>
            <span>Base pay</span><span>{formatCurrency(currentPay.basePay)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text-secondary)" }}>
            <span>Hydroseed ({currentPay.totalTanks} tanks x ${PAY_RATES.PER_TANK})</span>
            <span>{formatCurrency(currentPay.hydroseedPay)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text-secondary)" }}>
            <span>Skid steer ({currentPay.totalSkidHours} hrs x ${PAY_RATES.PER_SKID_HOUR})</span>
            <span>{formatCurrency(currentPay.skidSteerPay)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontWeight: 700, fontSize: 18, fontFamily: "var(--heading-font)", borderTop: "1px solid var(--border-light)", marginTop: 6 }}>
            <span>Total</span>
            <span style={{ color: "var(--accent)" }}>{formatCurrency(currentPay.totalPay)}</span>
          </div>
        </div>
      </div>

      {/* ── Log Production Entry ── */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
          Log Production
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Job (optional)</label>
            <select value={formJobId} onChange={(e) => setFormJobId(e.target.value)}>
              <option value="">— No job —</option>
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.customerName}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Tanks Sprayed</label>
            <input
              type="number"
              min="0"
              max="20"
              value={formTanks}
              onChange={(e) => setFormTanks(parseInt(e.target.value) || 0)}
              style={{ fontSize: 18, fontWeight: 700, textAlign: "center", padding: "12px", fontFamily: "var(--heading-font)" }}
            />
          </div>
          <div>
            <label style={lbl}>Skid Steer Hours</label>
            <input
              type="number"
              min="0"
              max="12"
              step="0.5"
              value={formSkidHours}
              onChange={(e) => setFormSkidHours(parseFloat(e.target.value) || 0)}
              style={{ fontSize: 18, fontWeight: 700, textAlign: "center", padding: "12px", fontFamily: "var(--heading-font)" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Notes</label>
          <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes..." />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || (formTanks === 0 && formSkidHours === 0)}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 8,
            border: "none",
            background: (formTanks === 0 && formSkidHours === 0) ? "var(--border)" : "linear-gradient(135deg,#4CAF50,#5CBF2A)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Log Production"}
        </button>
      </div>

      {/* ── Recent Logs ── */}
      {logs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--heading-font)", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
            Recent Entries
          </div>
          {logs.slice(0, 14).map((log) => (
            <div
              key={log.id}
              style={{
                background: "var(--card-bg)",
                border: log.quality_approved === false ? "1.5px solid var(--danger)" : "1px solid var(--card-border)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 4,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: log.quality_approved === false ? 0.7 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(log.log_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  {log.tanks_sprayed > 0 && (
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>{log.tanks_sprayed} tanks</span>
                  )}
                  {log.skid_steer_hours > 0 && (
                    <span style={{ color: "var(--h2-blue)", fontWeight: 600 }}>{log.skid_steer_hours} hrs</span>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{jobName(log.job_id)}</span>
                </div>
                {log.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{log.notes}</div>}
                {log.quality_approved === false && (
                  <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600, marginTop: 2 }}>Quality flagged — excluded from pay</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => handleToggleQuality(log)}
                  title={log.quality_approved === false ? "Approve quality" : "Flag quality issue"}
                  style={{
                    background: "none",
                    border: "1px solid " + (log.quality_approved === false ? "var(--success)" : "var(--danger)"),
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 11,
                    color: log.quality_approved === false ? "var(--success)" : "var(--danger)",
                    fontWeight: 600,
                  }}
                >
                  {log.quality_approved === false ? "Approve" : "Flag"}
                </button>
                <button
                  onClick={() => handleDelete(log)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pay History ── */}
      {payPeriods.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--heading-font)", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
            Pay History
          </div>
          {payPeriods.map((pp) => {
            const isExpanded = expandedWeek === pp.week_start;
            const statusColors = { pending: "var(--warning)", approved: "var(--h2-blue)", paid: "var(--success)" };
            return (
              <div key={pp.week_start} style={{ marginBottom: 6 }}>
                <div
                  onClick={() => handleExpandWeek(pp.week_start)}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: isExpanded ? "8px 8px 0 0" : 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{formatWeekLabel(pp.week_start, pp.week_end)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {pp.total_tanks} tanks | {pp.total_skid_hours} skid hrs
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontFamily: "var(--heading-font)", fontSize: 15 }}>
                      {formatCurrency(pp.total_pay)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 3,
                        background: (statusColors[pp.status] || "var(--text-muted)") + "18",
                        color: statusColors[pp.status] || "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {pp.status}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "10px 12px" }}>
                    {/* Daily breakdown */}
                    {expandedLogs.map((dl) => (
                      <div key={dl.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border-light)", fontSize: 13 }}>
                        <span>
                          {new Date(dl.log_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {dl.job_id && <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>{jobName(dl.job_id)}</span>}
                        </span>
                        <span style={{ display: "flex", gap: 8 }}>
                          {dl.tanks_sprayed > 0 && <span style={{ color: "var(--accent)" }}>{dl.tanks_sprayed}T</span>}
                          {dl.skid_steer_hours > 0 && <span style={{ color: "var(--h2-blue)" }}>{dl.skid_steer_hours}h</span>}
                          {dl.quality_approved === false && <span style={{ color: "var(--danger)", fontSize: 11 }}>flagged</span>}
                        </span>
                      </div>
                    ))}
                    {expandedLogs.length === 0 && (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No entries this week</div>
                    )}

                    {/* Pay breakdown */}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                        <span>Base</span><span>{formatCurrency(pp.base_pay)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                        <span>Hydroseed ({pp.total_tanks}T)</span><span>{formatCurrency(pp.hydroseed_pay)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                        <span>Skid ({pp.total_skid_hours}h)</span><span>{formatCurrency(pp.skid_steer_pay)}</span>
                      </div>
                    </div>

                    {/* Status actions */}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {pp.status !== "approved" && (
                        <button onClick={() => handleStatusChange(pp.week_start, "approved")} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid var(--h2-blue)", background: "transparent", color: "var(--h2-blue)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                          Approve
                        </button>
                      )}
                      {pp.status !== "paid" && (
                        <button onClick={() => handleStatusChange(pp.week_start, "paid")} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                          Mark Paid
                        </button>
                      )}
                      {pp.status !== "pending" && (
                        <button onClick={() => handleStatusChange(pp.week_start, "pending")} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Season Totals ── */}
      {seasonTotals && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16 }}>
          <div style={{ fontFamily: "var(--heading-font)", fontSize: 13, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
            {new Date().getFullYear()} Season Totals
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--heading-font)", color: "var(--accent)" }}>{seasonTotals.totalTanks}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Tanks</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--heading-font)", color: "var(--h2-blue)" }}>{seasonTotals.totalSkidHours}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Skid Hrs</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--heading-font)" }}>{seasonTotals.weeks}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Weeks</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text-secondary)" }}>
              <span>Base pay</span><span>{formatCurrency(seasonTotals.totalBasePay)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text-secondary)" }}>
              <span>Hydroseed production</span><span>{formatCurrency(seasonTotals.totalHydroseedPay)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text-secondary)" }}>
              <span>Skid steer production</span><span>{formatCurrency(seasonTotals.totalSkidSteerPay)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontWeight: 700, fontSize: 16, fontFamily: "var(--heading-font)", borderTop: "1px solid var(--border-light)", marginTop: 4 }}>
              <span>Total earned</span>
              <span style={{ color: "var(--accent)" }}>{formatCurrency(seasonTotals.totalPay)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12, color: "var(--text-muted)" }}>
              <span>Avg weekly</span><span>{formatCurrency(seasonTotals.avgWeeklyPay)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
