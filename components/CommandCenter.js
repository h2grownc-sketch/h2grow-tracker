"use client";

import { useState, useMemo } from "react";
import JobRow from "./JobRow";
import {
  getStage,
  getAlertMsg,
  getUrgency,
  getNextAction,
  isHydro,
  soilFlag,
} from "../lib/jobUtils";

function Section({ title, count, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="cc-section" style={{ borderLeftColor: color }}>
      <button className="cc-section-header" onClick={() => setOpen(!open)}>
        <div className="cc-section-title">
          <span className="cc-section-dot" style={{ background: color }} />
          <span>{title}</span>
          <span className="cc-section-count" style={{ background: color + "22", color }}>
            {count}
          </span>
        </div>
        <span className="cc-section-toggle">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="cc-section-body">{children}</div>}
    </div>
  );
}

export default function CommandCenter({
  jobs,
  activeJobs,
  alerts,
  scheduled,
  pipelineValue,
  onSelect,
  onQuickAdvance,
  onNew,
  onSwitchTab,
}) {
  // Your Action — grouped by action type
  const ACTION_GROUPS = [
    { label: "Consultation Needed", keys: new Set(["consultationNeeded", "consultationComplete"]) },
    { label: "Mail Soil Samples", keys: new Set(["soilCollected", "soilMailed"]) },
    { label: "Build / Send Quote", keys: new Set(["quoteSent", "sitePrepQuoteSent"]) },
    { label: "Approved — Needs Scheduling", keys: new Set(["depositReceived", "materialsOrdered", "scheduled"]) },
  ];

  const yourActionGroups = useMemo(() => {
    return ACTION_GROUPS.map((group) => {
      const jobs = activeJobs.filter((j) => {
        const next = getNextAction(j.checks, j.serviceType, soilFlag(j), j);
        return next && group.keys.has(next.key);
      });
      return { ...group, jobs };
    }).filter((g) => g.jobs.length > 0);
  }, [activeJobs]);

  const yourActionTotal = yourActionGroups.reduce((s, g) => s + g.jobs.length, 0);

  const needsAttention = useMemo(
    () =>
      activeJobs
        .filter((j) => getAlertMsg(j))
        .sort((a, b) => getUrgency(a) - getUrgency(b)),
    [activeJobs]
  );

  const waitingSoil = useMemo(
    () =>
      activeJobs.filter(
        (j) => j.checks?.soilMailed && !j.checks?.resultsReceived
      ),
    [activeJobs]
  );

  const waitingEstimate = useMemo(
    () =>
      activeJobs.filter(
        (j) => j.checks?.quoteSent && !j.checks?.approved
      ),
    [activeJobs]
  );

  const readyToMove = useMemo(
    () =>
      activeJobs.filter(
        (j) => j.checks?.approved && !j.checks?.scheduled
      ),
    [activeJobs]
  );

  const thisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monStr = monday.toISOString().split("T")[0];
    const sunStr = sunday.toISOString().split("T")[0];
    return jobs
      .filter(
        (j) =>
          j.scheduledDate &&
          j.scheduledDate >= monStr &&
          j.scheduledDate <= sunStr &&
          j.checks?.scheduled &&
          !j.isDead
      )
      .sort((a, b) => (a.scheduledDate > b.scheduledDate ? 1 : -1));
  }, [jobs]);

  const recentlyUpdated = useMemo(
    () =>
      [...activeJobs]
        .sort((a, b) => new Date(b.dateCreated || 0) - new Date(a.dateCreated || 0))
        .slice(0, 5),
    [activeJobs]
  );

  const overdueCount = useMemo(
    () =>
      activeJobs.filter((j) => {
        const msg = getAlertMsg(j);
        return msg && (msg.includes("overdue") || msg.includes("Not contacted") || msg.includes("stale"));
      }).length,
    [activeJobs]
  );

  return (
    <div>
      {/* KPI Strip */}
      <div className="cc-kpi-strip">
        <div className="cc-kpi" onClick={() => onSwitchTab("jobs")}>
          <div className="cc-kpi-value" style={{ color: "var(--info)" }}>{activeJobs.length}</div>
          <div className="cc-kpi-label">Active</div>
        </div>
        <div className="cc-kpi">
          <div className="cc-kpi-value" style={{ color: "var(--grow-green)" }}>{scheduled.length}</div>
          <div className="cc-kpi-label">Scheduled</div>
        </div>
        <div className="cc-kpi">
          <div className="cc-kpi-value" style={{ color: overdueCount > 0 ? "var(--danger)" : "var(--text-muted)" }}>{overdueCount}</div>
          <div className="cc-kpi-label">Overdue</div>
        </div>
        <div className="cc-kpi">
          <div className="cc-kpi-value" style={{ color: "var(--warning)" }}>${pipelineValue.toLocaleString()}</div>
          <div className="cc-kpi-label">Pipeline</div>
        </div>
      </div>

      <Section title="NEEDS ATTENTION" count={needsAttention.length} color="var(--danger)">
        {needsAttention.map((j) => (
          <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
        ))}
      </Section>

      <Section title="YOUR ACTION" count={yourActionTotal} color="var(--h2-blue)">
        {yourActionGroups.map((group, gi) => (
          <div key={group.label} style={{ marginTop: gi > 0 ? 10 : 0 }}>
            <div className="cc-subsection-label">{group.label} ({group.jobs.length})</div>
            {group.jobs.map((j) => (
              <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
            ))}
          </div>
        ))}
      </Section>

      <Section title="WAITING ON OTHERS" count={waitingSoil.length + waitingEstimate.length} color="var(--warning)">
        {waitingSoil.length > 0 && <div className="cc-subsection-label">Soil Samples ({waitingSoil.length})</div>}
        {waitingSoil.map((j) => (
          <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} showDaysWaiting />
        ))}
        {waitingEstimate.length > 0 && (
          <div className="cc-subsection-label" style={{ marginTop: waitingSoil.length > 0 ? 8 : 0 }}>
            Estimate Approval ({waitingEstimate.length})
          </div>
        )}
        {waitingEstimate.map((j) => (
          <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} showDaysWaiting />
        ))}
      </Section>

      <Section title="READY TO MOVE" count={readyToMove.length} color="var(--success)">
        {readyToMove.map((j) => (
          <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
        ))}
      </Section>

      <Section title="THIS WEEK" count={thisWeek.length} color="var(--h2-blue)">
        {thisWeek.map((j) => {
          const dayLabel = new Date(j.scheduledDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          return (
            <div key={j.id}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 4, marginBottom: 2, marginLeft: 4, fontFamily: "var(--heading-font)" }}>
                {dayLabel}
                {!j.checks?.depositReceived && <span style={{ color: "var(--danger)", marginLeft: 8 }}>No deposit</span>}
              </div>
              <JobRow job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
            </div>
          );
        })}
      </Section>

      <Section title="RECENTLY ADDED" count={recentlyUpdated.length} color="var(--text-secondary)" defaultOpen={false}>
        {recentlyUpdated.map((j) => (
          <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
        ))}
      </Section>

      {/* Quick Actions */}
      <div className="cc-quick-actions">
        <button className="cc-action-btn cc-action-primary" onClick={onNew}>+ New Lead</button>
        <button className="cc-action-btn cc-action-secondary" onClick={() => onSwitchTab("jobs")}>All Jobs</button>
        <button className="cc-action-btn cc-action-secondary" onClick={() => onSwitchTab("schedule")}>Schedule</button>
      </div>

      {activeJobs.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <img src="/logo.jpg" alt="H2 Grow" style={{ height: 48, borderRadius: 4, marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontFamily: "var(--heading-font)", fontWeight: 500, fontSize: 18, textTransform: "uppercase" }}>No active jobs</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            Tap <span style={{ color: "var(--accent)", fontWeight: 700, cursor: "pointer" }} onClick={onNew}>+ NEW LEAD</span> to get started
          </div>
        </div>
      )}
    </div>
  );
}
