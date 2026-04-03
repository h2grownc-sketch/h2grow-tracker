"use client";

import ProgressBar from "./ProgressBar";
import {
  getStage,
  getProgress,
  getNextAction,
  getAlertMsg,
  daysInStage,
} from "../lib/jobUtils";

export default function JobCard({ job, onSelect, onQuickAdvance }) {
  const stage = getStage(job.checks);
  const pct = getProgress(job.checks);
  const next = getNextAction(job.checks);
  const alert = getAlertMsg(job);
  const stageDays = daysInStage(job);
  const isDone = job.checks?.followUp90;

  return (
    <div
      onClick={() => onSelect(job)}
      style={{
        background: "var(--card-bg)",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 8,
        cursor: "pointer",
        borderLeft: `4px solid ${stage.color}`,
        transition: "all 0.2s",
      }}
    >
      {/* Row 1: Name + Stage badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: "var(--heading-font)",
            fontWeight: 600,
            fontSize: 17,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {job.customerName || "No Name"}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 3,
            background: stage.color + "22",
            color: stage.color,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            whiteSpace: "nowrap",
            marginLeft: 8,
          }}
        >
          {stage.icon} {stage.label}
        </span>
      </div>

      <ProgressBar pct={pct} color={stage.color} />

      {/* Row 2: Meta info */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 8,
          fontSize: 13,
          color: "var(--text-secondary)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {job.serviceType && <span>{job.serviceType}</span>}
        {job.address && <span>📍 {job.address}</span>}
        {job.scheduledDate && (
          <span style={{ color: stage.color, fontWeight: 600 }}>
            📅{" "}
            {new Date(job.scheduledDate + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" }
            )}
          </span>
        )}
        {stageDays !== null && !isDone && (
          <span
            style={{
              fontSize: 11,
              color: stageDays > 7 ? "var(--warning)" : "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {stageDays}d in stage
          </span>
        )}
      </div>

      {/* Row 3: Next action + Quick advance */}
      {next && !isDone && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--warning)",
              fontWeight: 600,
            }}
          >
            ➡ Next: {next.label}
          </div>
          {onQuickAdvance && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdvance(job, next.key);
              }}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--heading-font)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 28,
              }}
            >
              ✓ Done
            </button>
          )}
        </div>
      )}

      {/* Row 4: Alert */}
      {alert && (
        <div
          style={{
            marginTop: 6,
            padding: "5px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            background: "#E74C3C20",
            borderLeft: "3px solid var(--danger)",
            color: "var(--danger)",
          }}
        >
          ⚠ {alert}
        </div>
      )}
    </div>
  );
}
