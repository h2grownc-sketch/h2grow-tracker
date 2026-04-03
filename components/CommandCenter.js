"use client";

import { useState, useMemo } from "react";
import JobRow from "./JobRow";
import {
  getStage,
  getAlertMsg,
  getUrgency,
  getNextAction,
  daysSince,
} from "../lib/jobUtils";

// Collapsible dashboard section
function Section({ title, count, color, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="cc-section" style={{ borderLeftColor: color }}>
      <button className="cc-section-header" onClick={() => setOpen(!open)}>
        <div className="cc-section-title">
          <span className="cc-section-icon">{icon}</span>
          <span>{title}</span>
          <span className="cc-section-count" style={{ background: color + "33", color }}>
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
  // === Derived data — all read-only from existing jobs array ===

  // Needs Attention: jobs with active alerts, sorted by urgency
  const needsAttention = useMemo(
    () =>
      activeJobs
        .filter((j) => getAlertMsg(j))
        .sort((a, b) => getUrgency(a) - getUrgency(b)),
    [activeJobs]
  );

  // Waiting On Soil: samples mailed but results not received
  const waitingSoil = useMemo(
    () =>
      activeJobs.filter(
        (j) => j.checks?.soilMailed && !j.checks?.resultsReceived
      ),
    [activeJobs]
  );

  // Waiting On Estimate Approval: quote sent but not approved
  const waitingEstimate = useMemo(
    () =>
      activeJobs.filter(
        (j) => j.checks?.quoteSent && !j.checks?.approved
      ),
    [activeJobs]
  );

  // Ready to Move: approved but not yet scheduled
  const readyToMove = useMemo(
    () =>
      activeJobs.filter(
        (j) => j.checks?.approved && !j.checks?.scheduled
      ),
    [activeJobs]
  );

  // This Week: jobs scheduled within current Mon-Sun
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
          !j.checks?.followUp90
      )
      .sort((a, b) => (a.scheduledDate > b.scheduledDate ? 1 : -1));
  }, [jobs]);

  // Recently Updated: newest jobs by dateCreated, top 5
  const recentlyUpdated = useMemo(
    () =>
      [...activeJobs]
        .sort((a, b) => {
          const da = new Date(b.dateCreated || 0).getTime();
          const db = new Date(a.dateCreated || 0).getTime();
          return da - db;
        })
        .slice(0, 5),
    [activeJobs]
  );

  // Follow-up overdue count (subset of needsAttention)
  const overdueCount = useMemo(
    () =>
      activeJobs.filter((j) => {
        const msg = getAlertMsg(j);
        return msg && (msg.includes("overdue") || msg.includes("not contacted") || msg.includes("stale"));
      }).length,
    [activeJobs]
  );

  return (
    <div>
      {/* KPI Strip */}
      <div className="cc-kpi-strip">
        <div className="cc-kpi" onClick={() => onSwitchTab("pipeline")}>
          <div className="cc-kpi-value" style={{ color: "var(--h2-blue)" }}>
            {activeJobs.length}
          </div>
          <div className="cc-kpi-label">Active</div>
        </div>
        <div className="cc-kpi">
          <div className="cc-kpi-value" style={{ color: "var(--grow-green)" }}>
            {scheduled.length}
          </div>
          <div className="cc-kpi-label">Scheduled</div>
        </div>
        <div className="cc-kpi">
          <div
            className="cc-kpi-value"
            style={{ color: overdueCount > 0 ? "var(--danger)" : "var(--text-muted)" }}
          >
            {overdueCount}
          </div>
          <div className="cc-kpi-label">Overdue</div>
        </div>
        <div className="cc-kpi">
          <div className="cc-kpi-value" style={{ color: "var(--warning)" }}>
            ${pipelineValue.toLocaleString()}
          </div>
          <div className="cc-kpi-label">Pipeline</div>
        </div>
      </div>

      {/* Needs Attention */}
      <Section
        title="NEEDS ATTENTION"
        count={needsAttention.length}
        color="var(--danger)"
        icon="🔴"
      >
        {needsAttention.map((j) => (
          <JobRow
            key={j.id}
            job={j}
            onSelect={onSelect}
            onQuickAdvance={onQuickAdvance}
          />
        ))}
      </Section>

      {/* Waiting On */}
      <Section
        title="WAITING ON"
        count={waitingSoil.length + waitingEstimate.length}
        color="var(--warning)"
        icon="🟡"
      >
        {waitingSoil.length > 0 && (
          <div className="cc-subsection-label">
            Soil Samples ({waitingSoil.length})
          </div>
        )}
        {waitingSoil.map((j) => (
          <JobRow
            key={j.id}
            job={j}
            onSelect={onSelect}
            onQuickAdvance={onQuickAdvance}
            showDaysWaiting
          />
        ))}
        {waitingEstimate.length > 0 && (
          <div className="cc-subsection-label" style={{ marginTop: waitingSoil.length > 0 ? 8 : 0 }}>
            Estimate Approval ({waitingEstimate.length})
          </div>
        )}
        {waitingEstimate.map((j) => (
          <JobRow
            key={j.id}
            job={j}
            onSelect={onSelect}
            onQuickAdvance={onQuickAdvance}
            showDaysWaiting
          />
        ))}
      </Section>

      {/* Ready to Move */}
      <Section
        title="READY TO MOVE"
        count={readyToMove.length}
        color="var(--success)"
        icon="🟢"
      >
        {readyToMove.map((j) => (
          <JobRow
            key={j.id}
            job={j}
            onSelect={onSelect}
            onQuickAdvance={onQuickAdvance}
          />
        ))}
      </Section>

      {/* This Week */}
      <Section
        title="THIS WEEK"
        count={thisWeek.length}
        color="var(--h2-blue)"
        icon="📅"
      >
        {thisWeek.map((j) => {
          const dayLabel = new Date(j.scheduledDate + "T00:00:00").toLocaleDateString(
            "en-US",
            { weekday: "short", month: "short", day: "numeric" }
          );
          return (
            <div key={j.id}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--h2-blue)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginTop: 4,
                  marginBottom: 2,
                  marginLeft: 4,
                  fontFamily: "var(--heading-font)",
                }}
              >
                {dayLabel}
                {!j.checks?.depositReceived && (
                  <span style={{ color: "var(--danger)", marginLeft: 8 }}>⚠ No deposit</span>
                )}
              </div>
              <JobRow job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
            </div>
          );
        })}
      </Section>

      {/* Recently Updated */}
      <Section
        title="RECENTLY ADDED"
        count={recentlyUpdated.length}
        color="var(--text-secondary)"
        icon="🕐"
        defaultOpen={false}
      >
        {recentlyUpdated.map((j) => (
          <JobRow key={j.id} job={j} onSelect={onSelect} onQuickAdvance={onQuickAdvance} />
        ))}
      </Section>

      {/* Quick Actions */}
      <div className="cc-quick-actions">
        <button className="cc-action-btn cc-action-primary" onClick={onNew}>
          + New Lead
        </button>
        <button
          className="cc-action-btn cc-action-secondary"
          onClick={() => onSwitchTab("pipeline")}
        >
          View Pipeline
        </button>
        <button
          className="cc-action-btn cc-action-secondary"
          onClick={() => onSwitchTab("schedule")}
        >
          View Schedule
        </button>
      </div>

      {/* Empty state */}
      {activeJobs.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🌱</div>
          <div
            style={{
              fontFamily: "var(--heading-font)",
              fontWeight: 500,
              fontSize: 18,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
            }}
          >
            No active jobs
          </div>
          <div style={{ fontSize: 14, marginTop: 4 }}>
            Tap{" "}
            <span
              style={{ color: "var(--accent)", fontWeight: 700, cursor: "pointer" }}
              onClick={onNew}
            >
              + NEW LEAD
            </span>{" "}
            to get started
          </div>
        </div>
      )}
    </div>
  );
}
