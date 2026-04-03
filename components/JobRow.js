"use client";

import { getStage, getNextAction, getAlertMsg, daysInStage, soilFlag } from "../lib/jobUtils";

export default function JobRow({ job, onSelect, onQuickAdvance, showDaysWaiting }) {
  const sf = soilFlag(job);
  const stage = job.isDead
    ? { label: "Dead", color: "#999" }
    : getStage(job.checks, job.serviceType, sf);
  const next = job.isDead ? null : getNextAction(job.checks, job.serviceType, sf);
  const alert = getAlertMsg(job);
  const waitDays = daysInStage(job);

  return (
    <div
      onClick={() => onSelect(job)}
      className="job-row"
      style={{ borderLeftColor: stage.color, opacity: job.isDead ? 0.5 : 1 }}
    >
      <div className="job-row-main">
        <div className="job-row-left">
          <span className="job-row-name">{job.customerName || "No Name"}</span>
          <span className="job-row-meta">
            {job.serviceType && <span>{job.serviceType}</span>}
            {(job.city || job.address) && (
              <span className="job-row-addr">{job.city || job.address}</span>
            )}
            {showDaysWaiting && waitDays !== null && (
              <span
                style={{
                  color: waitDays > 7 ? "var(--warning)" : "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {waitDays}d
              </span>
            )}
          </span>
        </div>
        <div className="job-row-right">
          {next && !job.isDead && onQuickAdvance && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdvance(job, next.key);
              }}
              className="job-row-advance"
            >
              ✓
            </button>
          )}
          <span
            className="job-row-stage"
            style={{ background: stage.color + "22", color: stage.color }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: stage.color,
                display: "inline-block",
              }}
            />
          </span>
        </div>
      </div>
      {next && !job.isDead && (
        <div className="job-row-next">
          <span style={{ color: "var(--warning)", fontWeight: 700, fontSize: 10 }}>NEXT</span>{" "}
          {next.label}
        </div>
      )}
      {alert && <div className="job-row-alert">{alert}</div>}
    </div>
  );
}
