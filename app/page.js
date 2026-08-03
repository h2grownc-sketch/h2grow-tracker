"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { fetchJobs, saveJob as apiSaveJob, deleteJob as apiDeleteJob, isSupabaseConfigured, supabase } from "../lib/supabase";
import { parseMoney } from "../lib/jobUtils";
import { roleFromUser } from "../lib/auth";
import AuthGate from "../components/AuthGate";
import SettingsTab from "../components/SettingsTab";
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
  soilFlag,
} from "../lib/jobUtils";
import JobCard from "../components/JobCard";
import JobDetail from "../components/JobDetail";
import WeekCalendar from "../components/WeekCalendar";
import FilterBar from "../components/FilterBar";
import CommandCenter from "../components/CommandCenter";
import MapView from "../components/MapView";
import EstimatorTab from "../components/EstimatorTab";
import QuickRefTab from "../components/QuickRefTab";
import OpsChecklistTab from "../components/OpsChecklistTab";
import PayTab from "../components/PayTab";

const PIN_CODE = process.env.NEXT_PUBLIC_PIN_CODE || "2024";
// Feature flag: set NEXT_PUBLIC_USE_AUTH=true (plus Supabase Auth setup, see
// docs/SECURITY_UPGRADE.md) to replace the client-side PIN with real login.
const USE_AUTH = process.env.NEXT_PUBLIC_USE_AUTH === "true";

