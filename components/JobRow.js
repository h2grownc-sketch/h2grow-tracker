"use client";

import { getStage, getNextAction, getAlertMsg, daysInStage } from "../lib/jobUtils";

export default function JobRow({ job, onSelect, onQuickAdvance, showDaysWaiting }) {
  const stage = getStage(job.checks);
  const next = getNextAction(job.checks);
  const alert = getAlertMsg(job);
  const waitDays = daysInStage(job);
  const isDone = job.checks?.followUp90;

  return (
    <div
      onClick={() => onSelect(job)}
      className="job-row"
      style={{ borderLeftColor: stage.color }}
    >
      <div className="job-row-main">
        <div className="job-row-left">
          <span className="job-row-name">{job.customerName || "No Name"}</span>
          <span className="job-row-meta">
            {job.serviceType && <span>{job.serviceType}</span>}
            {job.address && <span className="job-row-addr">📍 {job.address}</span>}
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
          {next && !isDone && onQuickAdvance && (
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
            style={{
              background: stage.color + "22",
              color: stage.color,
            }}
          >
            {stage.icon}
          </span>
        </div>
      </div>
      {next && !isDone && (
        <div className="job-row-next">➡ {next.label}</div>
      )}
      {alert && (
        <div className="job-row-alert">⚠ {alert}</div>
      )}
    </div>
  );
}
