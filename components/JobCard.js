"use client";

import {
  getStage,
  getNextAction,
  getAlertMsg,
  daysInStage,
  isHydro,
  soilFlag,
} from "../lib/jobUtils";

function StatusDot({ color, size = 8 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export default function JobCard({ job, onSelect, onQuickAdvance }) {
  const sf = soilFlag(job);
  const stage = job.isDead
    ? { label: "Dead", color: "#999" }
    : getStage(job.checks, job.serviceType, sf);
  const next = job.isDead ? null : getNextAction(job.checks, job.serviceType, sf);
  const alert = getAlertMsg(job);
  const stageDays = daysInStage(job);
  const city = job.city || "";
  const isDone =
    (job.serviceType === "Hydroseeding" && job.checks?.followUp90) ||
    (job.serviceType !== "Hydroseeding" && job.checks?.followUp3);

  return (
    <div
      onClick={() => onSelect(job)}
      className="jc"
      style={{
        borderLeftColor: stage.color,
        opacity: job.isDead ? 0.5 : 1,
      }}
    >
      {/* Line 1: Name + Stage + Days */}
      <div className="jc-row1">
        <div className="jc-left1">
          <StatusDot color={stage.color} />
          <span className="jc-name">
            {job.customerName || "No Name"}
          </span>
        </div>
        <div className="jc-right1">
          <span className="jc-stage" style={{ color: stage.color }}>
            {stage.label}
          </span>
          {!job.isDead && stageDays !== null && !isDone && (
            <span
              className="jc-days"
              style={{
                color: stageDays > 7 ? "var(--warning)" : "var(--text-muted)",
              }}
            >
              {stageDays}d
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Meta + Next + Quick Advance */}
      <div className="jc-row2">
        <div className="jc-meta">
          {job.serviceType && <span>{job.serviceType}</span>}
          {city && <span className="jc-sep">{city}</span>}
          {job.assignedTo && (
            <span className="jc-sep" style={{ color: "var(--info)" }}>
              {job.assignedTo}
            </span>
          )}
          {job.scheduledDate && (
            <span style={{ color: "var(--grow-green)", fontWeight: 600 }}>
              {new Date(job.scheduledDate + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}
            </span>
          )}
          {job.requiresSitePrep && isHydro(job.serviceType) && (
            <span className="jc-tag-siteprep">+Prep</span>
          )}
        </div>
        {next && !job.isDead && (
          <div className="jc-next-row">
            <span className="jc-next-label">NEXT</span>
            <span className="jc-next-text">{next.label}</span>
            {onQuickAdvance && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAdvance(job, next.key);
                }}
                className="jc-advance"
              >
                ✓
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dead reason */}
      {job.isDead && job.deadReason && (
        <div className="jc-dead">{job.deadReason}</div>
      )}

      {/* Alert strip */}
      {alert && (
        <div className="jc-alert">
          <StatusDot color="var(--danger)" size={5} />
          {alert}
        </div>
      )}
    </div>
  );
}