export default function Dashboard() {
  // Auth
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  // PIN mode has no user identity — everyone acts as owner (same as today).
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(USE_AUTH ? "crew" : "owner");
  const handleAuthed = useCallback((session) => {
    setCurrentUser(session?.user || null);
    setRole(roleFromUser(session?.user));
    setAuthed(true);
  }, []);
  const handleSignOut = useCallback(async () => {
    try { if (supabase) await supabase.auth.signOut(); } catch {}
    if (typeof window !== "undefined") sessionStorage.removeItem("h2grow-auth");
    setCurrentUser(null);
    setRole(USE_AUTH ? "crew" : "owner");
    setAuthed(false);
    setPin("");
  }, []);
  useEffect(() => {
    if (!USE_AUTH && typeof window !== "undefined" && sessionStorage.getItem("h2grow-auth") === "1")
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
  const [toast, setToast] = useState(null); // { msg, undo?, danger? }
  const toastTimer = useRef(null);
  const showToast = useCallback((msg, undo = null, danger = false) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, undo, danger });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 2500);
  }, []);
  const [stageFilter, setStageFilter] = useState("All");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [smartFilters, setSmartFilters] = useState({
    overdue: false,
    readyToSchedule: false,
    waitingSoil: false,
    waitingApproval: false,
  });
  const [assignedFilter, setAssignedFilter] = useState("");
  const [countyFilter, setCountyFilter] = useState("");

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
    const ok = await apiSaveJob(saved);
    setSaving(false);
    if (!ok) {
      // Keep the user's typed data: reopen the form instead of losing it.
      setEditing(saved);
      alert("SAVE FAILED — could not reach the database.\n\nYour entries are still on screen. Check your connection and tap Save again.");
      return false;
    }
    showToast("Saved — " + (saved.customerName || "job"));
    loadData();
    return true;
  };

  const handleDelete = async (id) => {
    setSaving(true);
    const removed = jobs.find((j) => j.id === id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setEditing(null);
    const ok = await apiDeleteJob(id);
    setSaving(false);
    if (!ok) {
      if (removed) setJobs((prev) => [...prev, removed]);
      alert("DELETE FAILED — could not reach the database. The job was not deleted.");
      return;
    }
    showToast("Deleted", null, true);
    loadData();
  };

  const handleNew = () => setEditing(emptyJob());

  const handleQuickAdvance = async (job, checkKey, label) => {
    const original = { ...job, checks: { ...job.checks } };
    const updated = { ...job, checks: { ...job.checks, [checkKey]: true } };
    const ok = await handleSave(updated);
    if (ok)
      showToast(
        (label || "Step") + " ✓ — " + (job.customerName || "job"),
        () => { handleSave(original); setToast(null); }
      );
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
            (j.serviceType || "").toLowerCase().includes(s) ||
            (s.replace(/\D/g, "").length >= 3 && (j.phone || "").replace(/\D/g, "").includes(s.replace(/\D/g, ""))) ||
            (j.county || "").toLowerCase().includes(s)
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

  // Filters — including smart filters
  const filteredJobs = useMemo(() => {
    let result = activeJobs;
    if (stageFilter !== "All") {
      result = result.filter((j) => getStage(j.checks, j.serviceType, soilFlag(j)).label === stageFilter);
    }
    if (serviceFilter !== "All") {
      result = result.filter((j) => j.serviceType === serviceFilter);
    }
    if (smartFilters.overdue) {
      result = result.filter((j) => getAlertMsg(j));
    }
    if (smartFilters.readyToSchedule) {
      result = result.filter((j) => j.checks?.approved && !j.checks?.scheduled);
    }
    if (smartFilters.waitingSoil) {
      result = result.filter((j) => j.checks?.soilMailed && !j.checks?.resultsReceived);
    }
    if (smartFilters.waitingApproval) {
      result = result.filter((j) => j.checks?.quoteSent && !j.checks?.approved);
    }
    if (assignedFilter) {
      const af = assignedFilter.toLowerCase();
      result = result.filter((j) => (j.assignedTo || "").toLowerCase().includes(af));
    }
    if (countyFilter) {
      const cf = countyFilter.toLowerCase();
      result = result.filter((j) => (j.county || "").toLowerCase().includes(cf));
    }
    return result;
  }, [activeJobs, stageFilter, serviceFilter, smartFilters, assignedFilter, countyFilter]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (stageFilter !== "All") c++;
    if (serviceFilter !== "All") c++;
    if (smartFilters.overdue) c++;
    if (smartFilters.readyToSchedule) c++;
    if (smartFilters.waitingSoil) c++;
    if (smartFilters.waitingApproval) c++;
    if (assignedFilter) c++;
    if (countyFilter) c++;
    return c;
  }, [stageFilter, serviceFilter, smartFilters, assignedFilter, countyFilter]);

  // Split filtered jobs into overdue vs normal
  const overdueJobs = useMemo(
    () => filteredJobs.filter((j) => getAlertMsg(j)),
    [filteredJobs]
  );
  const normalJobs = useMemo(
    () => filteredJobs.filter((j) => !getAlertMsg(j)),
    [filteredJobs]
  );

  // Pipeline $ = open (not dead, not complete) quoted work, incl. site prep.
  // parseMoney tolerates "$" and commas; jobComplete jobs are no longer "pipeline".
  const pipelineValue = useMemo(
    () =>
      jobs
        .filter((j) => !j.isDead && !j.checks?.jobComplete && j.quoteAmount)
        .reduce(
          (s, j) => s + parseMoney(j.quoteAmount) + parseMoney(j.sitePrepAmount),
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
    { id: "pay", label: "Pay" },
    { id: "settings", label: "Settings" },
  ];

  // === Login (Supabase Auth when enabled, PIN otherwise) ===
  if (!authed && USE_AUTH) return <AuthGate onAuthed={handleAuthed} />;
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

        {/* Tabs — right-edge fade signals the strip scrolls (Ref/Ops/Pay live off-screen on phones) */}
        <div style={{ position: "relative" }}>
        <div style={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", gap: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              style={{
                flex: "0 0 auto",
                padding: "10px 11px",
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
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 28, background: "linear-gradient(to right, transparent, var(--white))", pointerEvents: "none" }} />
        </div>

        {/* Database connection banner (P0-1: outages must never look like data loss) */}
        {(!isSupabaseConfigured || offline) && (
          <div style={{ background: "var(--danger)", color: "#fff", padding: "8px 14px", fontSize: 13, fontWeight: 600, borderRadius: 6, margin: "6px 0 2px" }} role="alert">
            {!isSupabaseConfigured
              ? "Database not configured — nothing will load or save. Check the app's Supabase settings."
              : "Can't reach the database — showing last loaded data. Changes will NOT save until connection returns. (If this persists, the Supabase project may be paused.)"}
          </div>
        )}
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
              search={search}
              setSearch={setSearch}
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              serviceFilter={serviceFilter}
              setServiceFilter={setServiceFilter}
              smartFilters={smartFilters}
              setSmartFilters={setSmartFilters}
              assignedFilter={assignedFilter}
              setAssignedFilter={setAssignedFilter}
              countyFilter={countyFilter}
              setCountyFilter={setCountyFilter}
              activeFilterCount={activeFilterCount}
            />

            {/* Filter summary */}
            {activeFilterCount > 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Showing {filteredJobs.length} of {activeJobs.length} active jobs
              </div>
            )}

            {filteredJobs.length === 0 && !search && activeFilterCount === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <div style={{ fontFamily: "var(--heading-font)", fontWeight: 500, fontSize: 20, textTransform: "uppercase", marginBottom: 6 }}>
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
              <>
                {/* Overdue section */}
                {overdueJobs.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="priority-header priority-overdue">
                      <span>Needs Attention</span>
                      <span className="priority-count" style={{ background: "var(--danger)", color: "#fff" }}>
                        {overdueJobs.length}
                      </span>
                    </div>
                    {overdueJobs.map((j) => (
                      <JobCard key={j.id} job={j} onSelect={setEditing} onQuickAdvance={handleQuickAdvance} />
                    ))}
                  </div>
                )}

                {/* Normal active jobs */}
                {normalJobs.length > 0 && (
                  <div>
                    {overdueJobs.length > 0 && (
                      <div className="priority-header">
                        <span>Active</span>
                        <span className="priority-count">{normalJobs.length}</span>
                      </div>
                    )}
                    {normalJobs.map((j) => (
                      <JobCard key={j.id} job={j} onSelect={setEditing} onQuickAdvance={handleQuickAdvance} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Completed */}
            {doneJobs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowDone(!showDone)} className="section-toggle">
                  Completed ({doneJobs.length}) {showDone ? "−" : "+"}
                </button>
                {showDone && doneJobs.map((j) => <JobCard key={j.id} job={j} onSelect={setEditing} />)}
              </div>
            )}

            {/* Dead Leads */}
            {deadJobs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowDead(!showDead)} className="section-toggle">
                  Dead Leads ({deadJobs.length}) {showDead ? "−" : "+"}
                </button>
                {showDead && deadJobs.map((j) => <JobCard key={j.id} job={j} onSelect={setEditing} />)}
              </div>
            )}
          </>
        )}

        {view === "schedule" && <WeekCalendar jobs={jobs} onSelect={setEditing} />}

        {view === "map" && <MapView jobs={jobs} onSelect={setEditing} />}
        {view === "calc" && (
          <EstimatorTab
            jobs={jobs}
            onApplyToJob={(jobId, price) => {
              const j = jobs.find((x) => x.id === jobId);
              if (j) handleSave({ ...j, quoteAmount: String(price) });
            }}
          />
        )}
        {view === "ref" && <QuickRefTab />}
        {view === "ops" && <OpsChecklistTab />}
        {view === "pay" && <PayTab jobs={jobs} />}
        {view === "settings" && (
          <SettingsTab useAuth={USE_AUTH} role={role} currentUser={currentUser} onSignOut={handleSignOut} />
        )}
      </div>

      {/* Toast (save feedback + undo for quick-advance) */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 74,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.danger ? "var(--danger)" : "#2A2A2A",
            color: "#fff",
            borderRadius: 10,
            padding: "12px 18px",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 14,
            zIndex: 2000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            maxWidth: "92vw",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.msg}</span>
          {toast.undo && (
            <button
              onClick={toast.undo}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", flexShrink: 0, minHeight: 34 }}
            >
              Undo
            </button>
          )}
        </div>
      )}

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
          canDelete={role === "owner"}
        />
      )}
    </div>
  );
}
