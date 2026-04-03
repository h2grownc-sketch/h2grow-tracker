"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchJobs, saveJob as apiSaveJob, deleteJob as apiDeleteJob } from "../lib/supabase";
import {
  CHECKLIST,
  generateId,
  emptyJob,
  getStage,
  getProgress,
  getUrgency,
  getAlertMsg,
  getNextAction,
} from "../lib/jobUtils";
import JobCard from "../components/JobCard";
import JobDetail from "../components/JobDetail";
import WeekCalendar from "../components/WeekCalendar";
import FilterBar from "../components/FilterBar";
import CommandCenter from "../components/CommandCenter";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [offline, setOffline] = useState(false);
  const [stageFilter, setStageFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");

  const loadData = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await fetchJobs();
      if (data.length > 0 || !loaded) setJobs(data);
      setOffline(false);
    } catch {
      setOffline(true);
    }
    setSyncing(false);
    setLoaded(true);
  }, [loaded]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { const i = setInterval(loadData, 30000); return () => clearInterval(i); }, [loadData]);

  const handleSave = async (job) => {
    setSaving(true);
    const id = job.id === "NEW" ? generateId() : job.id;
    const saved = { ...job, id };
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [...prev, saved];
    });
    setEditing(null);
    await apiSaveJob(saved);
    setSaving(false);
    loadData();
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setEditing(null);
    await apiDeleteJob(id);
    setSaving(false);
    loadData();
  };

  const handleNew = () => setEditing(emptyJob());

  // Quick-advance: toggle one checklist item and save immediately
  const handleQuickAdvance = async (job, checkKey) => {
    const updated = {
      ...job,
      checks: { ...job.checks, [checkKey]: true },
    };
    await handleSave(updated);
  };

  // === Core derived data (same calculations as before) ===
  const activeJobs = useMemo(
    () =>
      jobs
        .filter((j) => !j.checks?.followUp90)
        .filter((j) => {
          if (!search) return true;
          const s = search.toLowerCase();
          return (
            (j.customerName || "").toLowerCase().includes(s) ||
            (j.address || "").toLowerCase().includes(s) ||
            (j.serviceType || "").toLowerCase().includes(s)
          );
        })
        .sort((a, b) => getUrgency(a) - getUrgency(b)),
    [jobs, search]
  );

  const doneJobs = jobs.filter((j) => j.checks?.followUp90);
  const alerts = jobs.filter((j) => getAlertMsg(j));
  const scheduled = jobs.filter(
    (j) => j.scheduledDate && j.checks?.scheduled && !j.checks?.followUp90
  );

  // === Filter logic (applied on top of activeJobs — additive, not replacing) ===
  const filteredJobs = useMemo(() => {
    let result = activeJobs;
    if (stageFilter !== "All") {
      result = result.filter((j) => getStage(j.checks).label === stageFilter);
    }
    if (serviceFilter !== "All") {
      result = result.filter((j) => j.serviceType === serviceFilter);
    }
    return result;
  }, [activeJobs, stageFilter, serviceFilter]);

  // Stage counts for filter badges
  const stageCounts = useMemo(() => {
    const counts = {};
    activeJobs.forEach((j) => {
      const label = getStage(j.checks).label;
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [activeJobs]);

  // Service type counts for filter badges
  const serviceCounts = useMemo(() => {
    const counts = {};
    activeJobs.forEach((j) => {
      if (j.serviceType) counts[j.serviceType] = (counts[j.serviceType] || 0) + 1;
    });
    return counts;
  }, [activeJobs]);

  // Pipeline $ — identical calculation to original
  const pipelineValue = useMemo(
    () =>
      jobs
        .filter((j) => j.quoteAmount && !j.checks?.followUp90)
        .reduce((s, j) => s + parseFloat(j.quoteAmount || 0), 0),
    [jobs]
  );

  // === Loading screen ===
  if (!loaded)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--heading-font)" }}>
            <span style={{ color: "var(--h2-blue)" }}>H2</span>{" "}
            <span style={{ color: "var(--grow-green)" }}>GROW</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Loading...</div>
        </div>
      </div>
    );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "pipeline", label: "Pipeline", icon: "📋" },
    { id: "schedule", label: "Schedule", icon: "📅" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div
        style={{
          background: "var(--black)",
          padding: "10px 16px 0",
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "var(--heading-font)", fontSize: 22, fontWeight: 700 }}>
              <span style={{ color: "var(--h2-blue)" }}>H2</span>{" "}
              <span style={{ color: "var(--grow-green)" }}>GROW</span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "2.5px",
              }}
            >
              Tracker
            </div>
            {syncing && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--warning)",
                  animation: "pulse 1s infinite",
                }}
              />
            )}
            {offline && (
              <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600 }}>OFFLINE</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {alerts.length > 0 && (
              <div
                onClick={() => {
                  setView("pipeline");
                  setStageFilter("All");
                  setServiceFilter("All");
                }}
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  borderRadius: 3,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--heading-font)",
                }}
              >
                {alerts.length}
              </div>
            )}
            <button
              onClick={handleNew}
              style={{
                background: "linear-gradient(135deg,#4CAF50,#5CBF2A)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "9px 16px",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              + New
            </button>
          </div>
        </div>

        {/* Search — hidden on dashboard to save vertical space */}
        {view !== "dashboard" && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH..."
            style={{ letterSpacing: "1px", textTransform: "uppercase" }}
          />
        )}

        {/* Tabs */}
        <div style={{ display: "flex", marginTop: 8 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                flex: 1,
                padding: "9px 0",
                border: "none",
                borderBottom: view === t.id ? "3px solid var(--accent)" : "3px solid transparent",
                background: "transparent",
                color: view === t.id ? "var(--accent)" : "var(--text-muted)",
                fontWeight: view === t.id ? 600 : 400,
                fontSize: 14,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 14px 0" }}>
        {view === "dashboard" && (
          <CommandCenter
            jobs={jobs}
            activeJobs={activeJobs}
            alerts={alerts}
            scheduled={scheduled}
            pipelineValue={pipelineValue}
            onSelect={setEditing}
            onQuickAdvance={handleQuickAdvance}
            onNew={handleNew}
            onSwitchTab={setView}
          />
        )}

        {view === "pipeline" && (
          <>
            {/* Filter bar */}
            <FilterBar
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              serviceFilter={serviceFilter}
              setServiceFilter={setServiceFilter}
              stageCounts={stageCounts}
              serviceCounts={serviceCounts}
            />

            {/* Active filter summary */}
            {(stageFilter !== "All" || serviceFilter !== "All") && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                <span>
                  Showing {filteredJobs.length} of {activeJobs.length} active jobs
                </span>
                <button
                  onClick={() => { setStageFilter("All"); setServiceFilter("All"); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--h2-blue)",
                    fontSize: 12,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Job list */}
            {filteredJobs.length === 0 && !search && stageFilter === "All" && serviceFilter === "All" ? (
              <div style={{ textAlign: "center", padding: 50, color: "var(--text-muted)" }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🌱</div>
                <div
                  style={{
                    fontFamily: "var(--heading-font)",
                    fontWeight: 500,
                    fontSize: 20,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  No jobs yet
                </div>
                <div style={{ fontSize: 14 }}>
                  Tap <span style={{ color: "var(--accent)", fontWeight: 700 }}>+ NEW</span> to add your first lead
                </div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                No jobs match current filters
              </div>
            ) : (
              filteredJobs.map((j) => (
                <JobCard key={j.id} job={j} onSelect={setEditing} onQuickAdvance={handleQuickAdvance} />
              ))
            )}

            {/* Completed section */}
            {doneJobs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={() => setShowDone(!showDone)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontFamily: "var(--heading-font)",
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                  }}
                >
                  🏁 Completed ({doneJobs.length}) {showDone ? "▲" : "▼"}
                </button>
                {showDone &&
                  doneJobs.map((j) => (
                    <JobCard key={j.id} job={j} onSelect={setEditing} />
                  ))}
              </div>
            )}
          </>
        )}

        {view === "schedule" && <WeekCalendar jobs={jobs} onSelect={setEditing} />}
      </div>

      {/* Bottom stats — identical calculations */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--black)",
          borderTop: "1px solid var(--border)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-around",
          maxWidth: 800,
          margin: "0 auto",
          zIndex: 50,
        }}
      >
        {[
          { label: "Active", value: activeJobs.length, color: "var(--h2-blue)" },
          { label: "Scheduled", value: scheduled.length, color: "var(--grow-green)" },
          { label: "Alerts", value: alerts.length, color: alerts.length > 0 ? "var(--danger)" : "var(--text-muted)" },
          { label: "Pipeline $", value: "$" + pipelineValue.toLocaleString(), color: "var(--warning)" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: s.color,
                fontFamily: "var(--heading-font)",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <JobDetail
          job={editing}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
