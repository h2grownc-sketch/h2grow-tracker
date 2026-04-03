"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchJobs, saveJob as apiSaveJob, deleteJob as apiDeleteJob } from "../lib/supabase";
import {
  generateId,
  emptyJob,
  getStage,
  getProgress,
  getUrgency,
  getAlertMsg,
  getNextAction,
  getChecklist,
  isJobDone,
  isHydro,
} from "../lib/jobUtils";
import JobCard from "../components/JobCard";
import JobDetail from "../components/JobDetail";
import WeekCalendar from "../components/WeekCalendar";
import FilterBar from "../components/FilterBar";
import CommandCenter from "../components/CommandCenter";

const PIN_CODE = "2024";

export default function Dashboard() {
  // Auth
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("h2grow-auth") === "1")
      setAuthed(true);
  }, []);
  const handlePin = () => {
    if (pin === PIN_CODE) {
      setAuthed(true);
      if (typeof window !== "undefined") sessionStorage.setItem("h2grow-auth", "1");
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  // Data
  const [jobs, setJobs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [showDead, setShowDead] = useState(false);
  const [offline, setOffline] = useState(false);
  const [stageFilter, setStageFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");

  const loadData = useCallback(async () => {
    if (!authed) return;
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
  }, [loaded, authed]);

  useEffect(() => { if (authed) loadData(); }, [authed]);
  useEffect(() => { if (!authed) return; const i = setInterval(loadData, 30000); return () => clearInterval(i); }, [loadData, authed]);

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

  const handleQuickAdvance = async (job, checkKey) => {
    const updated = { ...job, checks: { ...job.checks, [checkKey]: true } };
    await handleSave(updated);
  };

  // === Derived data ===
  const activeJobs = useMemo(
    () =>
      jobs
        .filter((j) => !j.isDead && !isJobDone(j))
        .filter((j) => {
          if (!search) return true;
          const s = search.toLowerCase();
          return (
            (j.customerName || "").toLowerCase().includes(s) ||
            (j.address || "").toLowerCase().includes(s) ||
            (j.city || "").toLowerCase().includes(s) ||
            (j.serviceType || "").toLowerCase().includes(s)
          );
        })
        .sort((a, b) => getUrgency(a) - getUrgency(b)),
    [jobs, search]
  );

  const doneJobs = jobs.filter((j) => !j.isDead && isJobDone(j));
  const deadJobs = jobs.filter((j) => j.isDead);
  const alerts = jobs.filter((j) => getAlertMsg(j));
  const scheduled = jobs.filter(
    (j) => j.scheduledDate && j.checks?.scheduled && !j.isDead
  );

  // Filters
  const filteredJobs = useMemo(() => {
    let result = activeJobs;
    if (stageFilter !== "All") {
      result = result.filter((j) => getStage(j.checks, j.serviceType).label === stageFilter);
    }
    if (serviceFilter !== "All") {
      result = result.filter((j) => j.serviceType === serviceFilter);
    }
    return result;
  }, [activeJobs, stageFilter, serviceFilter]);

  const stageCounts = useMemo(() => {
    const counts = {};
    activeJobs.forEach((j) => {
      const label = getStage(j.checks, j.serviceType).label;
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [activeJobs]);

  const serviceCounts = useMemo(() => {
    const counts = {};
    activeJobs.forEach((j) => {
      if (j.serviceType) counts[j.serviceType] = (counts[j.serviceType] || 0) + 1;
    });
    return counts;
  }, [activeJobs]);

  // Pipeline $ includes sitePrepAmount
  const pipelineValue = useMemo(
    () =>
      jobs
        .filter((j) => !j.isDead && j.quoteAmount)
        .reduce(
          (s, j) => s + parseFloat(j.quoteAmount || 0) + parseFloat(j.sitePrepAmount || 0),
          0
        ),
    [jobs]
  );

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "jobs", label: "Jobs" },
    { id: "schedule", label: "Schedule" },
    { id: "map", label: "Map" },
    { id: "calc", label: "Calc" },
    { id: "ref", label: "Ref" },
    { id: "ops", label: "Ops" },
  ];

  // === PIN Screen ===
  if (!authed)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--light-bg)",
          gap: 16,
        }}
      >
        <img src="/logo.jpg" alt="H2 Grow" style={{ height: 64 }} />
        <div style={{ fontSize: 14, color: "var(--text-secondary)", fontFamily: "var(--body-font)" }}>
          Enter PIN to access
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => { if (e.key === "Enter") handlePin(); }}
            placeholder="••••"
            type="password"
            inputMode="numeric"
            maxLength={4}
            style={{
              width: 120,
              textAlign: "center",
              fontSize: 24,
              letterSpacing: "8px",
              padding: "12px",
              borderRadius: 10,
              border: pinError ? "2px solid var(--danger)" : "2px solid var(--border)",
              fontFamily: "var(--heading-font)",
            }}
          />
          <button
            onClick={handlePin}
            style={{
              background: "linear-gradient(135deg,#4CAF50,#5CBF2A)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 20px",
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontFamily: "var(--heading-font)",
            }}
          >
            Go
          </button>
        </div>
        {pinError && (
          <div style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>Wrong PIN</div>
        )}
      </div>
    );

  // === Loading ===
  if (!loaded)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--light-bg)",
          gap: 12,
        }}
      >
        <img src="/logo.jpg" alt="H2 Grow" style={{ height: 64 }} />
        <div style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "1px" }}>
          Loading jobs...
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 72, position: "relative" }}>
      {/* Logo watermark */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img src="/logo.jpg" alt="" style={{ width: 300 }} />
      </div>

      {/* Header */}
      <div
        style={{
          background: "var(--white)",
          padding: "10px 16px 0",
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo.jpg" alt="H2 Grow" style={{ height: 48 }} />
            {syncing && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: "#F5A623",
                  display: "inline-block",
                }}
              />
            )}
            {offline && (
              <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600 }}>OFFLINE</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {alerts.length > 0 && (
              <span
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  borderRadius: 20,
                  padding: "2px 9px",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--heading-font)",
                }}
              >
                {alerts.length}
              </span>
            )}
            <button
              onClick={handleNew}
              style={{
                background: "linear-gradient(135deg,#4CAF50,#5CBF2A)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                boxShadow: "0 2px 8px rgba(76,175,80,0.3)",
              }}
            >
              + New
            </button>
          </div>
        </div>

        {/* Search — only on Jobs tab */}
        {view === "jobs" && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            style={{
              background: "var(--light-bg)",
              border: "1px solid var(--border)",
              letterSpacing: "0.5px",
              fontSize: 14,
              marginBottom: 6,
              borderRadius: 8,
            }}
          />
        )}

        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                flex: "0 0 auto",
                padding: "10px 14px",
                border: "none",
                borderBottom: view === t.id ? "3px solid #4CAF50" : "3px solid transparent",
                background: "transparent",
                color: view === t.id ? "#4CAF50" : "var(--text-muted)",
                fontWeight: view === t.id ? 700 : 500,
                fontSize: 13,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                transition: "color 0.2s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "14px 14px 0", position: "relative", zIndex: 1 }}>
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

        {view === "jobs" && (
          <>
            <FilterBar
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              serviceFilter={serviceFilter}
              setServiceFilter={setServiceFilter}
              stageCounts={stageCounts}
              serviceCounts={serviceCounts}
            />

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
                  Showing {filteredJobs.length} of {activeJobs.length} active
                </span>
                <button
                  onClick={() => { setStageFilter("All"); setServiceFilter("All"); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--info)",
                    fontSize: 12,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}

            {filteredJobs.length === 0 && !search && stageFilter === "All" && serviceFilter === "All" ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <div
                  style={{
                    fontFamily: "var(--heading-font)",
                    fontWeight: 500,
                    fontSize: 20,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  No active jobs
                </div>
                <div style={{ fontSize: 14 }}>
                  Tap <span style={{ color: "var(--accent)", fontWeight: 700 }}>+ New</span> to add a lead
                </div>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                No jobs match current filters
              </div>
            ) : (
              filteredJobs.map((j) => (
                <JobCard key={j.id} job={j} onSelect={setEditing} onQuickAdvance={handleQuickAdvance} />
              ))
            )}

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
                  Completed ({doneJobs.length}) {showDone ? "−" : "+"}
                </button>
                {showDone && doneJobs.map((j) => <JobCard key={j.id} job={j} onSelect={setEditing} />)}
              </div>
            )}

            {deadJobs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => setShowDead(!showDead)}
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
                  Dead Leads ({deadJobs.length}) {showDead ? "−" : "+"}
                </button>
                {showDead && deadJobs.map((j) => <JobCard key={j.id} job={j} onSelect={setEditing} />)}
              </div>
            )}
          </>
        )}

        {view === "schedule" && <WeekCalendar jobs={jobs} onSelect={setEditing} />}

        {view === "map" && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Job Map</div>
            <div style={{ fontSize: 14 }}>Coming in Phase 2</div>
          </div>
        )}

        {view === "calc" && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Materials Calculator</div>
            <div style={{ fontSize: 14 }}>Coming in Phase 2</div>
          </div>
        )}

        {view === "ref" && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Quick Reference</div>
            <div style={{ fontSize: 14 }}>Coming in Phase 2</div>
          </div>
        )}

        {view === "ops" && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Ops Checklists</div>
            <div style={{ fontSize: 14 }}>Coming in Phase 2</div>
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--white)",
          borderTop: "1px solid var(--border)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-around",
          maxWidth: 800,
          margin: "0 auto",
          zIndex: 50,
          boxShadow: "0 -1px 6px rgba(0,0,0,0.04)",
        }}
      >
        {[
          { label: "Active", value: activeJobs.length, color: "var(--info)" },
          { label: "Scheduled", value: scheduled.length, color: "var(--grow-green)" },
          { label: "Alerts", value: alerts.length, color: alerts.length > 0 ? "var(--danger)" : "var(--text-muted)" },
          { label: "Pipeline", value: "$" + pipelineValue.toLocaleString(), color: "var(--warning)" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: s.color,
                fontFamily: "var(--heading-font)",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1.2px",
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
          allJobs={jobs}
        />
      )}
    </div>
  );
}
